import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { __resetMemoryStore, kv } from "@/lib/server/kv";
import { hasPermission, matrix, roles } from "@/lib/ops/rbac";
import { requireOps, identify, setDisabled } from "@/lib/ops/auth";
import { dispatch } from "@/lib/ops/api";
import { enqueue, getJob, processDue, replay, runJob, backoffMs } from "@/lib/ops/outbox";
import { validateUpload, opsUploadPolicy } from "@/lib/ops/model";
import { opsAudit, listOpsAudit, verifyChain } from "@/lib/ops/audit";
import { searchRecords, toCsv, maskEmail } from "@/lib/ops/records";
import { saveProject } from "@/lib/ops/store";

const OWNER = "owner-token-0123456789abcdef";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const staff = (o: Record<string, unknown>) => ({ id: "x", name: "X", role: "read_only", brands: ["stonecraft"], tokenSha256: sha("tok-x-0123456789abcd"), ...o });
const req = (path: string, init: RequestInit & { token?: string; origin?: string } = {}) => {
  const h = new Headers(init.headers); if (init.token) h.set("authorization", `Bearer ${init.token}`); h.set("host", "localhost:3000"); if (init.origin) h.set("origin", init.origin);
  return new Request(`http://localhost:3000/api/admin/ops/${path}`, { ...init, headers: h });
};
const call = (path: string, init: Parameters<typeof req>[1] = {}) => dispatch(req(path, init), path.split("?")[0].split("/").filter(Boolean));

beforeEach(() => {
  __resetMemoryStore(); delete process.env.VERCEL_ENV; delete process.env.OPS_STAFF_JSON; delete process.env.GHL_PRIVATE_TOKEN; delete process.env.DOCS_LOCAL_DIR;
  process.env.ADMIN_TOKEN = OWNER;
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("roles & permissions (deny by default)", () => {
  it("every role is least-privilege and unknown roles get nothing", () => {
    expect(hasPermission("owner", "staff.write")).toBe(true);
    expect(hasPermission("manager", "staff.write")).toBe(false);
    expect(hasPermission("manager", "datamoon.approve_export")).toBe(false);
    expect(hasPermission("marketer", "records.read_pii")).toBe(false);
    expect(hasPermission("read_only", "projects.write")).toBe(false);
    expect(hasPermission("legal_reviewer", "crm.replay")).toBe(false);
    expect(hasPermission("estimator", "datamoon.read")).toBe(false);
    expect(hasPermission("nobody" as never, "records.read")).toBe(false);
    expect(hasPermission(null, "records.read")).toBe(false);
    for (const r of roles) expect(matrix[r].length).toBeGreaterThan(0);
  });
});

describe("ops auth gate", () => {
  it("is locked (404) when no staff identity exists", async () => {
    delete process.env.ADMIN_TOKEN;
    const r = await requireOps(req("records", { token: OWNER }), "records.read");
    expect((r as Response).status).toBe(404);
  });
  it("401 for a wrong token, actor for the owner token", async () => {
    expect(((await requireOps(req("records", { token: "wrong-token-0123456789" }), "records.read")) as Response).status).toBe(401);
    const a = await requireOps(req("records", { token: OWNER }), "records.read");
    expect((a as { role: string }).role).toBe("owner");
  });
  it("denies a staff member granted only another brand (cross-brand role denial)", async () => {
    process.env.OPS_STAFF_JSON = JSON.stringify([staff({ id: "dc-ops", role: "manager", brands: ["deckcraft"] })]);
    const r = await requireOps(req("records", { token: "tok-x-0123456789abcd" }), "records.read");
    expect((r as Response).status).toBe(403);
  });
  it("denies an action outside the role", async () => {
    process.env.OPS_STAFF_JSON = JSON.stringify([staff({ id: "viewer", role: "read_only" })]);
    expect(identify("tok-x-0123456789abcd")?.role).toBe("read_only");
    const r = await call("projects", { method: "POST", token: "tok-x-0123456789abcd", body: JSON.stringify({ title: "Test project", type: "general" }) });
    expect(r.status).toBe(403);
  });
  it("revokes a disabled staff member", async () => {
    process.env.OPS_STAFF_JSON = JSON.stringify([staff({ id: "ama", role: "operator" })]);
    await setDisabled("ama", true);
    expect(((await requireOps(req("records", { token: "tok-x-0123456789abcd" }), "records.read")) as Response).status).toBe(401);
  });
  it("session login sets an HttpOnly SameSite=Strict cookie; cookie writes need same origin", async () => {
    const login = await dispatch(new Request("http://localhost:3000/api/admin/ops/session", { method: "POST", headers: { host: "localhost:3000", origin: "http://localhost:3000" }, body: JSON.stringify({ token: OWNER }) }), ["session"]);
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/); expect(cookie).toMatch(/SameSite=Strict/);
    const c = cookie.split(";")[0];
    const ok = await dispatch(new Request("http://localhost:3000/api/admin/ops/projects", { method: "POST", headers: { host: "localhost:3000", origin: "http://localhost:3000", cookie: c }, body: JSON.stringify({ title: "Same origin", type: "general" }) }), ["projects"]);
    expect(ok.status).toBe(201);
    const csrf = await dispatch(new Request("http://localhost:3000/api/admin/ops/projects", { method: "POST", headers: { host: "localhost:3000", origin: "https://evil.example", cookie: c }, body: JSON.stringify({ title: "Cross site", type: "general" }) }), ["projects"]);
    expect(csrf.status).toBe(403);
    const crossLogin = await dispatch(new Request("http://localhost:3000/api/admin/ops/session", { method: "POST", headers: { host: "localhost:3000", origin: "https://evil.example" }, body: JSON.stringify({ token: OWNER }) }), ["session"]);
    expect(crossLogin.status).toBe(403);
  });
  it("production writes fail closed without durable storage", async () => {
    process.env.VERCEL_ENV = "production";
    const r = await call("projects", { method: "POST", token: OWNER, body: JSON.stringify({ title: "Prod", type: "general" }) });
    expect(r.status).toBe(503);
  });
});

describe("tenant isolation", () => {
  it("cross-brand objects are not discoverable by id (404) and never listed", async () => {
    const id = randomUUID();
    await saveProject({ id, brand: "deckcraft", reference: "P-DECK01", title: "Other brand", type: "general", status: "active", market: "unknown", links: [], tasks: [], notes: [], createdAt: new Date().toISOString(), updatedAt: "", created: { source: "system", by: "x", at: "" }, sandbox: true });
    await kv.lpush("ops:projects", id);
    expect((await call(`projects/${id}`, { token: OWNER })).status).toBe(404);
    const list = await (await call("projects", { token: OWNER })).json();
    expect(list.projects.find((p: { id: string }) => p.id === id)).toBeUndefined();
  });
});

describe("projects, documents & upload validation", () => {
  it("validates upload type, size, count and label", () => {
    expect(validateUpload({ contentType: "application/x-msdownload", size: 10, label: "a" }, 1e9, 0)).toMatch(/type/);
    expect(validateUpload({ contentType: "application/pdf", size: 30 * 1024 * 1024, label: "deed" }, 1e9, 0)).toMatch(/large/);
    expect(validateUpload({ contentType: "application/pdf", size: 5 * 1024 * 1024, label: "deed" }, 4 * 1024 * 1024, 0)).toMatch(/large/);
    expect(validateUpload({ contentType: "application/pdf", size: 100, label: "deed" }, 1e9, opsUploadPolicy.maxPerProject)).toMatch(/Too many/);
    expect(validateUpload({ contentType: "application/pdf", size: 100, label: "bad<name>" }, 1e9, 0)).toMatch(/invalid/);
    expect(validateUpload({ contentType: "image/jpeg", size: 100, label: "Site photo" }, 1e9, 0)).toBeNull();
  });
  it("private document flow: signed upload, confirm, signed download, audited", async () => {
    process.env.PRIVATE_FILES_DIR = `/tmp/sc-ops-test-${randomUUID()}`;
    const p = await (await call("projects", { method: "POST", token: OWNER, body: JSON.stringify({ title: "Back Bay shower restoration", type: "shower", market: "boston" }) })).json();
    const bytes = new TextEncoder().encode("%PDF-1.4 test");
    const up = await (await call(`projects/${p.project.id}/documents`, { method: "POST", token: OWNER, body: JSON.stringify({ category: "building_rules", label: "Condo work rules", contentType: "application/pdf", size: bytes.byteLength }) })).json();
    expect(up.upload.url).toMatch(/^\/api\/files\?/);
    expect(decodeURIComponent(up.upload.url)).toContain("ops/stonecraft/");
    expect((await call(`documents/${up.document.id}`, { token: OWNER })).status).toBe(409); // not uploaded yet
    const { localStore } = await import("@/lib/server/storage/local");
    await localStore.put(up.document.storageKey, bytes, "application/pdf");
    expect((await call(`documents/${up.document.id}`, { method: "PATCH", token: OWNER, body: JSON.stringify({ action: "confirm_upload" }) })).status).toBe(200);
    const dl = await (await call(`documents/${up.document.id}`, { token: OWNER })).json();
    expect(dl.url).toMatch(/sig=/);
    const actions = (await listOpsAudit()).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(["project.created", "document.upload_requested", "document.confirm_upload", "document.download_link_issued"]));
    const bad = await call(`projects/${p.project.id}/documents`, { method: "POST", token: OWNER, body: JSON.stringify({ category: "other", label: "virus", contentType: "application/zip", size: 10 }) });
    expect(bad.status).toBe(422);
  });
});

describe("durable outbox", () => {
  it("enqueue is idempotent per key", async () => {
    const a = await enqueue("ghl.lead", "lead-1", "k1", { source: "t" });
    const b = await enqueue("ghl.lead", "lead-1", "k1", { source: "t" });
    expect(a.created).toBe(true); expect(b.created).toBe(false); expect(b.job.id).toBe(a.job.id);
  });
  it("retries with exponential backoff, dead-letters after max attempts, then replays", async () => {
    const { job } = await enqueue("ghl.lead", "lead-2", "k2", { source: "t", maxAttempts: 3 });
    let calls = 0; const fail = { "ghl.lead": async () => { calls++; return { status: "error" as const, detail: "GHL 503" }; } };
    let t = Date.now();
    let j = await runJob(job, fail, t); expect(j.status).toBe("pending"); expect(j.nextAttemptAt).toBe(t + backoffMs(1));
    expect((await processDue(fail, t)).processed).toBe(0); // not due yet
    t = j.nextAttemptAt; j = await runJob((await getJob(job.id))!, fail, t); expect(j.attempts).toBe(2);
    j = await runJob((await getJob(job.id))!, fail, j.nextAttemptAt); expect(j.status).toBe("dead");
    expect(calls).toBe(3);
    expect((await replay(job.id))!.status).toBe("pending");
    const ok = await processDue({ "ghl.lead": async () => ({ status: "ok" as const }) });
    expect(ok.done).toBe(1);
    expect((await getJob(job.id))!.status).toBe("done");
    expect(await replay(job.id)).toBeNull(); // done jobs cannot be replayed
  });
  it("parks jobs as blocked (no attempt burned) while the integration is not configured", async () => {
    const { job } = await enqueue("ghl.walkthrough", "w1", "k3", { source: "t" });
    const j = await runJob(job, { "ghl.walkthrough": async () => ({ status: "skipped" as const, detail: "GHL not configured" }) });
    expect(j.status).toBe("blocked"); expect(j.attempts).toBe(0);
  });
  it("a GHL outage never discards a submitted lead: lead stored + outbox job queued", async () => {
    vi.resetModules();
    process.env.GHL_PRIVATE_TOKEN = "pit-test"; process.env.GHL_LOCATION_ID_BOSTON = "loc-test";
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (u: string) => (String(u).includes("leadconnectorhq") ? new Response("down", { status: 503 }) : realFetch(u))));
    const { POST } = await import("@/app/api/leads/route");
    const { NextRequest } = await import("next/server");
    const eventId = `evt_${randomUUID().slice(0, 12)}`;
    const body = { variant: "residential", customerType: "homeowner", firstName: "Ana", lastName: "Test", email: "ana@example.com", phone: "(617) 555-0101", zip: "02139", contactConsent: true, eventId, startedAt: Date.now() - 60_000, surfaces: ["shower"], attribution: {} };
    const res = await POST(new NextRequest("http://localhost:3000/api/leads", { method: "POST", headers: { "content-type": "application/json", host: "localhost:3000", "x-forwarded-for": "203.0.113.7" }, body: JSON.stringify(body) }));
    const j = await res.json();
    expect(res.status, JSON.stringify(j)).toBe(200);
    expect(Object.keys(j).sort()).toEqual(["county", "market", "marketStatus", "ok", "tier"]); // public allowlist
    const kvm = await import("@/lib/server/kv");
    expect(await kvm.kv.get(`lead:data:${eventId}`)).toBeTruthy();
    const ob = await import("@/lib/ops/outbox");
    expect((await ob.listJobs()).some((x) => x.kind === "ghl.lead" && x.ref === eventId && x.status === "pending")).toBe(true);
    delete process.env.GHL_PRIVATE_TOKEN; delete process.env.GHL_LOCATION_ID_BOSTON; vi.resetModules();
  });
});

describe("records search, masking & CSV allowlist", () => {
  it("masks PII without records.read_pii and never searches PII for that role", async () => {
    await kv.set("lead:data:abc123", JSON.stringify({ leadId: "abc123", receivedAt: new Date().toISOString(), lead: { firstName: "Kwame", lastName: "Boateng", email: "kwame.b@example.com", variant: "residential", attribution: { utm_source: "google" } }, routing: { market: "south-florida", county: "broward", pipeline: "residential", zone: null }, score: { tier: "hot" } }));
    await kv.lpush("leads:index", "abc123");
    const masked = await searchRecords({}, { pii: false });
    expect(masked.rows[0].email).toBe("k***@example.com"); expect(masked.rows[0].name).toBe("K. B.");
    expect(masked.rows[0]).toMatchObject({ market: "south-florida", county: "broward" });
    expect((await searchRecords({ county: "broward" }, { pii: false })).total).toBe(1);
    expect((await searchRecords({ county: "palm-beach" }, { pii: false })).total).toBe(0);
    expect((await searchRecords({ q: "kwame" }, { pii: false })).total).toBe(0);
    expect((await searchRecords({ q: "kwame" }, { pii: true })).total).toBe(1);
    const csv = toCsv(masked.rows, false);
    expect(csv.split("\n")[0]).not.toMatch(/email|name/);
    expect(csv).not.toContain("kwame");
    expect(toCsv([{ ...masked.rows[0], status: "=HYPERLINK(1)" }], false)).toContain("'=HYPERLINK");
    expect(maskEmail("a@b.co")).toBe("a***@b.co");
  });
  it("CSV export requires records.export and is audited", async () => {
    process.env.OPS_STAFF_JSON = JSON.stringify([staff({ id: "mk", role: "marketer" })]);
    expect((await call("records?format=csv", { token: "tok-x-0123456789abcd" })).status).toBe(403);
    const r = await call("records?format=csv", { token: OWNER });
    expect(r.headers.get("content-type")).toMatch(/text\/csv/);
    expect((await listOpsAudit()).some((e) => e.action === "records.exported_csv")).toBe(true);
  });
});

describe("audit log", () => {
  it("hash chain verifies and detects tampering; secrets are scrubbed", async () => {
    await opsAudit({ id: "owner", role: "owner" }, "a", undefined, { token: "secret-value", count: 1 });
    await opsAudit({ id: "owner", role: "owner" }, "b");
    const entries = await listOpsAudit();
    expect(verifyChain(entries).ok).toBe(true);
    expect(JSON.stringify(entries)).not.toContain("secret-value");
    const tampered = entries.map((e, i) => (i === 1 ? { ...e, action: "x" } : e));
    expect(verifyChain(tampered).ok).toBe(false);
  });
});

describe("public surfaces never leak ops data", () => {
  it("/api/health exposes flags only — no tokens, keys or record data", async () => {
    process.env.DATAMOON_INTENT_KEY = "dm-secret-key-should-not-leak";
    const { GET } = await import("@/app/api/health/route");
    const body = JSON.stringify(await (await GET()).json());
    expect(body).not.toContain("dm-secret-key"); expect(body).not.toContain(OWNER);
    expect(body).toContain("datamoon");
    delete process.env.DATAMOON_INTENT_KEY;
  });
});
