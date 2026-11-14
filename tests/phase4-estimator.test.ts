import { beforeEach, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { __resetMemoryStore } from "@/lib/server/kv";
import { dispatch } from "@/lib/ops/api";
import { blankRateBook, regions, services, surfaces } from "@/lib/estimator/rates";
import { totals } from "@/lib/estimator/proposal";
import { proposalDocx, proposalPdf } from "@/lib/estimator/export";
import { hasPermission } from "@/lib/ops/rbac";

const OWNER = "owner-token-0123456789abcdef";
const EST = "estimator-token-0123456789";
const MGR = "manager-token-0123456789ab";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const call = (path: string, token: string, init: RequestInit = {}) => {
  const h = new Headers(init.headers); h.set("authorization", `Bearer ${token}`); h.set("host", "localhost:3000");
  return dispatch(new Request(`http://localhost:3000/api/admin/ops/${path}`, { ...init, headers: h }), path.split("?")[0]!.split("/").filter(Boolean));
};
const post = async (path: string, token: string, body: unknown) => { const r = await call(path, token, { method: "POST", body: JSON.stringify(body) }); return { status: r.status, j: await r.json() }; };

beforeEach(() => {
  __resetMemoryStore(); process.env.ADMIN_TOKEN = OWNER; process.env.PRIVATE_FILES_DIR = `/tmp/sc-est-test-${randomUUID()}`;
  process.env.OPS_STAFF_JSON = JSON.stringify([
    { id: "est1", name: "Estimator", role: "estimator", brands: ["stonecraft"], tokenSha256: sha(EST) },
    { id: "mgr1", name: "Manager", role: "manager", brands: ["stonecraft"], tokenSha256: sha(MGR) },
  ]);
});

describe("rate books", () => {
  it("ship blank for every service × region × surface", () => {
    for (const r of regions) { const b = blankRateBook(r); expect(b.entries.length).toBe(services.length * surfaces.length); expect(b.entries.every((e) => e.rate === null && e.minCharge === null)).toBe(true); }
  });
  it("only the owner can edit; stale versions are refused; Boston and FL books are separate", async () => {
    expect((await call("estimator/rates?region=boston", EST)).status).toBe(200);
    const upd = { region: "boston", expectedVersion: 0, entries: [{ service: "regrout", surface: "ceramic", rate: 11, minCharge: null }] };
    expect((await call("estimator/rates", EST, { method: "PUT", body: JSON.stringify(upd) })).status).toBe(403);
    expect((await call("estimator/rates", MGR, { method: "PUT", body: JSON.stringify(upd) })).status).toBe(403);
    expect((await call("estimator/rates", OWNER, { method: "PUT", body: JSON.stringify(upd) })).status).toBe(200);
    expect((await call("estimator/rates", OWNER, { method: "PUT", body: JSON.stringify(upd) })).status).toBe(409);
    const fl = await (await call("estimator/rates?region=south-florida", OWNER)).json();
    expect(fl.book.entries.every((e: { rate: number | null }) => e.rate === null)).toBe(true);
  });
});

describe("proposals: manual pricing, owner approval, private export, mark sent externally", () => {
  it("full lifecycle with stale-revision protection and no guessed totals", async () => {
    const c = await post("estimator/proposals", EST, { region: "boston", customerName: "Ana Test" });
    expect(c.status).toBe(201);
    let p = c.j.proposal; const id = p.id;
    expect(p.total).toBeNull();
    // edit: one line priced, one unpriced → no total, cannot submit
    let e = await post(`estimator/proposals/${id}`, EST, { action: "edit", expectedRevision: p.revision, lines: [{ description: "Regrout shower walls", service: "regrout", surface: "ceramic", quantity: 40, unit: "linear_ft", unitPrice: null }, { description: "Caulk", quantity: 12, unit: "linear_ft", unitPrice: 9 }] });
    expect(e.status).toBe(200); p = e.j.proposal;
    expect(p.total).toBeNull(); expect(p.unpricedLines).toBe(1);
    expect((await post(`estimator/proposals/${id}`, EST, { action: "submit", expectedRevision: p.revision })).status).toBe(422);
    // fill from owner rate book: nothing set → still nothing guessed
    e = await post(`estimator/proposals/${id}`, EST, { action: "fill_from_rate_book", expectedRevision: p.revision });
    expect(e.j.filled).toBe(0); expect(e.j.missing).toBe(1);
    await call("estimator/rates", OWNER, { method: "PUT", body: JSON.stringify({ region: "boston", expectedVersion: 0, entries: [{ service: "regrout", surface: "ceramic", rate: 11, minCharge: null }] }) });
    e = await post(`estimator/proposals/${id}`, EST, { action: "fill_from_rate_book", expectedRevision: p.revision });
    expect(e.j.filled).toBe(1); p = e.j.proposal;
    expect(p.total).toBe(40 * 11 + 12 * 9);
    // stale revision
    expect((await post(`estimator/proposals/${id}`, EST, { action: "submit", expectedRevision: p.revision - 1 })).status).toBe(409);
    expect((await post(`estimator/proposals/${id}`, EST, { action: "submit", expectedRevision: p.revision })).status).toBe(200);
    p = (await (await call(`estimator/proposals/${id}`, EST)).json()).proposal;
    // only the owner approves / exports / marks sent
    expect((await post(`estimator/proposals/${id}`, EST, { action: "approve", expectedRevision: p.revision })).status).toBe(403);
    expect((await post(`estimator/proposals/${id}`, MGR, { action: "approve", expectedRevision: p.revision })).status).toBe(403);
    expect((await post(`estimator/proposals/${id}`, OWNER, { action: "export", expectedRevision: p.revision, format: "pdf" })).status).toBe(409); // not approved yet
    expect((await post(`estimator/proposals/${id}`, OWNER, { action: "approve", expectedRevision: p.revision })).status).toBe(200);
    expect((await post(`estimator/proposals/${id}`, OWNER, { action: "mark_sent_externally", expectedRevision: p.revision, channel: "email" })).status).toBe(409); // export first
    expect((await post(`estimator/proposals/${id}`, EST, { action: "export", expectedRevision: p.revision, format: "docx" })).status).toBe(403);
    const x1 = await post(`estimator/proposals/${id}`, OWNER, { action: "export", expectedRevision: p.revision, format: "docx" });
    const x2 = await post(`estimator/proposals/${id}`, OWNER, { action: "export", expectedRevision: p.revision, format: "pdf" });
    expect(x1.status).toBe(200); expect(x2.status).toBe(200);
    expect(JSON.stringify(x2.j)).not.toContain("storageKey");
    // download links are owner-only, signed, short-lived
    expect((await call(`estimator/proposals/${id}?export=${p.revision}.pdf`, EST)).status).toBe(403);
    const dl = await (await call(`estimator/proposals/${id}?export=${p.revision}.pdf`, OWNER)).json();
    expect(dl.url).toMatch(/^\/api\/files\?/); expect(dl.url).toMatch(/sig=/);
    // an edit after approval clears approval (new revision must be re-approved)
    const ed = await post(`estimator/proposals/${id}`, EST, { action: "edit", expectedRevision: p.revision, scopeNotes: "Changed" });
    expect(ed.j.proposal.status).toBe("draft"); expect(ed.j.proposal.approval).toBeUndefined();
    expect((await post(`estimator/proposals/${id}`, OWNER, { action: "export", expectedRevision: ed.j.proposal.revision, format: "pdf" })).status).toBe(409);
    expect((await post(`estimator/proposals/${id}`, OWNER, { action: "approve", expectedRevision: ed.j.proposal.revision })).status).toBe(200);
    await post(`estimator/proposals/${id}`, OWNER, { action: "export", expectedRevision: ed.j.proposal.revision, format: "pdf" });
    const sent = await post(`estimator/proposals/${id}`, OWNER, { action: "mark_sent_externally", expectedRevision: ed.j.proposal.revision, channel: "email" });
    expect(sent.status).toBe(200); expect(sent.j.proposal.status).toBe("sent_externally");
    expect((await post(`estimator/proposals/${id}`, EST, { action: "edit", expectedRevision: sent.j.proposal.revision, scopeNotes: "x" })).status).toBe(409);
  });
  it("no role or code path can send a proposal", () => {
    for (const r of ["owner", "manager", "estimator", "operator", "marketer", "legal_reviewer", "read_only"] as const) expect(hasPermission(r, "estimator.send" as never)).toBe(false);
  });
  it("region must match the linked walkthrough's market", async () => {
    const w = await post("walkthroughs", OWNER, { workType: "stone", firstName: "Z", zip: "33301" });
    expect((await post("estimator/proposals", EST, { region: "boston", customerName: "Z", walkthroughId: w.j.walkthrough.id })).status).toBe(422);
    expect((await post("estimator/proposals", EST, { region: "south-florida", customerName: "Z", walkthroughId: w.j.walkthrough.id })).status).toBe(201);
  });
});

describe("DOCX / PDF export validity", () => {
  const p = { id: "x", brand: "stonecraft", reference: "Q-TEST01", region: "boston", customerName: "Ana (Test)", siteLabel: "Unit 4", status: "approved", revision: 3, lines: [{ id: "a", description: "Regrout <walls> & caulk", quantity: 10, unit: "linear_ft", unitPrice: 11, priceSource: "manual" }], scopeNotes: "Scope", exclusions: "None", validDays: 30, exports: [], history: [], createdAt: "", updatedAt: "", sandbox: true, approval: { by: "owner", at: "2026-11-14T00:00:00Z", revision: 3 } } as never;
  it("DOCX is a valid zip with escaped document.xml", () => {
    const b = Buffer.from(proposalDocx(p));
    expect(b.subarray(0, 4).toString("hex")).toBe("504b0304");
    const s = b.toString("latin1");
    for (const n of ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]) expect(s).toContain(n);
    expect(s).toContain("Regrout &lt;walls&gt; &amp; caulk");
    expect(s).toContain("Q-TEST01");
    expect(totals(p as never).total).toBe(110);
  });
  it("PDF has a header, xref and EOF and escapes parentheses", () => {
    const s = Buffer.from(proposalPdf(p)).toString("latin1");
    expect(s.startsWith("%PDF-1.")).toBe(true); expect(s).toContain("xref"); expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(s).toContain("Ana \\(Test\\)");
  });
  it("the ops route handler exports PUT (rate-book saves from the UI use PUT)", async () => {
    const m = await import("@/app/api/admin/ops/[[...path]]/route");
    for (const verb of ["GET", "POST", "PUT", "PATCH", "DELETE"] as const) expect(typeof (m as Record<string, unknown>)[verb]).toBe("function");
  });
});
