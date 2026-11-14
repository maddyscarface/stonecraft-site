/**
 * StoneCraft ops admin smoke (local/staging sandbox only — never against a deployment wired to live GHL/DataMoon).
 * API: role/brand denial, CSRF, project + private document, walkthrough invite, private estimator (blank rates,
 *      owner approval, private export, no send), FL ZIP overrides, DataMoon synthetic template → approve → run → import,
 *      prohibited targeting refused, CSV export allowlist, reports, outbox run, audit chain, AR disabled.
 * UI:  login, every tab renders without page errors, no horizontal overflow at 375/390/768/1440; screenshots.
 * Usage: OWNER=… MARKETER=… READONLY=… ESTIMATOR=… OTHERBRAND=… node tests/e2e-phase4/admin-smoke.mjs <base> [shotDir]
 * (the server needs OPS_STAFF_JSON with those staff; see docs/26-phase4.md)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = (process.argv[2] || "http://localhost:47211").replace(/\/$/, "");
const shots = process.argv[3]; if (shots) mkdirSync(shots, { recursive: true });
const T = { owner: process.env.OWNER, marketer: process.env.MARKETER, ro: process.env.READONLY, est: process.env.ESTIMATOR, other: process.env.OTHERBRAND };
let fails = 0, passes = 0;
const ok = (n, c, x = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${n}${x ? "  " + String(x).slice(0, 200) : ""}`); c ? passes++ : fails++; };
const api = async (path, { tok, method = "GET", body, headers = {} } = {}) => {
  const r = await fetch(`${base}/api/admin/ops${path}`, { method, headers: { "content-type": "application/json", ...(tok ? { authorization: `Bearer ${tok}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 300) }; } return { s: r.status, j, h: r.headers };
};

// ── authz ──
ok("no token → 401", (await api("/records")).s === 401);
ok("bad token → 401", (await api("/records", { tok: "x".repeat(32) })).s === 401);
ok("other-brand staff → 403", (await api("/records", { tok: T.other })).s === 403);
ok("read-only cannot create project → 403", (await api("/projects", { tok: T.ro, method: "POST", body: { title: "Denied", type: "shower", market: "boston" } })).s === 403);
ok("marketer cannot read staff → 403", (await api("/staff", { tok: T.marketer })).s === 403);
ok("marketer cannot open the estimator → 403", (await api("/estimator/rates?region=boston", { tok: T.marketer })).s === 403);
const mrec = await api("/records", { tok: T.marketer });
ok("marketer records are PII-masked", mrec.s === 200 && mrec.j.pii === false);
const cs = await fetch(`${base}/api/admin/ops/session`, { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: JSON.stringify({ token: T.owner }) });
ok("cross-site login blocked → 403", cs.status === 403);

// ── first-party lead (FL) shows in records with county ──
const lead = await fetch(`${base}/api/leads`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.7" }, body: JSON.stringify({ variant: "residential", firstName: "Smoke", email: `smoke+${Date.now()}@example.com`, phone: "5615550123", zip: "33432", contactConsent: true, eventId: `lead_smoke_${Date.now()}`, attribution: {} }) });
const lj = await lead.json();
ok("FL lead accepted → Palm Beach County", lead.status === 200 && lj.county === "palm-beach", JSON.stringify(lj));
const fr = await api("/records?market=south-florida&county=palm-beach", { tok: T.owner });
ok("records filter by market + county", fr.s === 200 && fr.j.rows?.some((r) => r.county === "palm-beach"), `${fr.j.rows?.length} rows`);

// ── projects + private documents ──
const pr = await api("/projects", { tok: T.owner, method: "POST", body: { title: "Smoke project — Boca condo shower", type: "shower", market: "south-florida" } });
ok("project created", pr.s === 201, pr.j.project?.reference);
const pid = pr.j.project?.id;
const bytes = Buffer.from("%PDF-1.4\n% smoke test\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
ok("disallowed upload type refused", (await api(`/projects/${pid}/documents`, { tok: T.owner, method: "POST", body: { category: "other", label: "Script", contentType: "application/x-msdownload", size: 100 } })).s === 422);
ok("oversize upload refused", (await api(`/projects/${pid}/documents`, { tok: T.owner, method: "POST", body: { category: "other", label: "Huge", contentType: "application/pdf", size: 900 * 1024 * 1024 } })).s === 422);
const dr = await api(`/projects/${pid}/documents`, { tok: T.owner, method: "POST", body: { category: "building_rules", label: "Condo work rules", contentType: "application/pdf", size: bytes.length } });
ok("upload URL signed", dr.s === 201 && !!dr.j.upload?.url, dr.j.error);
const up = await fetch(new URL(dr.j.upload.url, base), { method: dr.j.upload.method || "PUT", headers: dr.j.upload.headers || { "content-type": "application/pdf" }, body: bytes });
ok("file PUT to signed URL", up.ok, String(up.status));
const did = dr.j.document.id;
ok("upload confirmed", (await api(`/documents/${did}`, { tok: T.owner, method: "PATCH", body: { action: "confirm_upload" } })).s === 200);
const dl = await api(`/documents/${did}`, { tok: T.owner });
ok("download link is signed + short-lived", dl.s === 200 && /sig|exp/i.test(dl.j.url || ""));
const tampered = await fetch(new URL(dl.j.url.replace(/(sig=)[0-9a-f]{4}/i, "$1dead"), base));
ok("tampered signature refused", tampered.status === 403 || tampered.status === 401, String(tampered.status));
ok("marketer cannot read documents", (await api(`/documents/${did}`, { tok: T.marketer })).s === 403);

// ── walkthrough + estimator ──
const wt = await api("/walkthroughs", { tok: T.owner, method: "POST", body: { workType: "stone", firstName: "Smoke", zip: "33480", projectId: pid } });
ok("walkthrough invite created (link shown once, not sent)", wt.s === 201 && /#t=/.test(wt.j.inviteLink) && /never sends/.test(wt.j.note), wt.j.error);
ok("marketer cannot create walkthroughs", (await api("/walkthroughs", { tok: T.marketer, method: "POST", body: { workType: "floor", firstName: "X" } })).s === 403);
const rates = await api("/estimator/rates?region=south-florida", { tok: T.est });
ok("rate book ships blank", rates.s === 200 && JSON.stringify(rates.j).match(/"rate":\s*(null|"")/) && !/"rate":\s*[0-9]/.test(JSON.stringify(rates.j)));
ok("estimator cannot edit rates", (await api("/estimator/rates", { tok: T.est, method: "PUT", body: { region: "south-florida", expectedVersion: 0, entries: [] } })).s === 403);
const pc = await api("/estimator/proposals", { tok: T.est, method: "POST", body: { region: "south-florida", customerName: "Smoke Test", walkthroughId: wt.j.walkthrough.id } });
ok("estimator drafts a proposal linked to the walkthrough", pc.s === 201, pc.j.error);
ok("region must match the walkthrough", (await api("/estimator/proposals", { tok: T.est, method: "POST", body: { region: "boston", customerName: "X", walkthroughId: wt.j.walkthrough.id } })).s === 422);
let prop = pc.j.proposal;
const ed = await api(`/estimator/proposals/${prop.id}`, { tok: T.est, method: "POST", body: { action: "edit", expectedRevision: prop.revision, lines: [{ description: "Hone & polish marble vanity top", service: "stone_hone_polish", surface: "marble", quantity: 12, unit: "sqft", unitPrice: null }] } });
ok("unpriced line: total stays blank", ed.s === 200 && ed.j.proposal.total === null && ed.j.proposal.unpricedLines === 1, JSON.stringify({ t: ed.j.proposal?.total, e: ed.j.error }));
prop = ed.j.proposal;
ok("submit blocked until every line is priced", (await api(`/estimator/proposals/${prop.id}`, { tok: T.est, method: "POST", body: { action: "submit", expectedRevision: prop.revision } })).s === 422);
ok("stale revision refused", (await api(`/estimator/proposals/${prop.id}`, { tok: T.est, method: "POST", body: { action: "edit", expectedRevision: prop.revision - 1, scopeNotes: "x" } })).s === 409);
ok("estimator cannot approve", (await api(`/estimator/proposals/${prop.id}`, { tok: T.est, method: "POST", body: { action: "approve", expectedRevision: prop.revision } })).s === 403);
const own = await api("/estimator/rates", { tok: T.owner, method: "PUT", body: { region: "south-florida", expectedVersion: rates.j.book?.version ?? 0, entries: [{ service: "stone_hone_polish", surface: "marble", rate: 1, minCharge: null }] } });
ok("owner saves a (test) rate over HTTP PUT", own.s === 200, own.j.error ?? String(own.s));
const fill = await api(`/estimator/proposals/${prop.id}`, { tok: T.est, method: "POST", body: { action: "fill_from_rate_book", expectedRevision: prop.revision } });
ok("fill from owner rate book → total computed", fill.s === 200 && fill.j.proposal.total === 12 && fill.j.proposal.unpricedLines === 0, JSON.stringify({ t: fill.j.proposal?.total, e: fill.j.error }));
prop = fill.j.proposal;
const sub = await api(`/estimator/proposals/${prop.id}`, { tok: T.est, method: "POST", body: { action: "submit", expectedRevision: prop.revision } }); prop = sub.j.proposal ?? prop;
const appr = await api(`/estimator/proposals/${prop.id}`, { tok: T.owner, method: "POST", body: { action: "approve", expectedRevision: prop.revision } }); prop = appr.j.proposal ?? prop;
ok("owner approves", appr.s === 200, appr.j.error);
const ex = await api(`/estimator/proposals/${prop.id}`, { tok: T.owner, method: "POST", body: { action: "export", expectedRevision: prop.revision, format: "pdf" } });
const exd = await api(`/estimator/proposals/${prop.id}`, { tok: T.owner, method: "POST", body: { action: "export", expectedRevision: prop.revision, format: "docx" } });
ok("owner exports private PDF + DOCX", ex.s === 200 && exd.s === 200, ex.j.error ?? exd.j.error);
const pdl = await api(`/estimator/proposals/${prop.id}?export=${prop.revision}.pdf`, { tok: T.owner });
const pdf = await fetch(new URL(pdl.j.url, base));
ok("signed PDF download works", pdf.ok && (await pdf.arrayBuffer()).byteLength > 500 && /pdf/.test(pdf.headers.get("content-type") ?? ""), pdf.headers.get("content-type"));
ok("estimator cannot download exports", (await api(`/estimator/proposals/${prop.id}?export=${prop.revision}.pdf`, { tok: T.est })).s === 403);
await api("/estimator/rates", { tok: T.owner, method: "PUT", body: { region: "south-florida", expectedVersion: (rates.j.book?.version ?? 0) + 1, entries: [{ service: "stone_hone_polish", surface: "marble", rate: null, minCharge: null }] } }); // blank again
ok("no send action exists", (await api(`/estimator/proposals/${prop.id}`, { tok: T.owner, method: "POST", body: { action: "send", expectedRevision: prop.revision } })).s >= 400);

// ── service areas (ZIP overrides) ──
const lk = await api("/areas?zip=33480", { tok: T.owner });
ok("ZIP lookup → Palm Beach", lk.s === 200 && lk.j.lookup?.county === "palm-beach" && lk.j.cities?.every((c) => c.ownerConfirmed === false));
ok("marketer cannot edit ZIP map", (await api("/areas", { tok: T.marketer, method: "POST", body: { zip: "33458", county: "palm-beach" } })).s === 403);
ok("owner sets a ZIP override", (await api("/areas", { tok: T.owner, method: "POST", body: { zip: "33458", county: "none" } })).s === 200);
ok("override applied", (await api("/areas?zip=33458", { tok: T.owner })).j.lookup?.county === null);
await api("/areas", { tok: T.owner, method: "POST", body: { zip: "33458", county: "clear" } });

// ── DataMoon synthetic flow (Boston + FL templates) ──
const dm = await api("/datamoon", { tok: T.owner });
ok("DataMoon shows not connected / fixtures", dm.s === 200 && dm.j.provider !== "live", `${dm.j.provider} · ${dm.j.status?.label}`);
const tpl = await api("/datamoon/templates", { tok: T.marketer, method: "POST", body: { key: "fl-b2c-condo-stone" } });
ok("marketer creates FL recipe from template", tpl.s === 201 || tpl.s === 200, tpl.j.error);
const rid = tpl.j.recipe?.id;
const bost = await api("/datamoon/templates", { tok: T.marketer, method: "POST", body: { key: "boston-b2b-facilities" } });
ok("Boston template too", bost.s === 201 || bost.s === 200, bost.j.error);
const prohibited = await api(`/datamoon/recipes/${rid}`, { tok: T.marketer, method: "POST", body: { action: "update", patch: { purpose: "Target Hispanic homeowners by ethnicity" } } });
ok("ethnicity targeting refused", prohibited.s === 422, String(prohibited.s));
ok("marketer cannot approve", (await api(`/datamoon/recipes/${rid}`, { tok: T.marketer, method: "POST", body: { action: "approve" } })).s === 403);
ok("run before approval refused", (await api(`/datamoon/recipes/${rid}`, { tok: T.owner, method: "POST", body: { action: "run" } })).s === 409);
for (const a of ["submit", "approve", "approve_export"]) { const r = await api(`/datamoon/recipes/${rid}`, { tok: T.owner, method: "POST", body: { action: a, patch: { maxRecords: 50 } } }); ok(`owner ${a}`, r.s === 200, r.j.error || ""); }
const run = await api(`/datamoon/recipes/${rid}`, { tok: T.owner, method: "POST", body: { action: "run" } });
ok("synthetic run queued (no vendor call)", run.s === 200 && run.j.result?.synthetic === true, run.j.result?.exportId ?? run.j.error);
const dry = await api("/datamoon/imports", { tok: T.owner, method: "POST", body: { recipeId: rid, source: "csv", dryRun: true, csv: "contact_id,first_name,personal_emails,personal_state,personal_zip,contact_country\nid_00000000000000aa,Pat,pat@example.com,fl,33480,US\nid_00000000000000ab,Lee,lee@example.com,fl,32801,US\nid_00000000000000ac,Max,max@example.com,ma,02139,US\n" } });
ok("CSV dry run: only Palm Beach/Broward rows accepted", dry.s === 200 && dry.j.summary?.accepted === 1 && dry.j.summary?.reasons?.out_of_market === 2, JSON.stringify(dry.j.summary ?? dry.j));
const crm = await api("/crm", { tok: T.owner, method: "POST", body: { action: "run" } });
ok("outbox run processes queued jobs", crm.s === 200 && crm.j.processed >= 1, `processed ${crm.j.processed} done ${crm.j.done}`);
const after = await api("/datamoon", { tok: T.owner });
ok("synthetic vendor prospects stored separately", after.j.contacts?.total >= 1 && after.j.contacts.sample.every((c) => c.synthetic));
ok("suppression added", (await api("/suppressions", { tok: T.owner, method: "POST", body: { email: "pat@example.com", reason: "opt_out" } })).s === 200);
const dry2 = await api("/datamoon/imports", { tok: T.owner, method: "POST", body: { recipeId: rid, source: "csv", dryRun: true, csv: "contact_id,personal_emails,personal_state,personal_zip,contact_country\nid_00000000000000aa,pat@example.com,fl,33480,US\n" } });
ok("suppressed email blocked on import", dry2.j.summary?.suppressed === 1 && dry2.j.summary?.accepted === 0, JSON.stringify(dry2.j.summary));

// ── CSV, reports, audit, health, cron, webhooks ──
ok("marketer cannot export CSV", (await fetch(`${base}/api/admin/ops/records?format=csv`, { headers: { authorization: `Bearer ${T.marketer}` } })).status === 403);
const csvO = await fetch(`${base}/api/admin/ops/records?format=csv`, { headers: { authorization: `Bearer ${T.owner}` } });
const csvT = await csvO.text();
ok("owner CSV export (allowlisted header, no notes/tokens)", csvO.status === 200 && !/directions|message|token|price/i.test(csvT.split("\n")[0]), csvT.split("\n")[0].slice(0, 160));
const rep = await api("/reports", { tok: T.owner });
ok("reports: by market + county + walkthroughs + proposals", rep.s === 200 && rep.j.report?.byCounty && rep.j.report?.walkthroughs && rep.j.report?.proposals, Object.keys(rep.j.report ?? {}).join(","));
const repM = await api("/reports", { tok: T.marketer });
ok("non-owner report hides proposal values", repM.s !== 200 || repM.j.report?.proposals?.approvedValueUsd === undefined);
const au = await api("/audit", { tok: T.owner });
ok("audit chain verifies", au.s === 200 && au.j.chain?.ok === true, `${au.j.entries?.length} entries`);
{ const hh = (await api("/health", { tok: T.owner })).j.health ?? {}; ok("health: DataMoon off, AR disabled", hh.datamoon?.main === "disabled" && hh.datamoon?.activation === "off" && Object.values(hh.ar?.providers ?? hh.ar ?? {}).length > 0, JSON.stringify({ dm: hh.datamoon, ar: hh.ar }).slice(0, 200)); }
ok("cron without secret → 401/404", [401, 404].includes((await fetch(`${base}/api/cron/outbox`)).status));
ok("DataMoon webhook disabled → 404", (await fetch(`${base}/api/webhooks/datamoon/exports`, { method: "POST", body: "{}" })).status === 404);
ok("AR webhook disabled → 404", (await fetch(`${base}/api/ar/webhook/hover`, { method: "POST", body: "{}" })).status === 404);

// ── UI ──
const b = await chromium.launch();
for (const [w, h] of [[375, 812], [390, 844], [768, 1024], [1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...(w < 800 ? { isMobile: true, hasTouch: true } : {}) });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${base}/admin/ops`, { waitUntil: "networkidle" });
  if (w === 375 && shots) await p.screenshot({ path: `${shots}/m375_admin_ops_login.png`, fullPage: true });
  await p.fill("#ops-token", T.owner); await p.getByRole("button", { name: "Sign in" }).click();
  await p.getByRole("tablist").waitFor({ timeout: 15000 });
  const tabs = await p.getByRole("tab").allInnerTexts();
  const overflow = [];
  for (const name of tabs) {
    await p.getByRole("tab", { name, exact: true }).click(); await p.waitForTimeout(500); await p.waitForLoadState("networkidle");
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ov > 1) overflow.push(`${name}+${ov}px`);
    if (shots && (w === 390 || w === 1440)) await p.screenshot({ path: `${shots}/${w < 800 ? "m" : "d"}${w}_admin_ops_${name.toLowerCase().replace(/[^a-z]+/g, "-")}.png`, fullPage: true });
  }
  ok(`UI ${w}px: ${tabs.length} tabs render without page errors`, errs.length === 0 && tabs.length === 14, errs.join(" | ") || tabs.join(","));
  ok(`UI ${w}px: no page-level horizontal overflow`, overflow.length === 0, overflow.join(", "));
  await ctx.close();
}
{ const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.goto(`${base}/admin/ops`, { waitUntil: "networkidle" }); await p.fill("#ops-token", T.ro); await p.getByRole("button", { name: "Sign in" }).click();
  await p.getByRole("tablist").waitFor(); const tabs = await p.getByRole("tab").allInnerTexts();
  ok("read-only: no Staff/Audit/Estimator tabs", !tabs.includes("Staff & roles") && !tabs.includes("Audit log") && !tabs.includes("Estimator (private)"), tabs.join(", ")); await ctx.close(); }
await b.close();
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
