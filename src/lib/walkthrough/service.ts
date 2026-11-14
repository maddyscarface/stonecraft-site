import "server-only";
import { randomUUID } from "node:crypto";
import { walkthroughTemplates, stepDef, type WorkType } from "@/config/walkthrough-templates";
import { marketForZip } from "@/lib/leads/routing";
import { flCountyForZip } from "@/config/florida-areas";
import { privateStore } from "@/lib/server/storage";
import { enqueue } from "@/lib/ops/outbox";
import { opsAudit } from "@/lib/ops/audit";
import { normalise, type Measurement } from "./measure";
import { extFor, minimiseMetadata, sniffMime, typeMatches, validateMediaRequest } from "./media";
import { escalationsFor, gapsFor, suggestOutcome } from "./outcome";
import { createSchema, mediaSignSchema, stepSaveSchema, type Walkthrough } from "./model";
import { bindInvite, claimLead, getWalkthrough, indexWalkthrough, newToken, revokeInviteHash, saveWalkthrough, tokenHash } from "./store";

type R<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
const fail = (status: number, error: string): R<never> => ({ ok: false, status, error });
const editable = (w: Walkthrough) => w.status === "invited" || w.status === "in_progress" || w.status === "needs_correction";
const sandbox = () => process.env.VERCEL_ENV !== "production";
export const walkthroughEnabled = () => process.env.WALKTHROUGH_ENABLED !== "false";
// Self-start from the thank-you page is opt-in (owner decision); staff invite links work whenever the walkthrough is enabled.
export const selfStartEnabled = () => walkthroughEnabled() && process.env.WALKTHROUGH_SELF_START === "true";

/** Create a walkthrough + invite. Returns the raw token ONCE (shown to staff as a link; never stored). */
export async function createWalkthrough(input: unknown, by: string, channel: "staff_link" | "self_start" = "staff_link"): Promise<R<{ walkthrough: Walkthrough; token: string }>> {
  const p = createSchema.safeParse(input);
  if (!p.success) return fail(422, "Invalid walkthrough: " + p.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; "));
  const d = p.data;
  const market = d.market ?? (d.zip ? (marketForZip(d.zip)?.id as Walkthrough["market"] | undefined) : undefined);
  if (!market) return fail(422, "Market could not be determined — give a Boston or Southeast Florida ZIP, or choose the market.");
  const token = newToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + d.expiresDays * 86400_000).toISOString();
  const w: Walkthrough = {
    id: randomUUID(), brand: "stonecraft", reference: `W-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`, workType: d.workType as WorkType, market,
    county: market === "south-florida" && d.zip ? flCountyForZip(d.zip) ?? "unconfirmed" : null, zip: d.zip, status: "invited", units: d.units,
    customer: { firstName: d.firstName, email: d.email || undefined }, leadId: d.leadId, projectId: d.projectId,
    invite: { hash: tokenHash(token), expiresAt, revoked: false, createdAt: now.toISOString(), createdBy: by, channel },
    steps: {}, repeats: {}, measurements: [], media: [], corrections: [], escalations: [], internalNotes: [], revision: 1,
    createdAt: now.toISOString(), updatedAt: now.toISOString(), sandbox: sandbox(),
  };
  await saveWalkthrough(w); await indexWalkthrough(w.id); await bindInvite(token, w.id, expiresAt);
  return { ok: true, data: { walkthrough: w, token } };
}

/** Customer self-start from the lead thank-you step: one walkthrough per lead, lead must exist and be < 48 h old. */
export async function selfStart(leadId: string, workType: string): Promise<R<{ token: string; reference: string }>> {
  if (!selfStartEnabled()) return fail(404, "Not available");
  const { kv } = await import("@/lib/server/kv");
  const raw = await kv.get(`lead:data:${leadId}`);
  if (!raw) return fail(404, "We couldn't find that request. Please submit the assessment form first.");
  const rec = JSON.parse(raw) as { receivedAt: string; lead: { firstName: string; email?: string; zip: string } };
  if (Date.now() - Date.parse(rec.receivedAt) > 48 * 3600_000) return fail(410, "This link has expired. Reply to our email and we'll send a walkthrough link.");
  const c = await createWalkthrough({ workType, zip: rec.lead.zip, firstName: rec.lead.firstName, email: rec.lead.email, leadId, units: "imperial" }, "customer", "self_start");
  if (!c.ok) return c;
  if (!(await claimLead(leadId, c.data.walkthrough.id))) { await revokeInviteHash(c.data.walkthrough.invite.hash); c.data.walkthrough.invite.revoked = true; c.data.walkthrough.status = "closed"; await saveWalkthrough(c.data.walkthrough); return fail(409, "A walkthrough was already started for this request. Use the link on that device, or ask us to send a new one."); }
  return { ok: true, data: { token: c.data.token, reference: c.data.walkthrough.reference } };
}

export async function reissueInvite(id: string, by: string, days = 14): Promise<R<{ token: string; expiresAt: string }>> {
  const w = await getWalkthrough(id); if (!w) return fail(404, "Not found");
  if (w.status === "closed") return fail(409, "Walkthrough is closed");
  await revokeInviteHash(w.invite.hash);
  const token = newToken(); const expiresAt = new Date(Date.now() + days * 86400_000).toISOString();
  w.invite = { hash: tokenHash(token), expiresAt, revoked: false, createdAt: new Date().toISOString(), createdBy: by, channel: "staff_link" };
  w.revision++; await saveWalkthrough(w); await bindInvite(token, w.id, expiresAt);
  return { ok: true, data: { token, expiresAt } };
}
export async function revokeInvite(id: string): Promise<R<Walkthrough>> {
  const w = await getWalkthrough(id); if (!w) return fail(404, "Not found");
  await revokeInviteHash(w.invite.hash); w.invite.revoked = true; w.revision++; await saveWalkthrough(w);
  return { ok: true, data: w };
}

/** Save one step (answers + manual measurements). Every save of measurements appends a new version. */
export async function saveStep(w: Walkthrough, input: unknown, by: { source: "customer" | "staff"; id: string; reason?: string }): Promise<R<Walkthrough>> {
  if (by.source === "customer" && !editable(w)) return fail(409, "This walkthrough has been submitted. We'll be in touch if we need anything else.");
  const p = stepSaveSchema.safeParse(input); if (!p.success) return fail(422, "Invalid step data");
  const t = walkthroughTemplates[w.workType];
  const d = p.data;
  if (d.repeats) for (const [sid, n] of Object.entries(d.repeats)) { const s = t.steps.find((x) => x.id === sid); if (s?.repeat) w.repeats[sid] = Math.max(s.repeat.min, Math.min(s.repeat.max, n)); }
  const def = stepDef(t, d.stepKey); if (!def) return fail(422, "Unknown step");
  if (by.source === "customer" && w.status === "needs_correction" && !w.corrections.some((c) => !c.resolvedAt && c.stepKeys.includes(d.stepKey))) return fail(409, "Only the steps we asked about can be changed now.");
  const answers: Record<string, string | string[]> = {};
  for (const q of def.questions) {
    const a = d.answers[q.id]; if (a === undefined || a === "") continue;
    if (q.type === "text") { if (typeof a === "string") answers[q.id] = a.trim().slice(0, 500); continue; }
    const allowed = new Set((q.options ?? []).map((o) => o.id));
    if (q.type === "multi") { if (Array.isArray(a)) answers[q.id] = [...new Set(a.filter((x) => allowed.has(x)))]; continue; }
    if (typeof a === "string" && allowed.has(a)) answers[q.id] = a;
  }
  const values: Measurement[] = [];
  const units = d.units ?? w.units;
  for (const mi of d.measurements) {
    const f = def.measurements.find((x) => x.id === mi.fieldId && x.kind === mi.kind); if (!f) return fail(422, `Unknown measurement ${mi.fieldId}`);
    const n = normalise(mi, units); if (!n.ok) return fail(422, `${f.label}: ${n.error}`);
    values.push(n.m);
  }
  const now = new Date().toISOString();
  const prev = w.steps[d.stepKey];
  w.steps[d.stepKey] = { key: d.stepKey, answers, updatedAt: now, completedAt: d.complete ? now : prev?.completedAt };
  if (values.length) {
    w.measurements.push({ version: w.measurements.length + 1, at: now, by: by.id, source: by.source, reason: by.reason, stepKey: d.stepKey, values });
  }
  if (d.units) w.units = d.units;
  if (w.status === "invited") w.status = "in_progress";
  w.escalations = escalationsFor(w);
  w.revision++;
  await saveWalkthrough(w);
  return { ok: true, data: w };
}

export async function signMedia(w: Walkthrough, input: unknown): Promise<R<{ mediaId: string; upload: { url: string; method: string; headers: Record<string, string> } }>> {
  if (!editable(w)) return fail(409, "This walkthrough has been submitted.");
  const p = mediaSignSchema.safeParse(input); if (!p.success) return fail(422, "Invalid upload request");
  const t = walkthroughTemplates[w.workType];
  const def = stepDef(t, p.data.stepKey); if (!def) return fail(422, "Unknown step");
  if (p.data.kind === "video" && def.capture.video === "none") return fail(422, "This step takes photos only.");
  const live = w.media.filter((m) => m.status !== "deleted" && m.status !== "rejected");
  const inStep = live.filter((m) => m.stepKey === p.data.stepKey && m.kind === "photo").length;
  if (p.data.kind === "photo" && inStep >= Math.max(def.capture.photosMax, 1) + 2) return fail(422, "That's plenty of photos for this step.");
  const store = privateStore();
  const err = validateMediaRequest(p.data, store.maxBytes, { photos: live.filter((m) => m.kind === "photo").length, videos: live.filter((m) => m.kind === "video").length });
  if (err) return fail(p.data.size > store.maxBytes ? 413 : 415, err);
  const id = randomUUID();
  const storageKey = `walkthroughs/${w.id}/${id}.${extFor[p.data.contentType]}`;
  const signed = await store.signUpload(storageKey, p.data.contentType, p.data.size, 15 * 60);
  w.media.push({ id, stepKey: p.data.stepKey, kind: p.data.kind, contentType: p.data.contentType, size: p.data.size, storageKey, status: "pending_upload", createdAt: new Date().toISOString() });
  w.revision++; await saveWalkthrough(w);
  return { ok: true, data: { mediaId: id, upload: { url: signed.url, method: signed.method, headers: signed.headers } } };
}

/** Verify the uploaded object: exists, size, magic bytes; minimise image metadata (rewrites the object). */
export async function completeMedia(w: Walkthrough, mediaId: string): Promise<R<{ status: string }>> {
  const m = w.media.find((x) => x.id === mediaId); if (!m) return fail(404, "Not found");
  if (m.status === "uploaded") return { ok: true, data: { status: "uploaded" } }; // idempotent
  const store = privateStore();
  const obj = await store.get(m.storageKey);
  if (!obj) return fail(409, "Upload not received yet — please retry.");
  const sniffed = sniffMime(obj.body);
  if (!typeMatches(m.contentType, sniffed) || obj.body.byteLength !== m.size) {
    m.status = "rejected"; m.rejectReason = !typeMatches(m.contentType, sniffed) ? "content does not match type" : "size mismatch";
    await store.remove(m.storageKey); w.revision++; await saveWalkthrough(w);
    return fail(415, "That file couldn't be used. Please choose a photo or video from your camera.");
  }
  const meta = minimiseMetadata(m.contentType, obj.body);
  if (meta.metadata === "stripped") { await store.put(m.storageKey, meta.body, m.contentType); m.size = meta.body.byteLength; }
  m.metadata = meta.metadata; m.status = "uploaded"; m.uploadedAt = new Date().toISOString();
  w.revision++; await saveWalkthrough(w);
  return { ok: true, data: { status: "uploaded" } };
}

export async function deleteMedia(w: Walkthrough, mediaId: string): Promise<R<{ status: string }>> {
  if (!editable(w)) return fail(409, "This walkthrough has been submitted.");
  const m = w.media.find((x) => x.id === mediaId && x.status !== "deleted"); if (!m) return fail(404, "Not found");
  await privateStore().remove(m.storageKey).catch(() => undefined);
  m.status = "deleted"; w.revision++; await saveWalkthrough(w);
  return { ok: true, data: { status: "deleted" } };
}

export async function submit(w: Walkthrough): Promise<R<{ reference: string; gaps: number }>> {
  if (!editable(w)) return fail(409, "Already submitted.");
  if (!w.media.some((m) => m.status === "uploaded")) return fail(422, "Add at least one photo before sending.");
  if (w.media.some((m) => m.status === "pending_upload")) return fail(409, "Some uploads haven't finished. Wait for them or remove them, then send.");
  const now = new Date().toISOString();
  for (const c of w.corrections) if (!c.resolvedAt) c.resolvedAt = now;
  w.escalations = escalationsFor(w);
  w.suggestedOutcome = suggestOutcome(w).outcome;
  w.status = "submitted"; w.submittedAt = now; w.revision++;
  await saveWalkthrough(w);
  await enqueue("ghl.walkthrough", w.id, `wt-submit:${w.id}:${w.revision}`, { source: "walkthrough.submit" });
  await opsAudit({ id: "customer", role: "customer" }, "walkthrough.submitted", { type: "walkthrough", id: w.id }, { workType: w.workType, market: w.market, media: w.media.filter((m) => m.status === "uploaded").length, escalations: w.escalations.join(",") });
  return { ok: true, data: { reference: w.reference, gaps: gapsFor(w).length } };
}
