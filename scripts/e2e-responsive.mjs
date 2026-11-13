// Responsive QA: overflow, tap targets, text size, mobile nav.
// Usage: BASE_URL=http://127.0.0.1:PORT node scripts/e2e-responsive.mjs
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "https://stonecraft-staging.vercel.app";
const SHOTS = process.env.SHOTS || "/tmp/stonecraft-responsive";
mkdirSync(SHOTS, { recursive: true });

const WIDTHS = [320, 360, 390, 414, 768, 834, 1024, 1280, 1440, 1920];
const EXTRA = [{ w: 844, h: 390, name: "844x390" }];
const PAGES = ["/", "/free-assessment", "/commercial", "/services/shower-restoration", "/resources", "/boston"];
const MIN_TAP = 44;
const MIN_TEXT = 12;

const results = [];
const ok = (n, c, d = "") => {
  results.push({ n, pass: !!c, d });
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`);
};

const browser = await chromium.launch();

async function measure(page) {
  return page.evaluate((minTap) => {
    const doc = document.documentElement;
    const overflowX = Math.max(0, doc.scrollWidth - doc.clientWidth);
    const overflowing = [...document.querySelectorAll("body *")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > doc.clientWidth + 1;
    }).slice(0, 8).map((el) => {
      const r = el.getBoundingClientRect();
      return `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ").slice(0, 2).join(".") : ""} right=${Math.round(r.right)}`;
    });
    const selectors = [
      "header a", "header button",
      "[data-testid='hero-cta']", "[data-testid='hero-cta-commercial']",
      "[data-testid='region-selector'] button",
      "a.btn", "button.btn",
      "[aria-label='Open menu']", "[aria-label='Close menu']",
      "nav a",
    ].join(",");
    const tappable = [...document.querySelectorAll(selectors)];
    const smallTaps = tappable.filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      return r.height < minTap - 0.5 && r.width < minTap - 0.5;
    }).map((el) => {
      const r = el.getBoundingClientRect();
      return `${el.tagName}:${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40)} ${Math.round(r.width)}x${Math.round(r.height)}`;
    });
    const tinyText = [...document.querySelectorAll("h1, h2, p, li, label, a, button")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const size = parseFloat(getComputedStyle(el).fontSize);
        return size && size < 12;
      })
      .slice(0, 6)
      .map((el) => `${el.tagName} ${getComputedStyle(el).fontSize} ${(el.textContent || "").trim().slice(0, 30)}`);
    return { overflowX, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, overflowing, smallTaps, tinyText };
  }, MIN_TAP);
}

for (const width of WIDTHS) {
  const height = width < 768 ? 844 : width < 1280 ? 1024 : 1080;
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width <= 414, hasTouch: width <= 414 });
  const page = await ctx.newPage();
  for (const path of PAGES) {
    const resp = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(300);
    const m = await measure(page);
    ok(`${width}px ${path} status 200`, resp?.ok() || resp?.status() === 200, String(resp?.status()));
    ok(`${width}px ${path} no horizontal overflow`, m.overflowX <= 1, `overflow=${m.overflowX} (${m.scrollWidth} vs ${m.clientWidth}) ${m.overflowing.join("; ")}`);
    if (path === "/" || path === "/free-assessment") {
      ok(`${width}px ${path} tap targets ≥${MIN_TAP}px`, m.smallTaps.length === 0, m.smallTaps.slice(0, 5).join(" | "));
    }
    ok(`${width}px ${path} text ≥${MIN_TEXT}px`, m.tinyText.length === 0, m.tinyText.join(" | "));
  }
  if (width <= 1024) {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    const open = page.getByLabel("Open menu");
    const visible = await open.isVisible().catch(() => false);
    ok(`${width}px mobile/menu button visible`, visible);
    if (visible) {
      await open.click();
      await page.waitForTimeout(200);
      const dialog = page.locator('[role="dialog"][aria-modal="true"]');
      ok(`${width}px mobile nav opens`, await dialog.isVisible());
      const close = page.getByLabel("Close menu");
      ok(`${width}px close control ≥44px`, await close.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.width >= 44 && r.height >= 44;
      }));
      await page.getByRole("link", { name: "Resources" }).first().click();
      await page.waitForURL(/resources/, { timeout: 15000 });
      ok(`${width}px mobile nav navigates`, page.url().includes("/resources"));
    }
  } else {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    ok(`${width}px desktop nav visible`, await page.getByLabel("Main").isVisible());
  }
  if ([320, 390, 768, 1024, 1440].includes(width)) {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: `${SHOTS}/home-${width}.png`, fullPage: false });
  }
  await ctx.close();
}

for (const extra of EXTRA) {
  const ctx = await browser.newContext({ viewport: { width: extra.w, height: extra.h }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const m = await measure(page);
  ok(`${extra.name} / no horizontal overflow`, m.overflowX <= 1, `overflow=${m.overflowX} ${m.overflowing.join("; ")}`);
  await page.screenshot({ path: `${SHOTS}/home-${extra.name}.png`, fullPage: false });
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("Failures:");
  for (const f of failed) console.log(" -", f.n, f.d);
}
process.exit(failed.length ? 1 : 0);
