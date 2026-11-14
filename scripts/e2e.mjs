// End-to-end smoke test against a running server (default http://localhost:3100).
// Covers: page renders, residential + renter + commercial lead flows, photo upload,
// single generate_lead per eventId, idempotent resubmit, admin auth, sitemap/robots, screenshots.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("node:child_process").execSync("npm root -g").toString().trim() + "/playwright")); }
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const ADMIN = process.env.ADMIN_TOKEN ?? "";
const shots = process.env.SHOTS_DIR ?? "/tmp/sc-shots";
fs.mkdirSync(shots, { recursive: true });
const results = [];
const ok = (name, cond, detail = "") => { results.push({ name, pass: !!cond, detail }); console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`); };

const PAGES = ["/", "/boston", "/south-florida", "/boston/cambridge", "/south-florida/boca-raton", "/residential", "/renters", "/landlords", "/commercial", "/commercial/hospitals", "/commercial/universities-schools", "/commercial/hotels-hospitality", "/commercial/hoa-condos", "/commercial/property-management", "/services/shower-restoration", "/services/commercial-restoration", "/bathroom-refresh", "/free-assessment", "/commercial-site-assessment", "/gallery", "/about", "/process", "/service-areas", "/resources", "/resources/restore-or-replace-bathroom-tile", "/resources/grout-cleaning-vs-color-sealing", "/resources/restore-or-replace-shower-grout", "/resources/glazed-tile-and-high-gloss-finishes", "/resources/marble-etching-vs-staining", "/resources/safe-cleaning-after-restoration", "/resources/commercial-restroom-maintenance-after-restoration", "/contact", "/thank-you", "/privacy", "/terms", "/renters/landlord-approval", "/commercial/capabilities"];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`${page.url()}: ${m.text()}`); });

for (const p of PAGES) {
  const r = await page.goto(BASE + p, { waitUntil: "networkidle" });
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  ok(`render ${p}`, r?.status() === 200 && h1, `${r?.status()} "${(h1 ?? "").slice(0, 60)}"`);
}
// SEO checks
const flHtml = await (await fetch(BASE + "/south-florida/boca-raton")).text();
ok("FL city page is live: indexable + canonical, no prelaunch copy", !/noindex/.test(flHtml) && /rel="canonical" href="[^"]*\/south-florida\/boca-raton"/.test(flHtml) && !/availability (is )?being confirmed/i.test(flHtml));
const pbHtml = await (await fetch(BASE + "/south-florida/palm-beach-county")).text();
ok("Palm Beach County page renders with form + Illustrative label", /Palm Beach County/.test(pbHtml) && /id="get-started"/.test(pbHtml) && /Illustrative/.test(pbHtml));
const bwHtml = await (await fetch(BASE + "/south-florida/broward-county")).text();
ok("Broward County page renders with form", /Broward County/.test(bwHtml) && /id="get-started"/.test(bwHtml));
const vis = (h) => h.replace(/<script[\s\S]*?<\/script>/g, "");
ok("FL pages show no prices", !/\$\s?\d{2,}/.test(vis(flHtml + pbHtml + bwHtml)));
const bosHtml = await (await fetch(BASE + "/boston/cambridge")).text();
ok("Boston city page indexable + canonical", !/noindex/.test(bosHtml) && /rel="canonical" href="[^"]*\/boston\/cambridge"/.test(bosHtml));
ok("no AggregateRating schema (no fake reviews)", !/AggregateRating/.test(bosHtml + flHtml));
const sm = await (await fetch(BASE + "/sitemap.xml")).text();
ok("sitemap includes Boston cities and FL county + city pages", sm.includes("/boston/newton") && sm.includes("/south-florida/palm-beach-county") && sm.includes("/south-florida/broward-county") && sm.includes("/south-florida/boca-raton"));
ok("robots disallows admin", (await (await fetch(BASE + "/robots.txt")).text()).includes("Disallow: /admin"));
const llms = await (await fetch(BASE + "/llms.txt")).text();
ok("llms.txt is a public facts index", llms.includes("# StoneCraft") && llms.includes("Not a franchise") && !llms.includes("/admin") && !llms.includes("/api/"));
const homeHtml = await (await fetch(BASE + "/")).text();
ok("home uses Phase 3 H1", /Tile, Grout and Stone Restoration in Greater Boston/.test(homeHtml));
const orgLd = [...homeHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((b) => b.includes("ProfessionalService") && b.includes("#organization")) || "";
ok("home schema areaServed lists Greater Boston + Southeast Florida (both live)", orgLd.includes("Greater Boston") && /Southeast Florida/.test(orgLd), orgLd.slice(0, 180));
const showerHtml = await (await fetch(BASE + "/services/shower-restoration")).text();
ok("service schema advertises live Florida counties", /Palm Beach County/.test(showerHtml) && /Broward County/.test(showerHtml));
const iconPaths = ["/favicon.ico", "/favicon.svg", "/icon.svg", "/icon-32.png", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/manifest.webmanifest"];
for (const icon of iconPaths) {
  const ir = await fetch(BASE + icon);
  ok(`icon ${icon} returns 200`, ir.status === 200, String(ir.status));
}
const man = await (await fetch(BASE + "/manifest.webmanifest")).json();
ok("web manifest has theme colour and 192/512 icons", man.theme_color === "#25292B" && (man.icons || []).some((i) => i.sizes === "192x192") && (man.icons || []).some((i) => i.sizes === "512x512"));


async function dl() { return page.evaluate(() => (window.dataLayer || []).filter((e) => e && e.event).map((e) => ({ event: e.event, event_id: e.event_id, market: e.market }))); }

// Residential flow with photo
await page.goto(BASE + "/free-assessment", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("sc_consent_v1", JSON.stringify({ analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" })));
await page.goto(BASE + "/free-assessment?utm_source=google&utm_medium=cpc&utm_campaign=bos_shower&gclid=TEST123", { waitUntil: "networkidle" });
await page.screenshot({ path: `${shots}/assessment-step1.png`, fullPage: false });
await page.fill('[data-testid="firstName"]', "Test");
await page.fill('[data-testid="email"]', `qa+${Date.now()}@example.com`);
await page.fill('[data-testid="phone"]', "6175550101");
await page.fill('[data-testid="zip"]', "02139");
await page.click('[data-testid="next"]');
await page.getByText("Shower tile & grout").click();
await page.click('[data-testid="next"]');
// Qualifier step (project type may already be preselected from the surface)
await page.getByTestId("q-project_type-shower").click().catch(() => {});
await page.getByTestId("q-size-alcove").click();
// Phase 4: budget bands ship blank (no customer-visible prices) — the budget chip is gone.
ok("no budget/price chips on the form", (await page.locator('[data-testid^="q-budget-"]').count()) === 0);
await page.getByTestId("q-start-2weeks").click();
const pref = new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10);
if (await page.locator('[data-testid="q-preferred_date"]').count()) {
  await page.fill('[data-testid="q-preferred_date"]', pref);
  await page.selectOption('[data-testid="q-preferred_window"]', "1000").catch(() => {});
}
await page.click('[data-testid="next"]');
// 1x1 jpeg
const jpg = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
await page.setInputFiles('[data-testid="photo-input"]', { name: "shower.jpg", mimeType: "image/jpeg", buffer: jpg });
await page.waitForSelector('img[alt="shower.jpg"]', { timeout: 10000 });
ok("photo uploaded + thumbnail shown", true);
await page.waitForTimeout(3200); // pass bot-timing guard
await page.click('[data-testid="next"]');
await page.click('[data-testid="contact-consent"]');
await page.screenshot({ path: `${shots}/assessment-final-step.png` });
const [resp] = await Promise.all([page.waitForResponse((r) => r.url().includes("/api/leads")), page.click('[data-testid="submit"]')]);
const body = await resp.json();
ok("residential lead accepted", resp.status() === 200 && body.market === "boston", JSON.stringify(body));
await page.waitForURL(/thank-you/, { timeout: 10000 });
ok("redirected to thank-you", page.url().includes("/thank-you"));
let events = await dl();
const leads = events.filter((e) => e.event === "generate_lead");
ok("exactly one generate_lead", leads.length === 1 && leads[0].event_id?.startsWith("lead_"), JSON.stringify(leads));
ok("photo_upload_success fired", events.some((e) => e.event === "photo_upload_success"));
await page.reload({ waitUntil: "networkidle" });
events = await dl();
ok("no generate_lead on thank-you reload", !events.some((e) => e.event === "generate_lead"));
const attr = await page.evaluate(() => JSON.parse(localStorage.getItem("sc_attr_v1") || "{}"));
ok("attribution persisted (utm + gclid)", attr.utm_campaign === "bos_shower" && attr.gclid === "TEST123");

// Renter flow + roommate calculator
await page.goto(BASE + "/renters", { waitUntil: "networkidle" });
ok("roommate calculator has no pre-filled price", (await page.locator('[data-testid="rc-share"]').first().textContent()) === "—");
await page.locator('#rc-price').first().fill("1500");
const share = await page.locator('[data-testid="rc-share"]').first().textContent();
ok("roommate calculator splits the customer's own quote ($1,500 / 3)", share === "$500", share);
await page.locator('[data-testid="roommate-calculator"] button[aria-label="More people"]').first().click();
ok("roommate calculator updates (/4)", (await page.locator('[data-testid="rc-share"]').first().textContent()) === "$375");
await page.screenshot({ path: `${shots}/renters.png`, fullPage: true });

// Direct API: renter strips landlord details w/o consent; duplicate is idempotent; validation errors
const ev = `lead_qa_${Date.now()}`;
const renterBody = { variant: "renter", firstName: "R", email: "r@example.com", phone: "6175550102", zip: "02143", contactConsent: true, approvalAcknowledged: true, eventId: ev, roommates: 3, landlordName: "Should Drop", startedAt: Date.now() - 10000, attribution: {} };
const r1 = await fetch(BASE + "/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(renterBody) });
const r2 = await fetch(BASE + "/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(renterBody) });
const j2 = await r2.json();
ok("renter lead accepted", r1.status === 200);
ok("duplicate submit is idempotent", j2.duplicate === true, JSON.stringify(j2));
const bad = await fetch(BASE + "/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variant: "commercial", firstName: "x", email: "bad", phone: "1", zip: "1", contactConsent: true, eventId: "lead_bad_123456" }) });
ok("invalid commercial lead rejected 422", bad.status === 422);
const flLead = await fetch(BASE + "/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variant: "residential", firstName: "F", email: "f@example.com", phone: "5615550101", zip: "33432", contactConsent: true, eventId: `lead_fl_${Date.now()}`, startedAt: Date.now() - 10000 }) });
const flJ = await flLead.json();
ok("FL lead (Boca 33432) routed to live market + Palm Beach County", flJ.market === "south-florida" && flJ.marketStatus === "live" && flJ.county === "palm-beach", JSON.stringify(flJ));
ok("public lead response is allowlisted (no score/price/GHL internals)", Object.keys(flJ).every((k) => ["ok", "market", "county", "tier", "marketStatus", "duplicate", "leadId"].includes(k)), Object.keys(flJ).join(","));

// Commercial flow (UI)
await page.goto(BASE + "/commercial-site-assessment?segment=hospitals", { waitUntil: "networkidle" });
await page.fill('[data-testid="firstName"]', "Facilities");
await page.fill('[data-testid="email"]', `fd+${Date.now()}@example.org`);
await page.fill('[data-testid="phone"]', "6175550199");
await page.fill('[data-testid="zip"]', "02115");
await page.fill('[data-testid="organization"]', "Example Medical Center");
await page.fill('[data-testid="jobTitle"]', "Director of Facilities");
await page.click('[data-testid="next"]');
ok("segment preselected from URL", (await page.locator('[data-testid="segment"]').inputValue()) === "hospitals");
await page.click('[data-testid="next"]');
ok("commercial form has no dollar budget brackets", !/\$\d/.test(await page.locator('[data-testid="budget-status"]').innerText()));
await page.selectOption('[data-testid="budget-status"]', "approved");
await page.click('[data-testid="next"]');
await page.waitForTimeout(3200);
await page.click('[data-testid="contact-consent"]');
const [cr] = await Promise.all([page.waitForResponse((r) => r.url().includes("/api/leads")), page.click('[data-testid="submit"]')]);
const cj = await cr.json();
ok("commercial lead accepted + hot/warm", cr.status() === 200 && ["hot", "warm"].includes(cj.tier), JSON.stringify(cj));

// Admin
const unauth = await fetch(BASE + "/api/admin/quote", { method: "POST", body: "{}" });
ok("admin API blocked without token", unauth.status === 401);
if (ADMIN) {
  const q = await fetch(BASE + "/api/admin/quote", { method: "POST", headers: { Authorization: `Bearer ${ADMIN}`, "Content-Type": "application/json" }, body: JSON.stringify({ market: "boston", zip: "02116", lines: [{ service: "shower_restoration", quantity: 1 }] }) });
  const qj = await q.json();
  ok("admin quote works, customer view strips internals", q.status === 200 && qj.internal.internal && !JSON.stringify(qj.customer).includes("techPay"));
  const s = await fetch(BASE + "/api/admin/schedule", { method: "POST", headers: { Authorization: `Bearer ${ADMIN}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "suggest", zip: "02459" }) });
  const sj = await s.json();
  ok("admin schedule suggest (Newton → Tuesday zone)", sj.suggestion?.zone?.id === "bos-west" && sj.suggestion.primary.day === "tuesday");
  await page.goto(BASE + "/admin", { waitUntil: "networkidle" });
  await page.fill("#token", ADMIN);
  await Promise.all([page.waitForURL(/dashboard/), page.click("button:has-text('Sign in')")]);
  const leadsStat = await page.locator("text=Leads").first().isVisible();
  ok("admin dashboard loads after login", leadsStat);
  await page.screenshot({ path: `${shots}/admin-dashboard.png`, fullPage: true });
  await page.goto(BASE + "/admin/dashboard?view=ops", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${shots}/admin-ops.png`, fullPage: true });
}

// Screenshots: desktop + mobile key pages
for (const [p, n] of [["/", "home"], ["/commercial", "commercial"], ["/boston/cambridge", "city-cambridge"], ["/services/shower-restoration", "service"]]) {
  await page.goto(BASE + p, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${shots}/${n}-desktop.png`, fullPage: true });
}
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mp = await mob.newPage();
for (const [p, n] of [["/", "home"], ["/free-assessment", "assessment"], ["/renters", "renters"]]) {
  await mp.goto(BASE + p, { waitUntil: "networkidle" });
  await mp.screenshot({ path: `${shots}/${n}-mobile.png`, fullPage: false });
}
ok("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
