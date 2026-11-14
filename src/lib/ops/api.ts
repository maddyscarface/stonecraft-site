import "server-only";
import { randomUUID } from "node:crypto";
import { documentStore } from "@/lib/server/storage";
import { clientIp, rateLimit } from "@/lib/server/guards";
import { isSandbox } from "./sandbox";
import { BRAND_ID } from "./brand";
import { listOpsAudit, opsAudit, verifyChain } from "./audit";
import { cookieHeader, createSession, destroySession, identify, isDisabled, opsEnabled, opsJson as j, requireOps, sessionCookieValue, setDisabled, staffDefs, type Actor, SESSION_COOKIE } from "./auth";
import { handlers } from "./handlers";
import { documentRequestSchema, opsUploadPolicy, projectCreateSchema, projectPatchSchema, suppressionSchema, validateUpload, type OpsDocument, type Project } from "./model";
import { listJobs, outboxStats, processDue, replay } from "./outbox";
import { hasPermission, matrix, roleLabel, roles, type Permission } from "./rbac";
import { buildReport, integrationHealth } from "./reports";
import { areas, arStatus, estimator, walkthroughs } from "./api-phase4";
import { searchRecords, toCsv, type RecordQuery } from "./records";
import { addSuppression, docsFor, getDoc, getProject, indexDoc, indexProject, listConsent, listProjects, listSuppressions, newReference, removeSuppression, saveDoc, saveProject } from "./store";
import { dmStatus } from "@/lib/datamoon/config";
import { getProvider } from "@/lib/datamoon/adapter";
import { confirmTopic, createFromTemplate, createRecipe, discoverTopics, recipeAction } from "@/lib/datamoon/service";
import { getContact, listEvents, listImports, listRecipes, listSavedTopics, listVendorContacts, saveContact } from "@/lib/datamoon/store";
import { importRows, parseCsv } from "@/lib/datamoon/importer";
import { fixtureRows, FIXTURE_LABEL } from "@/lib/datamoon/fixtures";
import { enqueue } from "./outbox";
import { maskEmail } from "./records";

/**
 * /api/admin/ops/* router. Every handler calls requireOps(permission) first (deny by default) and re-checks
 * brand ownership of the object it touches (cross-brand → 404). Mutations write the hash-chained audit log.
 */
const MAX_BODY = 64 * 1024, MAX_IMPORT = 2 * 1024 * 1024;
async function body(req: Request, max = MAX_BODY): Promise<Record<string, unknown> | Response> {
  const raw = await req.text();
  if (raw.length > max) return j({ ok: false, error: "Payload too large" }, 413);
  try { const v = raw ? JSON.parse(raw) : {}; return v && typeof v === "object" && !Array.isArray(v) ? v : j({ ok: false, error: "Invalid JSON" }, 400); } catch { return j({ ok: false, error: "Invalid JSON" }, 400); }
}
const gate = (req: Request, p: Permission) => requireOps(req, p);
const isResp = (x: unknown): x is Response => x instanceof Response;
const who = (a: Actor) => ({ id: a.id, role: a.role });
const UUID = /^[0-9a-f-]{36}$/i;

export async function dispatch(req: Request, path: string[]): Promise<Response> {
  const [a = "", b, c] = path;
  const m = req.method;
  try {
    switch (a) {
      case "session": return session(req);
      case "records": return records(req, b, c);
      case "projects": return projects(req, b, c);
      case "documents": return documents(req, b);
      case "walkthroughs": return walkthroughs(req, b, c);
      case "estimator": return estimator(req, b, c);
      case "areas": return areas(req, b);
      case "ar": return arStatus(req);
      case "crm": return crm(req);
      case "reports": { const g = await gate(req, "reports.read"); if (isResp(g)) return g; return j({ ok: true, report: await buildReport({ includeValues: g.role === "owner" }) }); }
      case "health": { const g = await gate(req, "health.read"); if (isResp(g)) return g; return j({ ok: true, health: await integrationHealth() }); }
      case "audit": { const g = await gate(req, "audit.read"); if (isResp(g)) return g; const entries = await listOpsAudit(300); return j({ ok: true, chain: verifyChain(entries), entries, consent: await listConsent(100) }); }
      case "staff": return staff(req);
      case "suppressions": return suppressions(req, b);
      case "datamoon": return datamoon(req, b, c);
      default: return j({ ok: false, error: `Not found (${m})` }, 404);
    }
  } catch (e) {
    console.error("[ops] handler error", a, (e as Error).message);
    return j({ ok: false, error: "Server error" }, 500);
  }
}

/* ── session ─────────────────────────────────────────────────────────────── */
async function session(req: Request) {
  if (!opsEnabled()) return j({ ok: false, error: "Admin is disabled on this deployment" }, 404);
  if (req.method === "GET") {
    const g = await gate(req, "records.read"); if (isResp(g)) return g;
    return j({ ok: true, actor: { id: g.id, name: g.name, role: g.role, roleLabel: roleLabel[g.role] }, permissions: matrix[g.role], brand: BRAND_ID, sandbox: isSandbox() });
  }
  const origin = req.headers.get("origin"), host = req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return j({ ok: false, error: "Cross-site request blocked" }, 403);
  if (req.method === "DELETE") {
    const sid = sessionCookieValue(req); if (sid) await destroySession(sid);
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` } });
  }
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);
  const ip = clientIp(req.headers);
  if (!(await rateLimit(`ops-login:${ip}`, 10, 900))) return j({ ok: false, error: "Too many attempts" }, 429);
  const bd = await body(req); if (isResp(bd)) return bd;
  const s = identify(String(bd.token ?? ""));
  if (!s || (await isDisabled(s.id))) return j({ ok: false, error: "Unauthorised" }, 401);
  if (!s.brands.includes(BRAND_ID)) return j({ ok: false, error: "No access to this brand" }, 403);
  const { sid, maxAge } = await createSession(s);
  await opsAudit({ id: s.id, role: s.role }, "staff.login", undefined, { ipPrefix: ip.split(".").slice(0, 2).join(".") });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Set-Cookie": cookieHeader(req, sid, maxAge) } });
}

/* ── records ─────────────────────────────────────────────────────────────── */
async function records(req: Request, type?: string, id?: string) {
  const u = new URL(req.url); const csv = u.searchParams.get("format") === "csv";
  const g = await gate(req, csv ? "records.export" : "records.read"); if (isResp(g)) return g;
  const pii = hasPermission(g.role, "records.read_pii");
  const q: RecordQuery = Object.fromEntries(["q", "type", "status", "source", "market", "county", "from", "to", "firstParty"].map((k) => [k, u.searchParams.get(k) || undefined])) as RecordQuery;
  if (type && id) {
    const { rows } = await searchRecords({ type, limit: 500 }, { pii });
    const row = rows.find((r) => r.id === id);
    if (!row) return j({ ok: false, error: "Not found" }, 404);
    const linked = (await listProjects()).filter((p) => p.links.some((l) => l.id === id)).map((p) => ({ id: p.id, reference: p.reference, title: p.title, status: p.status }));
    const deepLink = row.type === "walkthrough" ? `#walkthroughs:${row.id}` : row.type === "proposal" ? `#estimator:${row.id}` : null;
    await opsAudit(who(g), "record.viewed", { type: row.type, id: row.id }, { pii });
    return j({ ok: true, record: row, linkedProjects: linked, deepLink });
  }
  const res = await searchRecords({ ...q, limit: csv ? 500 : 200 }, { pii });
  if (csv) {
    await opsAudit(who(g), "records.exported_csv", undefined, { rows: res.rows.length, pii, filters: JSON.stringify(q).slice(0, 200) });
    return new Response(toCsv(res.rows, pii), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="stonecraft-records-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  }
  return j({ ok: true, ...res, pii });
}

/* ── projects ────────────────────────────────────────────────────────────── */
async function projects(req: Request, id?: string, sub?: string) {
  if (!id) {
    if (req.method === "GET") { const g = await gate(req, "projects.read"); if (isResp(g)) return g; return j({ ok: true, projects: await listProjects() }); }
    const g = await gate(req, "projects.write"); if (isResp(g)) return g;
    const bd = await body(req); if (isResp(bd)) return bd;
    const p = projectCreateSchema.safeParse(bd); if (!p.success) return j({ ok: false, error: "Invalid project", issues: p.error.issues.map((i) => i.message) }, 422);
    const now = new Date().toISOString();
    const pr: Project = { id: randomUUID(), brand: BRAND_ID, reference: newReference(), ...p.data, status: "intake", tasks: [], notes: [], createdAt: now, updatedAt: now, created: { source: "user-entered", by: g.id, at: now }, sandbox: isSandbox() };
    await saveProject(pr); await indexProject(pr.id);
    await opsAudit(who(g), "project.created", { type: "project", id: pr.id }, { type: pr.type, links: pr.links.length });
    return j({ ok: true, project: pr }, 201);
  }
  if (!UUID.test(id)) return j({ ok: false, error: "Not found" }, 404);
  if (sub === "documents") {
    if (req.method === "GET") {
      const g = await gate(req, "documents.read"); if (isResp(g)) return g;
      if (!(await getProject(id))) return j({ ok: false, error: "Not found" }, 404);
      return j({ ok: true, documents: (await docsFor(id)).filter((d) => d.status !== "deleted") });
    }
    const g = await gate(req, "documents.write"); if (isResp(g)) return g;
    const pr = await getProject(id); if (!pr) return j({ ok: false, error: "Not found" }, 404);
    const bd = await body(req); if (isResp(bd)) return bd;
    const p = documentRequestSchema.safeParse(bd); if (!p.success) return j({ ok: false, error: "Invalid document request" }, 422);
    const store = documentStore();
    const existing = (await docsFor(id)).filter((d) => d.status !== "deleted").length;
    const err = validateUpload(p.data, store.maxBytes, existing); if (err) return j({ ok: false, error: err }, 422);
    const docId = randomUUID(); const key = `ops/${BRAND_ID}/${id}/${docId}.${opsUploadPolicy.types[p.data.contentType]}`;
    const now = new Date().toISOString();
    const d: OpsDocument = { id: docId, brand: BRAND_ID, projectId: id, category: p.data.category, label: p.data.label, contentType: p.data.contentType, size: p.data.size, storageKey: key, status: "pending_upload", scan: "not_configured", provenance: { source: "user-entered", by: g.id, at: now }, createdAt: now };
    await saveDoc(d); await indexDoc(id, docId);
    const upload = await store.signUpload(key, d.contentType, d.size, opsUploadPolicy.ttlSec);
    await opsAudit(who(g), "document.upload_requested", { type: "document", id: docId }, { projectId: id, category: d.category, size: d.size });
    return j({ ok: true, document: d, upload, storage: store.durable ? "private bucket (direct signed upload)" : "sandbox tmp (not durable)" }, 201);
  }
  if (req.method === "GET") {
    const g = await gate(req, "projects.read"); if (isResp(g)) return g;
    const pr = await getProject(id); if (!pr) return j({ ok: false, error: "Not found" }, 404);
    return j({ ok: true, project: pr, documents: hasPermission(g.role, "documents.read") ? (await docsFor(id)).filter((d) => d.status !== "deleted") : null });
  }
  const g = await gate(req, "projects.write"); if (isResp(g)) return g;
  const pr = await getProject(id); if (!pr) return j({ ok: false, error: "Not found" }, 404);
  const bd = await body(req); if (isResp(bd)) return bd;
  const p = projectPatchSchema.safeParse(bd); if (!p.success) return j({ ok: false, error: "Invalid change" }, 422);
  const now = new Date().toISOString(); const v = p.data;
  if (v.action === "status") pr.status = v.status;
  else if (v.action === "assign") pr.assignee = v.assignee;
  else if (v.action === "due") pr.dueDate = v.dueDate;
  else if (v.action === "add_task") pr.tasks.push({ id: randomUUID(), title: v.title, due: v.due, assignee: v.assignee, done: false, createdAt: now, by: g.id });
  else if (v.action === "toggle_task") { const t = pr.tasks.find((x) => x.id === v.taskId); if (!t) return j({ ok: false, error: "Task not found" }, 404); t.done = !t.done; }
  else if (v.action === "note") pr.notes.unshift({ id: randomUUID(), at: now, by: g.id, text: v.text });
  else if (v.action === "link") { if (!pr.links.some((l) => l.id === v.id)) pr.links.push({ type: v.type, id: v.id }); }
  await saveProject(pr);
  await opsAudit(who(g), `project.${v.action}`, { type: "project", id }, v.action === "note" ? { length: v.text.length } : { ...v });
  return j({ ok: true, project: pr });
}

/* ── documents ───────────────────────────────────────────────────────────── */
async function documents(req: Request, id?: string) {
  if (!id || !UUID.test(id)) return j({ ok: false, error: "Not found" }, 404);
  const perm: Permission = req.method === "GET" ? "documents.read" : req.method === "DELETE" ? "documents.delete" : "documents.write";
  const g = await gate(req, perm); if (isResp(g)) return g;
  const d = await getDoc(id); if (!d || d.status === "deleted" || !(await getProject(d.projectId))) return j({ ok: false, error: "Not found" }, 404);
  const store = documentStore();
  if (req.method === "GET") {
    if (d.status === "pending_upload") return j({ ok: false, error: "Upload not confirmed yet" }, 409);
    if (d.scan === "infected") return j({ ok: false, error: "File quarantined" }, 423);
    const url = await store.signDownload(d.storageKey, 5 * 60, `${d.label.replace(/[^\w.\- ]/g, "_")}.${d.storageKey.split(".").pop()}`);
    await opsAudit(who(g), "document.download_link_issued", { type: "document", id }, { ttlSec: 300 });
    return j({ ok: true, url: url.url, expiresAt: url.expiresAt });
  }
  if (req.method === "DELETE") {
    await store.remove(d.storageKey).catch(() => undefined);
    d.status = "deleted"; d.deletedAt = new Date().toISOString(); await saveDoc(d);
    await opsAudit(who(g), "document.deleted", { type: "document", id }, { projectId: d.projectId });
    return j({ ok: true });
  }
  const bd = await body(req); if (isResp(bd)) return bd;
  const now = new Date().toISOString();
  if (bd.action === "confirm_upload") {
    if (!store.durable) { const obj = await store.get(d.storageKey); if (!obj) return j({ ok: false, error: "File not found in storage" }, 409); if (obj.body.byteLength !== d.size) return j({ ok: false, error: "Size mismatch" }, 409); }
    d.status = "uploaded";
  } else if (bd.action === "verify") { if (!hasPermission(g.role, "projects.write")) return j({ ok: false, error: "Your role cannot do this" }, 403); d.status = "verified"; d.verifiedBy = { source: "staff verified", by: g.id, at: now }; }
  else if (bd.action === "approve_delivery") { if (g.role !== "owner") return j({ ok: false, error: "Owner approval required" }, 403); if (d.category !== "deliverable") return j({ ok: false, error: "Only deliverables can be approved for delivery" }, 422); d.ownerApprovedForDelivery = { source: "staff verified", by: g.id, at: now }; }
  else return j({ ok: false, error: "Unknown action" }, 400);
  await saveDoc(d);
  await opsAudit(who(g), `document.${String(bd.action)}`, { type: "document", id }, { projectId: d.projectId });
  return j({ ok: true, document: d });
}

/* ── CRM sync / outbox ───────────────────────────────────────────────────── */
async function crm(req: Request) {
  if (req.method === "GET") { const g = await gate(req, "crm.read"); if (isResp(g)) return g; return j({ ok: true, stats: await outboxStats(), jobs: (await listJobs()).slice(0, 200) }); }
  const g = await gate(req, "crm.replay"); if (isResp(g)) return g;
  const bd = await body(req); if (isResp(bd)) return bd;
  if (bd.action === "run") { const r = await processDue(handlers); await opsAudit(who(g), "outbox.run", undefined, { processed: r.processed, done: r.done, failed: r.failed }); return j({ ok: true, processed: r.processed, done: r.done, failed: r.failed }); }
  if (bd.action === "replay" && typeof bd.id === "string") { const r = await replay(bd.id); if (!r) return j({ ok: false, error: "Not found or already done" }, 404); await opsAudit(who(g), "outbox.replay", { type: "job", id: r.id }); return j({ ok: true, job: r }); }
  return j({ ok: false, error: "Unknown action" }, 400);
}

/* ── staff ───────────────────────────────────────────────────────────────── */
async function staff(req: Request) {
  if (req.method === "GET") {
    const g = await gate(req, "staff.read"); if (isResp(g)) return g;
    const list = await Promise.all(staffDefs().map(async (s) => ({ id: s.id, name: s.name, role: s.role, roleLabel: roleLabel[s.role], brands: s.brands, source: s.envToken ? "legacy env token" : "OPS_STAFF_JSON", disabled: await isDisabled(s.id) })));
    return j({ ok: true, staff: list, roles: roles.map((r) => ({ role: r, label: roleLabel[r], permissions: matrix[r] })) });
  }
  const g = await gate(req, "staff.write"); if (isResp(g)) return g;
  const bd = await body(req); if (isResp(bd)) return bd;
  const id = String(bd.id ?? ""); if (!staffDefs().some((s) => s.id === id)) return j({ ok: false, error: "Not found" }, 404);
  if (id === g.id) return j({ ok: false, error: "You cannot disable yourself" }, 409);
  await setDisabled(id, bd.disabled === true);
  await opsAudit(who(g), bd.disabled ? "staff.disabled" : "staff.enabled", { type: "staff", id });
  return j({ ok: true });
}

/* ── suppressions ────────────────────────────────────────────────────────── */
async function suppressions(req: Request, key?: string) {
  if (req.method === "GET") { const g = await gate(req, "suppressions.read"); if (isResp(g)) return g; return j({ ok: true, suppressions: await listSuppressions() }); }
  const g = await gate(req, "suppressions.write"); if (isResp(g)) return g;
  if (req.method === "DELETE") { if (!key || !/^([0-9a-f]{64}|id_[0-9a-f]{16})$/.test(key)) return j({ ok: false, error: "Not found" }, 404); await removeSuppression(key); await opsAudit(who(g), "suppression.removed", { type: "suppression", id: key.slice(0, 12) }); return j({ ok: true }); }
  const bd = await body(req); if (isResp(bd)) return bd;
  const p = suppressionSchema.safeParse(bd); if (!p.success) return j({ ok: false, error: "email or DataMoon contact id required" }, 422);
  const added = await addSuppression({ ...p.data, by: g.id });
  for (const v of await listVendorContacts()) if ((p.data.contactId && v.contactId === p.data.contactId) || (p.data.email && v.email === p.data.email.toLowerCase())) { v.status = "suppressed"; await saveContact(v); }
  await opsAudit(who(g), "audience.suppression_applied", undefined, { reason: p.data.reason, kinds: added.map((a) => a.kind).join(",") });
  return j({ ok: true, added: added.length });
}

/* ── DataMoon ────────────────────────────────────────────────────────────── */
async function datamoon(req: Request, sub?: string, id?: string) {
  if (!sub) {
    const g = await gate(req, "datamoon.read"); if (isResp(g)) return g;
    const p = getProvider();
    const [feeds, credits] = await Promise.all([p.listAvailableFeeds().catch(() => []), p.getCreditStatus().catch(() => null)]);
    const contacts = await listVendorContacts();
    return j({ ok: true, status: dmStatus(), provider: p.mode, fixtureLabel: p.mode === "noop_fixtures" ? FIXTURE_LABEL : null, feeds, credits, recipes: await listRecipes(), savedTopics: await listSavedTopics(), imports: await listImports(), events: await listEvents(),
      contacts: { total: contacts.length, byStatus: contacts.reduce<Record<string, number>>((mm, c) => { mm[c.status] = (mm[c.status] ?? 0) + 1; return mm; }, {}), sample: contacts.slice(0, 50).map((c) => ({ id: c.id, contactId: c.contactId, state: c.state, market: c.market, status: c.status, synthetic: c.synthetic, recipeId: c.recipeId, email: maskEmail(c.email), importedAt: c.importedAt, expiresAt: c.expiresAt })) } });
  }
  if (sub === "topics") {
    if (req.method === "GET") { const g = await gate(req, "datamoon.read"); if (isResp(g)) return g; const u = new URL(req.url); const kind = u.searchParams.get("kind") === "b2b" ? "b2b" : "b2c"; return j({ ok: true, ...(await discoverTopics(kind, u.searchParams.get("q") || "")) }); }
    const g = await gate(req, "datamoon.recipe_write"); if (isResp(g)) return g;
    const bd = await body(req); if (isResp(bd)) return bd;
    if ((bd.kind !== "b2b" && bd.kind !== "b2c") || !bd.id || typeof bd.name !== "string") return j({ ok: false, error: "kind, id and name required" }, 422);
    return j({ ok: true, topic: await confirmTopic(g, { kind: bd.kind, id: bd.id as string, name: bd.name.slice(0, 160), synthetic: bd.synthetic === true }) });
  }
  if (sub === "templates") {
    if (req.method === "GET") { const g = await gate(req, "datamoon.read"); if (isResp(g)) return g; const { RECIPE_TEMPLATES } = await import("@/lib/datamoon/recipes"); return j({ ok: true, templates: RECIPE_TEMPLATES }); }
    const g = await gate(req, "datamoon.recipe_write"); if (isResp(g)) return g;
    const bd = await body(req); if (isResp(bd)) return bd;
    const r = await createFromTemplate(g, String(bd.key ?? ""));
    return r.ok ? j({ ok: true, recipe: r.data }, 201) : j({ ok: false, error: r.error, issues: r.issues }, r.status);
  }
  if (sub === "recipes") {
    if (!id) { const g = await gate(req, "datamoon.recipe_write"); if (isResp(g)) return g; const bd = await body(req); if (isResp(bd)) return bd; const r = await createRecipe(g, bd); return r.ok ? j({ ok: true, recipe: r.data }, 201) : j({ ok: false, error: r.error, issues: r.issues }, r.status); }
    if (!UUID.test(id)) return j({ ok: false, error: "Not found" }, 404);
    const bd0 = await body(req); if (isResp(bd0)) return bd0;
    const action = String(bd0.action ?? "");
    const perm: Permission = action === "run" ? "datamoon.approve_export" : action.startsWith("approve") || action === "revoke_approvals" ? "datamoon.approve_export" : "datamoon.recipe_write";
    const g = await gate(req, perm); if (isResp(g)) return g;
    const r = await recipeAction(g, id, action, (bd0.patch as Record<string, unknown>) ?? {});
    return r.ok ? j({ ok: true, result: r.data }) : j({ ok: false, error: r.error, issues: r.issues }, r.status);
  }
  if (sub === "imports") {
    const g = await gate(req, "datamoon.import"); if (isResp(g)) return g;
    const bd = await body(req, MAX_IMPORT); if (isResp(bd)) return bd;
    const recipeId = String(bd.recipeId ?? "");
    const recipe = (await listRecipes()).find((r) => r.id === recipeId);
    if (!recipe) return j({ ok: false, error: "Choose an existing recipe" }, 422);
    const useFixture = bd.source === "fixture";
    if (useFixture && !getProvider().mode.startsWith("noop")) return j({ ok: false, error: "Fixtures are disabled on this deployment" }, 409);
    const rows = useFixture ? fixtureRows(6) : parseCsv(String(bd.csv ?? ""));
    if (!rows.length) return j({ ok: false, error: "No rows" }, 422);
    const dryRun = bd.dryRun !== false;
    const s = await importRows(rows, { exportId: String(bd.exportId || `manual-${Date.now()}`).slice(0, 64), recipeId, by: g.id, dryRun, synthetic: useFixture, market: recipe.market });
    await opsAudit(who(g), dryRun ? "datamoon.import_dry_run" : "audience.export_imported", { type: "import", id: s.importId }, { accepted: s.accepted, rejected: s.rejected, duplicates: s.duplicates, suppressed: s.suppressed, synthetic: useFixture });
    return j({ ok: true, summary: s });
  }
  if (sub === "contacts") {
    if (req.method === "GET") { const g = await gate(req, "datamoon.read"); if (isResp(g)) return g; return j({ ok: true, contacts: (await listVendorContacts()).map((c) => ({ ...c, email: maskEmail(c.email), firstName: c.firstName?.slice(0, 1), lastName: c.lastName?.slice(0, 1) })) }); }
    const bd = await body(req); if (isResp(bd)) return bd;
    const ids = Array.isArray(bd.ids) ? (bd.ids as unknown[]).filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 100) : [];
    if (!ids.length) return j({ ok: false, error: "ids required (max 100 per bulk action)" }, 422);
    if (bd.action === "sync") {
      const g = await gate(req, "datamoon.sync_crm"); if (isResp(g)) return g;
      let queued = 0;
      for (const cid of ids) { const v = await getContact(cid); if (!v) continue; const r = await enqueue("datamoon.ghl_contact", v.id, `dm-ghl:${v.id}`, { source: "admin.bulk_sync" }); if (r.created) queued++; }
      await opsAudit(who(g), "datamoon.crm_sync_queued", undefined, { queued });
      return j({ ok: true, queued });
    }
    if (bd.action === "delete") {
      const g = await gate(req, "suppressions.write"); if (isResp(g)) return g;
      let deleted = 0;
      for (const cid of ids) { const v = await getContact(cid); if (!v) continue; await addSuppression({ contactId: v.contactId, email: v.email, reason: "privacy_request", by: g.id }); v.status = "deleted"; v.email = undefined; v.firstName = undefined; v.lastName = undefined; await saveContact(v); deleted++; }
      await opsAudit(who(g), "datamoon.contacts_deleted", undefined, { deleted });
      return j({ ok: true, deleted });
    }
    return j({ ok: false, error: "Unknown action" }, 400);
  }
  return j({ ok: false, error: "Not found" }, 404);
}
