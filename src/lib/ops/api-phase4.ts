import "server-only";
import { randomUUID } from "node:crypto";
import { kv } from "@/lib/server/kv";
import { ZIP_OVERRIDE_KEY, zipOverrides } from "@/lib/leads/zip-overrides";
import { privateStore } from "@/lib/server/storage";
import { walkthroughTemplates } from "@/config/walkthrough-templates";
import { FL_AREA_CITIES, FL_COUNTIES, flCountyForZip } from "@/config/florida-areas";
import { marketForZip } from "@/lib/leads/routing";
import { arSummary } from "@/lib/ar/adapters";
import { display } from "@/lib/walkthrough/measure";
import { gapsFor, latestMeasurements, suggestOutcome } from "@/lib/walkthrough/outcome";
import { outcomes, type Walkthrough } from "@/lib/walkthrough/model";
import { createWalkthrough, reissueInvite, revokeInvite, saveStep } from "@/lib/walkthrough/service";
import { getWalkthrough, listWalkthroughs, saveWalkthrough, withWalkthroughLock } from "@/lib/walkthrough/store";
import { applyRateUpdate, rateUpdateSchema, regions, services, surfaces, type Region } from "@/lib/estimator/rates";
import { applyEdit, approve, canExport, fillFromRateBook, markSentExternally, proposalCreateSchema, proposalEditSchema, submitForApproval, totals, type Proposal } from "@/lib/estimator/proposal";
import { proposalDocx, proposalPdf } from "@/lib/estimator/export";
import { getProposal, getRateBook, indexProposal, listProposals, saveProposal, saveRateBook } from "@/lib/estimator/store";
import { opsAudit } from "./audit";
import { opsJson as j, requireOps, type Actor } from "./auth";
import { hasPermission, type Permission } from "./rbac";
import { isSandbox } from "./sandbox";

const MAX_BODY = 128 * 1024;
async function body(req: Request): Promise<Record<string, unknown> | Response> {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return j({ ok: false, error: "Payload too large" }, 413);
  try { const v = raw ? JSON.parse(raw) : {}; return v && typeof v === "object" && !Array.isArray(v) ? v : j({ ok: false, error: "Invalid JSON" }, 400); } catch { return j({ ok: false, error: "Invalid JSON" }, 400); }
}
const gate = (req: Request, p: Permission) => requireOps(req, p);
const isResp = (x: unknown): x is Response => x instanceof Response;
const who = (a: Actor) => ({ id: a.id, role: a.role });
const UUID = /^[0-9a-f-]{36}$/i;
const origin = (req: Request) => { const u = new URL(req.url); return `${req.headers.get("x-forwarded-proto") || u.protocol.replace(":", "")}://${req.headers.get("host") || u.host}`; };
const inviteLink = (req: Request, token: string) => `${origin(req)}/walkthrough#t=${token}`;

/* ── Walkthroughs (staff side) ───────────────────────────────────────────── */
function staffSummary(w: Walkthrough) {
  return { id: w.id, reference: w.reference, workType: w.workType, market: w.market, county: w.county, zip: w.zip, status: w.status, firstName: w.customer.firstName, createdAt: w.createdAt, submittedAt: w.submittedAt, escalations: w.escalations, suggestedOutcome: w.suggestedOutcome, outcome: w.outcome?.value, media: w.media.filter((m) => m.status === "uploaded").length, inviteExpiresAt: w.invite.expiresAt, inviteRevoked: w.invite.revoked, channel: w.invite.channel, sandbox: w.sandbox };
}
async function staffDetail(w: Walkthrough, g: Actor) {
  const t = walkthroughTemplates[w.workType];
  const latest = latestMeasurements(w);
  const canMedia = hasPermission(g.role, "walkthrough.media_read");
  const store = privateStore();
  const media = await Promise.all(w.media.filter((m) => m.status !== "deleted").map(async (m) => ({ ...m, storageKey: undefined, url: canMedia && m.status === "uploaded" ? (await store.signDownload(m.storageKey, 10 * 60)).url : null })));
  return {
    ...staffSummary(w), email: hasPermission(g.role, "records.read_pii") ? w.customer.email : undefined, leadId: w.leadId, projectId: w.projectId, units: w.units, repeats: w.repeats,
    steps: w.steps, corrections: w.corrections, internalNotes: w.internalNotes, revision: w.revision,
    measurements: Object.fromEntries(Object.entries(latest).map(([k, vals]) => [k, vals.map((m) => ({ ...m, display: display(m) }))])),
    measurementHistory: w.measurements.map((v) => ({ version: v.version, at: v.at, by: v.by, source: v.source, reason: v.reason, stepKey: v.stepKey, count: v.values.length })),
    media, gaps: gapsFor(w), suggestion: suggestOutcome(w), template: { id: t.id, title: t.title, steps: t.steps.map((s) => ({ id: s.id, title: s.title, repeat: s.repeat, measurements: s.measurements, questions: s.questions.map((q) => ({ id: q.id, label: q.label, options: q.options })) })) },
  };
}

export async function walkthroughs(req: Request, id?: string, sub?: string): Promise<Response> {
  if (!id) {
    if (req.method === "GET") { const g = await gate(req, "walkthrough.read"); if (isResp(g)) return g; return j({ ok: true, walkthroughs: (await listWalkthroughs()).map(staffSummary) }); }
    const g = await gate(req, "walkthrough.invite"); if (isResp(g)) return g;
    const bd = await body(req); if (isResp(bd)) return bd;
    const r = await createWalkthrough(bd, g.id, "staff_link"); if (!r.ok) return j({ ok: false, error: r.error }, r.status);
    await opsAudit(who(g), "walkthrough.invite_created", { type: "walkthrough", id: r.data.walkthrough.id }, { workType: r.data.walkthrough.workType, market: r.data.walkthrough.market, expiresAt: r.data.walkthrough.invite.expiresAt });
    return j({ ok: true, walkthrough: staffSummary(r.data.walkthrough), inviteLink: inviteLink(req, r.data.token), note: "Copy this link and send it yourself. It is shown once; the system never sends it." }, 201);
  }
  if (!UUID.test(id)) return j({ ok: false, error: "Not found" }, 404);
  if (req.method === "GET") {
    const g = await gate(req, "walkthrough.read"); if (isResp(g)) return g;
    const w = await getWalkthrough(id); if (!w) return j({ ok: false, error: "Not found" }, 404);
    await opsAudit(who(g), "walkthrough.viewed", { type: "walkthrough", id });
    return j({ ok: true, walkthrough: await staffDetail(w, g) });
  }
  const bd = await body(req); if (isResp(bd)) return bd;
  const action = String(bd.action ?? sub ?? "");
  const perm: Permission = action === "reissue_invite" || action === "revoke_invite" ? "walkthrough.invite" : "walkthrough.write";
  const g = await gate(req, perm); if (isResp(g)) return g;
  const res = await withWalkthroughLock(id, () => walkthroughAction(req, id, action, bd, g));
  return res === "busy" ? j({ ok: false, error: "Walkthrough is being saved. Try again." }, 409) : res;
}

async function walkthroughAction(req: Request, id: string, action: string, bd: Record<string, unknown>, g: Exclude<Awaited<ReturnType<typeof gate>>, Response>): Promise<Response> {
  const w = await getWalkthrough(id); if (!w) return j({ ok: false, error: "Not found" }, 404);
  if (typeof bd.expectedRevision === "number" && bd.expectedRevision !== w.revision) return j({ ok: false, error: `Walkthrough changed (now revision ${w.revision}). Reload.` }, 409);
  const now = new Date().toISOString();
  switch (action) {
    case "reissue_invite": { const r = await reissueInvite(id, g.id, Number(bd.days) || 14); if (!r.ok) return j({ ok: false, error: r.error }, r.status); await opsAudit(who(g), "walkthrough.invite_reissued", { type: "walkthrough", id }); return j({ ok: true, inviteLink: inviteLink(req, r.data.token), expiresAt: r.data.expiresAt }); }
    case "revoke_invite": { const r = await revokeInvite(id); if (!r.ok) return j({ ok: false, error: r.error }, r.status); await opsAudit(who(g), "walkthrough.invite_revoked", { type: "walkthrough", id }); return j({ ok: true }); }
    case "request_correction": {
      const keys = Array.isArray(bd.stepKeys) ? (bd.stepKeys as unknown[]).filter((k): k is string => typeof k === "string" && /^[a-z_]+(#\d{1,2})?$/.test(k)).slice(0, 12) : [];
      const note = String(bd.note ?? "").trim().slice(0, 500);
      if (!keys.length || note.length < 3) return j({ ok: false, error: "Choose the steps and write a short note for the customer" }, 422);
      if (!["submitted", "reviewed", "needs_correction"].includes(w.status)) return j({ ok: false, error: "Only submitted walkthroughs can be sent back for corrections" }, 409);
      w.corrections.push({ id: randomUUID(), at: now, by: g.id, stepKeys: keys, note }); w.status = "needs_correction"; w.revision++; await saveWalkthrough(w);
      await opsAudit(who(g), "walkthrough.correction_requested", { type: "walkthrough", id }, { steps: keys.join(",") });
      return j({ ok: true, note: "The customer sees this request the next time they open their link. Nothing was sent — let them know yourself." });
    }
    case "staff_measurement": {
      const reason = String(bd.reason ?? "").trim();
      if (reason.length < 3) return j({ ok: false, error: "Give a reason for the correction (kept in the version history)" }, 422);
      const r = await saveStep(w, { stepKey: bd.stepKey, answers: w.steps[String(bd.stepKey)]?.answers ?? {}, measurements: bd.measurements ?? [], units: bd.units }, { source: "staff", id: g.id, reason: reason.slice(0, 200) });
      if (!r.ok) return j({ ok: false, error: r.error }, r.status);
      await opsAudit(who(g), "walkthrough.measurement_corrected", { type: "walkthrough", id }, { stepKey: String(bd.stepKey) });
      return j({ ok: true, walkthrough: await staffDetail(r.data, g) });
    }
    case "set_outcome": {
      if (!(outcomes as readonly string[]).includes(String(bd.outcome))) return j({ ok: false, error: "Unknown outcome" }, 422);
      w.outcome = { value: bd.outcome as Walkthrough["outcome"] extends infer O ? O extends { value: infer V } ? V : never : never, by: g.id, at: now, note: typeof bd.note === "string" ? bd.note.slice(0, 500) : undefined };
      if (w.status === "submitted") w.status = "reviewed"; w.revision++; await saveWalkthrough(w);
      await opsAudit(who(g), "walkthrough.outcome_set", { type: "walkthrough", id }, { outcome: String(bd.outcome) });
      return j({ ok: true, walkthrough: await staffDetail(w, g) });
    }
    case "note": { const text = String(bd.text ?? "").trim().slice(0, 2000); if (!text) return j({ ok: false, error: "Empty note" }, 422); w.internalNotes.unshift({ at: now, by: g.id, text }); w.revision++; await saveWalkthrough(w); await opsAudit(who(g), "walkthrough.note", { type: "walkthrough", id }, { length: text.length }); return j({ ok: true }); }
    case "close": { w.status = "closed"; w.invite.revoked = true; w.revision++; await saveWalkthrough(w); const { revokeInviteHash } = await import("@/lib/walkthrough/store"); await revokeInviteHash(w.invite.hash); await opsAudit(who(g), "walkthrough.closed", { type: "walkthrough", id }); return j({ ok: true }); }
    default: return j({ ok: false, error: "Unknown action" }, 400);
  }
}

/* ── Private estimator ───────────────────────────────────────────────────── */
function proposalView(p: Proposal) { return { ...p, exports: p.exports.map(({ storageKey: _s, ...e }) => e), ...totals(p) }; }

export async function estimator(req: Request, sub?: string, id?: string): Promise<Response> {
  if (sub === "rates") {
    if (req.method === "GET") {
      const g = await gate(req, "estimator.rates_read"); if (isResp(g)) return g;
      const region = (new URL(req.url).searchParams.get("region") || "boston") as Region;
      if (!(regions as readonly string[]).includes(region)) return j({ ok: false, error: "Unknown region" }, 422);
      return j({ ok: true, book: await getRateBook(region), services, surfaces, note: "Owner-only rates. Ships blank; blank = not set (never guessed)." });
    }
    const g = await gate(req, "estimator.rates_write"); if (isResp(g)) return g;
    const bd = await body(req); if (isResp(bd)) return bd;
    const p = rateUpdateSchema.safeParse(bd); if (!p.success) return j({ ok: false, error: "Invalid rate update" }, 422);
    const cur = await getRateBook(p.data.region);
    const r = applyRateUpdate(cur, p.data, g.id); if (!r.ok) return j({ ok: false, error: r.error }, r.status);
    await saveRateBook(r.book);
    await opsAudit(who(g), "estimator.rates_updated", { type: "rate_book", id: p.data.region }, { version: r.book.version, entries: p.data.entries.length });
    return j({ ok: true, book: r.book });
  }
  if (sub !== "proposals") return j({ ok: false, error: "Not found" }, 404);
  if (!id) {
    if (req.method === "GET") { const g = await gate(req, "estimator.read"); if (isResp(g)) return g; return j({ ok: true, proposals: (await listProposals()).map((p) => ({ id: p.id, reference: p.reference, region: p.region, customerName: p.customerName, status: p.status, revision: p.revision, updatedAt: p.updatedAt, walkthroughId: p.walkthroughId, ...(g.role === "owner" || hasPermission(g.role, "estimator.write") ? totals(p) : {}) })) }); }
    const g = await gate(req, "estimator.write"); if (isResp(g)) return g;
    const bd = await body(req); if (isResp(bd)) return bd;
    const p = proposalCreateSchema.safeParse(bd); if (!p.success) return j({ ok: false, error: "Invalid proposal" }, 422);
    const now = new Date().toISOString();
    const pr: Proposal = { id: randomUUID(), brand: "stonecraft", reference: `Q-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`, ...p.data, status: "draft", revision: 1, lines: [], scopeNotes: "", exclusions: "Tile replacement, plumbing, fixtures and wall repairs unless listed above.", validDays: 30, exports: [], history: [{ by: g.id, at: now, revision: 1, action: "created" }], createdAt: now, updatedAt: now, sandbox: isSandbox() };
    if (pr.walkthroughId) {
      const w = await getWalkthrough(pr.walkthroughId); if (!w) return j({ ok: false, error: "Walkthrough not found" }, 422);
      if (w.market !== pr.region) return j({ ok: false, error: "Proposal region must match the walkthrough market (Boston and Southeast Florida are separate books)" }, 422);
    }
    await saveProposal(pr); await indexProposal(pr.id);
    await opsAudit(who(g), "estimator.proposal_created", { type: "proposal", id: pr.id }, { region: pr.region });
    return j({ ok: true, proposal: proposalView(pr) }, 201);
  }
  if (!UUID.test(id)) return j({ ok: false, error: "Not found" }, 404);
  if (req.method === "GET") {
    const g = await gate(req, "estimator.read"); if (isResp(g)) return g;
    const pr = await getProposal(id); if (!pr) return j({ ok: false, error: "Not found" }, 404);
    const u = new URL(req.url);
    const exp = u.searchParams.get("export");
    if (exp) {
      if (g.role !== "owner") return j({ ok: false, error: "Only the owner can download exports" }, 403);
      const e = pr.exports.find((x) => `${x.revision}.${x.format}` === exp); if (!e) return j({ ok: false, error: "Not found" }, 404);
      const url = await privateStore().signDownload(e.storageKey, 5 * 60, `StoneCraft-${pr.reference}-r${e.revision}.${e.format}`);
      await opsAudit(who(g), "estimator.export_download_link", { type: "proposal", id }, { revision: e.revision, format: e.format });
      return j({ ok: true, url: url.url, expiresAt: url.expiresAt });
    }
    return j({ ok: true, proposal: proposalView(pr) });
  }
  const bd = await body(req); if (isResp(bd)) return bd;
  const action = String(bd.action ?? "");
  const perm: Permission = action === "approve" ? "estimator.approve" : action === "export" ? "estimator.export" : action === "mark_sent_externally" ? "estimator.mark_sent" : "estimator.write";
  const g = await gate(req, perm); if (isResp(g)) return g;
  const pr = await getProposal(id); if (!pr) return j({ ok: false, error: "Not found" }, 404);
  const expected = Number(bd.expectedRevision);
  let res: { ok: true } | { ok: false; status: number; error: string };
  switch (action) {
    case "edit": { const e = proposalEditSchema.safeParse(bd); if (!e.success) return j({ ok: false, error: "Invalid edit: " + e.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ") }, 422); res = applyEdit(pr, e.data, g.id, () => randomUUID().slice(0, 8)); break; }
    case "fill_from_rate_book": {
      if (expected !== pr.revision) { res = { ok: false, status: 409, error: `This proposal changed (now revision ${pr.revision}). Reload before saving.` }; break; }
      const f = fillFromRateBook(pr, await getRateBook(pr.region));
      if (f.filled) { pr.revision++; pr.status = "draft"; pr.approval = undefined; pr.history.push({ by: g.id, at: new Date().toISOString(), revision: pr.revision, action: `filled ${f.filled} line(s) from owner rate book` }); }
      await saveProposal(pr); await opsAudit(who(g), "estimator.rate_book_fill", { type: "proposal", id }, f);
      return j({ ok: true, proposal: proposalView(pr), filled: f.filled, missing: f.missing, note: f.missing ? `${f.missing} line(s) have no owner rate for that service × surface — enter prices manually.` : undefined });
    }
    case "submit": res = submitForApproval(pr, expected, g.id); break;
    case "approve": res = approve(pr, expected, g); break;
    case "export": {
      res = canExport(pr, expected, g); if (!res.ok) break;
      const format = bd.format === "pdf" ? "pdf" : "docx";
      const bytes = format === "pdf" ? proposalPdf(pr) : proposalDocx(pr);
      const key = `proposals/${pr.id}/r${pr.revision}-${randomUUID().slice(0, 8)}.${format}`;
      await privateStore().put(key, bytes, format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      pr.exports.push({ by: g.id, at: new Date().toISOString(), revision: pr.revision, format, storageKey: key, size: bytes.byteLength });
      pr.status = "exported"; pr.history.push({ by: g.id, at: new Date().toISOString(), revision: pr.revision, action: `exported ${format.toUpperCase()} (private)` });
      break;
    }
    case "mark_sent_externally": res = markSentExternally(pr, expected, g, String(bd.channel ?? "other"), typeof bd.note === "string" ? bd.note : undefined); break;
    case "void": { if (expected !== pr.revision) { res = { ok: false, status: 409, error: "Stale revision" }; break; } pr.status = "void"; pr.revision++; pr.history.push({ by: g.id, at: new Date().toISOString(), revision: pr.revision, action: "voided" }); res = { ok: true }; break; }
    default: return j({ ok: false, error: "Unknown action" }, 400);
  }
  if (!res.ok) return j({ ok: false, error: res.error }, res.status);
  await saveProposal(pr);
  await opsAudit(who(g), `estimator.proposal_${action}`, { type: "proposal", id }, { revision: pr.revision, status: pr.status });
  return j({ ok: true, proposal: proposalView(pr) });
}

/* ── Service areas (FL config + ZIP overrides) ───────────────────────────── */
export async function areas(req: Request, sub?: string): Promise<Response> {
  if (req.method === "GET") {
    const g = await gate(req, "areas.read"); if (isResp(g)) return g;
    const u = new URL(req.url); const zip = (u.searchParams.get("zip") || "").slice(0, 5);
    const ov = await zipOverrides();
    return j({ ok: true, counties: FL_COUNTIES.map((c) => ({ id: c.id, slug: c.slug, name: c.name, zip3: c.zip3, zones: c.zoneIds })), cities: FL_AREA_CITIES.map((c) => ({ slug: c.slug, name: c.name, county: c.county, page: c.page, ownerConfirmed: c.ownerConfirmed, zips: c.zips, adminNote: c.adminNote })), overrides: ov,
      lookup: /^\d{5}$/.test(zip) ? { zip, market: marketForZip(zip)?.id ?? null, county: ov[zip] ? (ov[zip] === "none" ? null : ov[zip]) : flCountyForZip(zip), override: ov[zip] ?? null } : null,
      ownerDecision: "Exact FL cities are pending owner confirmation. Edit src/config/florida-areas.ts (one list) to change pages; use ZIP overrides here for routing fixes." });
  }
  const g = await gate(req, "areas.write"); if (isResp(g)) return g;
  const bd = await body(req); if (isResp(bd)) return bd;
  const zip = String(bd.zip ?? ""); const county = String(bd.county ?? "");
  if (!/^\d{5}$/.test(zip) || !["palm-beach", "broward", "none", "clear"].includes(county)) return j({ ok: false, error: "zip (5 digits) and county (palm-beach | broward | none | clear) required" }, 422);
  if (sub && sub !== "zip") return j({ ok: false, error: "Not found" }, 404);
  const ov = await zipOverrides();
  if (county === "clear") delete ov[zip]; else ov[zip] = county as "palm-beach" | "broward" | "none";
  await kv.set(ZIP_OVERRIDE_KEY, JSON.stringify(ov));
  await opsAudit(who(g), "areas.zip_override", { type: "zip", id: zip }, { county });
  return j({ ok: true, overrides: ov });
}

/* ── AR adapters (contracts, disabled) ───────────────────────────────────── */
export async function arStatus(req: Request): Promise<Response> {
  const g = await gate(req, "ar.read"); if (isResp(g)) return g;
  return j({ ok: true, providers: arSummary(), note: "Contracts only. All providers disabled; the manual guided walkthrough is the fallback. No AR accuracy is claimed." });
}
