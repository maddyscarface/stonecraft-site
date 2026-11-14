// Phase 4 guided-walkthrough e2e (mobile 375/390 + tablet 768). Local only, memory store, flags ON for the test server.
// Usage: BASE_URL=http://localhost:47211 ADMIN_TOKEN=… node tests/e2e-phase4/walkthrough.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:47211";
const ADMIN = process.env.ADMIN_TOKEN ?? "";
const SHOTS = process.env.SHOTS_DIR ?? "/tmp/sc-wt-shots"; mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const ok = (label, cond, detail = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? " — " + String(detail).slice(0, 300) : ""}`); };
const api = async (path, method = "GET", body) => { const r = await fetch(BASE + "/api/admin/ops/" + path, { method, headers: { Authorization: `Bearer ${ADMIN}`, "Content-Type": "application/json", Origin: BASE }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
const money = /\$\s?\d/;

const browser = await chromium.launch();
// A real, decodable JPEG made by the browser (the client re-encodes on canvas, so it must decode).
const gen = await browser.newPage();
const jpegB64 = await gen.evaluate(() => { const c = document.createElement("canvas"); c.width = 640; c.height = 480; const x = c.getContext("2d"); x.fillStyle = "#b9a58a"; x.fillRect(0, 0, 640, 480); x.strokeStyle = "#333"; for (let i = 0; i < 640; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 480); x.stroke(); } return c.toDataURL("image/jpeg", 0.8).split(",")[1]; });
await gen.close();
const jpg = (n) => ({ name: `photo-${n}.jpg`, mimeType: "image/jpeg", buffer: Buffer.from(jpegB64, "base64") });

let METRIC = false;
async function walkStep(page, { metric = METRIC, repeat = false } = {}) {
  const step = page.getByTestId("wt-step"); await step.waitFor();
  const key = await step.getAttribute("data-step");
  const label = await page.locator("p.label", { hasText: "Photos" }).first().textContent().catch(() => null);
  const min = Number((label ?? "").match(/at least (\d+)/)?.[1] ?? 0);
  if (min > 0) {
    await page.getByTestId("wt-photo-input").setInputFiles(Array.from({ length: min }, (_, i) => jpg(i)));
    await page.waitForFunction((n) => document.querySelectorAll('[data-testid="wt-media-uploaded"]').length >= n && !document.querySelector('[data-testid="wt-media-pending"]'), min, { timeout: 30000 })
      .catch(async (e) => { await page.screenshot({ path: `${SHOTS}/FAIL-${key}.png` }); console.log("upload stuck on", key, await page.getByTestId("wt-step").innerText()); throw e; });
  }
  for (const fs of await step.locator("fieldset").all()) {
    const btns = fs.locator('button[data-testid^="wt-q-"]'); if (!(await btns.count())) continue;
    if ((await fs.locator('button[aria-pressed="true"]').count()) > 0) continue;
    const no = fs.locator('button[data-testid$="-no"]');
    await ((await no.count()) ? no.first() : btns.first()).click();
  }
  for (const t of await step.locator('input[id^="q-"]').all()) if (!(await t.inputValue())) await t.fill("Weeknights after 9pm");
  if (metric && (await page.getByTestId("wt-units-metric").count())) await page.getByTestId("wt-units-metric").click();
  const rows = await step.locator('[data-testid^="wt-m-"][data-testid$="-a"]').all();
  for (let i = 0; i < rows.length; i++) {
    const id = (await rows[i].getAttribute("data-testid")).replace(/-a$/, "");
    if (i === rows.length - 1 && rows.length > 1) { await page.getByTestId(`${id}-unknown`).check(); continue; } // exercise "I don't know"
    await rows[i].fill(metric ? "1" : "5"); const b = page.getByTestId(`${id}-b`); if (await b.count()) await b.fill(metric ? "20" : "6");
  }
  await page.getByTestId(repeat ? "wt-add-repeat" : "wt-next").click();
  await page.waitForFunction((k) => document.querySelector('[data-testid="wt-review"]') || (document.querySelector('[data-testid="wt-step"]')?.getAttribute("data-step") !== k && !document.querySelector('[data-testid="wt-next"][disabled]')), key, { timeout: 30000 });
  return key;
}

async function finish(page) {
  for (let guard = 0; guard < 30; guard++) {
    if (await page.getByTestId("wt-review").isVisible().catch(() => false)) break;
    await walkStep(page);
  }
  await page.getByTestId("wt-review").waitFor();
  const reviewText = await page.getByTestId("wt-review").innerText();
  ok("review screen shows no prices", !money.test(reviewText));
  await page.getByTestId("wt-submit").click();
  await page.getByTestId("wt-done").waitFor({ timeout: 20000 });
}

const ONLY = process.env.ONLY;
const RUNS_ALL = [["shower", 375, "boston", "02139"], ["floor", 390, "south-florida", "33480"], ["stone", 768, "south-florida", "33301"], ["commercial", 390, "boston", "02116"]];
const RUNS = ONLY ? RUNS_ALL.filter((r) => r[0] === ONLY) : RUNS_ALL;
for (const [workType, width, market, zip] of RUNS) {
  console.log(`\n== ${workType} @ ${width}px (${market})`); METRIC = workType === "stone";
  const c = await api("walkthroughs", "POST", { workType, market, zip, firstName: "Test", units: "imperial" });
  ok("staff creates invite (link shown once, never sent)", c.status === 201 && /\/walkthrough#t=/.test(c.j.inviteLink) && /never sends/.test(c.j.note), JSON.stringify(c.j));
  const id = c.j.walkthrough?.id; const link = c.j.inviteLink.replace(/^https?:\/\/[^/]+/, BASE);
  const ctx = await browser.newContext({ viewport: { width, height: width >= 768 ? 1024 : 812 }, isMobile: width < 768, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("response", async (r) => { if (r.url().includes("/api/walkthrough/") && r.status() >= 400) console.log("  [api]", r.status(), r.url().split("/api/")[1], (await r.text().catch(() => "")).slice(0, 160)); });
  const resp = await page.goto(link, { waitUntil: "networkidle" });
  ok("walkthrough page is noindex + no-referrer", /noindex/.test(resp.headers()["x-robots-tag"] ?? "") && resp.headers()["referrer-policy"] === "no-referrer", JSON.stringify(resp.headers()));
  ok("token removed from the address bar", !page.url().includes("#t="), page.url());
  await page.getByTestId("wt-intro").waitFor();
  ok("intro shows no prices", !money.test(await page.locator("main").innerText()));
  await page.screenshot({ path: `${SHOTS}/${workType}-${width}-intro.png` });
  await page.getByTestId("wt-begin").click();
  const first = await walkStep(page);
  await page.screenshot({ path: `${SHOTS}/${workType}-${width}-step2.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok("no horizontal overflow", overflow <= 1, overflow);
  // Resume: reload the tab (token lives in sessionStorage), progress comes back from the server.
  await page.reload({ waitUntil: "networkidle" }); await page.getByTestId("wt-intro").waitFor();
  await page.getByTestId("wt-begin").click(); const resumedAt = await page.getByTestId("wt-step").getAttribute("data-step");
  ok("resume continues after the completed step", resumedAt !== first, `${first} -> ${resumedAt}`);
  if (workType === "shower") { // repeatable wall step: add a second wall
    while ((await page.getByTestId("wt-step").getAttribute("data-step")) !== "wall#1") await walkStep(page);
    ok("repeatable step offers 'Add another wall'", (await page.getByTestId("wt-add-repeat").count()) > 0);
    await walkStep(page, { repeat: true });
    ok("second wall step opened", (await page.getByTestId("wt-step").getAttribute("data-step")) === "wall#2");
  }
  await finish(page);
  await page.screenshot({ path: `${SHOTS}/${workType}-${width}-done.png` });
  ok("no page errors", errors.length === 0, errors.join(" | "));
  const d = await api(`walkthroughs/${id}`);
  const w = d.j.walkthrough ?? {};
  ok("staff sees submitted walkthrough with media + suggested outcome", w.status === "submitted" && (w.media?.length ?? 0) > 0 && !!w.suggestedOutcome, JSON.stringify({ s: w.status, m: w.media?.length, o: w.suggestedOutcome }));
  if (workType === "shower") ok("shower: second wall captured", Object.keys(w.steps ?? {}).includes("wall#2"), Object.keys(w.steps ?? {}).join(","));
  if (workType === "stone") { const t = JSON.stringify(w); ok("stone: metric entry stored + normalised to mm (1 m 20 cm = 1200 mm)", t.includes('"system":"metric"') && t.includes('"mm":1200'), t.slice(0, 300)); ok("'I don't know' stored as unknown", t.includes('"unknown":true')); }
  if (workType === "commercial") ok("commercial: closure constraints captured", JSON.stringify(w.steps?.closures ?? {}).includes("Weeknights"));
  // Corrections: staff sends a step back; the customer sees it on the same link and resubmits.
  const k = Object.keys(w.steps)[0];
  const rc = await api(`walkthroughs/${id}`, "POST", { action: "request_correction", stepKeys: [k], note: "Please retake the wide photo in daylight." });
  ok("staff requests a correction (nothing sent)", rc.status === 200 && /Nothing was sent/.test(rc.j.note), JSON.stringify(rc.j));
  const p2 = await ctx.newPage(); await p2.goto(link, { waitUntil: "networkidle" });
  await p2.getByTestId("wt-corrections").waitFor(); ok("customer sees the correction request", (await p2.getByTestId("wt-corrections").innerText()).includes("daylight"));
  await p2.getByTestId("wt-begin").click(); await walkStep(p2); await p2.getByTestId("wt-review").waitFor({ timeout: 20000 }).catch(() => {});
  if (await p2.getByTestId("wt-submit").count()) { await p2.getByTestId("wt-submit").click(); await p2.getByTestId("wt-done").waitFor({ timeout: 20000 }); }
  ok("corrected walkthrough resubmitted", (await api(`walkthroughs/${id}`)).j.walkthrough?.status === "submitted");
  // Public JSON never carries prices or staff-only fields.
  const s = await fetch(BASE + "/api/walkthrough/session", { headers: { "X-Walkthrough-Token": decodeURIComponent(link.split("#t=")[1]) } });
  const sj = await s.text();
  ok("public session JSON has no prices / internal fields", s.status === 200 && !money.test(sj) && !/internalNotes|suggestedOutcome|price|rate|inviteHash|"hash"/.test(sj), sj.slice(0, 200));
  // Revoke: the same link stops working.
  await api(`walkthroughs/${id}`, "POST", { action: "revoke_invite" });
  const p3 = await (await browser.newContext({ viewport: { width, height: 800 } })).newPage(); await p3.goto(link, { waitUntil: "networkidle" });
  ok("revoked link is refused", await p3.getByTestId("wt-error").isVisible({ timeout: 10000 }).catch(() => false));
  await ctx.close();
}

// Self-start offer on the thank-you page (same tab, fresh in-market lead).
const sp = await (await browser.newContext({ viewport: { width: 390, height: 812 }, isMobile: true })).newPage();
await sp.goto(BASE + "/free-assessment", { waitUntil: "domcontentloaded" });
await sp.evaluate(() => sessionStorage.setItem("sc_wt_lead", JSON.stringify({ id: "lead_selfstart_" + Date.now(), at: Date.now(), v: "residential" })));
await sp.goto(BASE + "/thank-you?v=residential&m=south-florida", { waitUntil: "networkidle" });
ok("thank-you offers the guided walkthrough", await sp.getByTestId("walkthrough-cta").isVisible().catch(() => false));
await sp.screenshot({ path: `${SHOTS}/thank-you-cta-390.png`, fullPage: true });
const bad = await fetch(BASE + "/api/walkthrough/session", { headers: { "X-Walkthrough-Token": "not-a-real-token-000000000000000000000000" } });
ok("invalid token refused", bad.status === 401 || bad.status === 404, bad.status);
await browser.close();
console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
