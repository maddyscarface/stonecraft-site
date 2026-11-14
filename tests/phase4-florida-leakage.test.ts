import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { FL_AREA_CITIES, FL_COUNTIES, flCountyForZip } from "@/config/florida-areas";
import { cities } from "@/config/cities";
import { markets } from "@/config/markets";
import { routeLead } from "@/lib/leads/routing";
import { parseLead } from "@/lib/leads/schema";
import { scoreLead } from "@/lib/leads/scoring";
import { buildContactPayload, pushLeadToGhl } from "@/lib/crm/ghl";
import { estimateConfig } from "@/config/estimate";
import { publicPriceRanges, PRICE_RANGES_OWNER_REVIEWED } from "@/config/services";
import { llmsTxt } from "@/lib/seo";
import { arAdapters, arSummary } from "@/lib/ar/adapters";
import { arProviders } from "@/lib/ar/contract";

const base = { firstName: "Ana", email: "ana@example.com", phone: "(617) 555-0101", contactConsent: true, eventId: "evt_fl_123456", attribution: {} };
const lead = (zip: string, o: Record<string, unknown> = {}) => { const r = parseLead({ ...base, zip, variant: "residential", ...o }); if (!r.success) throw new Error(JSON.stringify(r.error.issues)); return r.data; };

describe("Southeast Florida: live, county pages + editable city list", () => {
  it("FL is live by default; the kill switch still works", async () => {
    expect(markets.find((m) => m.id === "south-florida")!.status).toBe("live");
    expect(markets.find((m) => m.id === "south-florida")!.statusNote).toBeUndefined();
    const { flStatus } = await import("@/config/markets");
    process.env.MARKET_FL_PAUSED = "true"; expect(flStatus()).toBe("pre-launch"); delete process.env.MARKET_FL_PAUSED; expect(flStatus()).toBe("live");
    // the retired Phase 2 switch (still "pre-launch" on the Vercel project) is ignored
    process.env.MARKET_FL_STATUS = "pre-launch"; expect(flStatus()).toBe("live"); delete process.env.MARKET_FL_STATUS;
  });
  it("one config list drives county + city pages; every city is marked pending owner confirmation", () => {
    expect(FL_COUNTIES.map((c) => c.slug)).toEqual(["palm-beach-county", "broward-county"]);
    const required = ["west-palm-beach", "palm-beach", "palm-beach-gardens", "jupiter", "boca-raton", "delray-beach", "boynton-beach", "lake-worth-beach", "fort-lauderdale", "pompano-beach", "deerfield-beach", "hollywood", "plantation", "weston", "davie", "coral-springs"];
    for (const slug of required) expect(FL_AREA_CITIES.find((c) => c.slug === slug), slug).toBeTruthy();
    expect(FL_AREA_CITIES.every((c) => c.ownerConfirmed === false)).toBe(true);
    expect(FL_AREA_CITIES.find((c) => c.slug === "jupiter")!.adminNote).toMatch(/operationally served/);
    const flCities = cities.filter((c) => c.market === "south-florida").map((c) => c.slug);
    for (const c of FL_AREA_CITIES) expect(flCities).toContain(c.slug);
  });
  it("routes ZIPs to market + county with region / GHL-path / county tags", () => {
    for (const c of FL_AREA_CITIES) for (const z of c.zips) expect(flCountyForZip(z), `${c.slug} ${z}`).toBe(c.county);
    const pb = routeLead(lead("33480"));
    expect(pb).toMatchObject({ marketId: "south-florida", marketStatus: "live", county: "palm-beach" });
    expect(pb.tags).toEqual(expect.arrayContaining(["region:southeast-florida", "county:palm-beach", "ghl-path:fl-residential"]));
    expect(pb.tags).not.toContain("market:pre-launch");
    const bw = routeLead(lead("33301", { variant: "commercial", segment: "hotels-hospitality", organization: "Hotel", jobTitle: "GM", buildings: 1, decisionRole: "decision_maker", timeline: "90d" }));
    expect(bw.county).toBe("broward"); expect(bw.tags).toEqual(expect.arrayContaining(["ghl-path:fl-commercial", "county:broward"]));
    const bos = routeLead(lead("02139"));
    expect(bos.county).toBeNull(); expect(bos.tags).toEqual(expect.arrayContaining(["region:greater-boston", "ghl-path:boston-residential"]));
    expect(routeLead(lead("32801")).county).toBe("unconfirmed"); // FL but outside both counties
    // admin ZIP overrides
    expect(routeLead(lead("32801"), { "32801": "broward" }).county).toBe("broward");
    expect(routeLead(lead("33480"), { "33480": "none" }).county).toBe("unconfirmed");
  });
  it("GHL mapping: FL location, county custom field, dry-run without a token", async () => {
    const l = lead("33301"); const r = routeLead(l); const s = scoreLead(l, r);
    const p = buildContactPayload(l, r, s, []) as { customFields?: { key?: string; field_value?: unknown }[]; tags: string[] };
    expect(JSON.stringify(p)).toContain("sc_county"); expect(JSON.stringify(p)).toContain("broward");
    expect(p.tags).toEqual(expect.arrayContaining(["county:broward", "region:southeast-florida"]));
    delete process.env.GHL_PRIVATE_TOKEN;
    expect((await pushLeadToGhl(l, r, s, [])).mode).toBe("dry-run");
  });
  it("llms.txt lists FL as live with county URLs and no prelaunch copy", () => {
    const t = llmsTxt();
    expect(t).toContain("/south-florida/palm-beach-county"); expect(t).toContain("/south-florida/broward-county");
    expect(t.toLowerCase()).not.toMatch(/availability is being confirmed|pre-launch/);
  });
});

describe("no customer-visible prices", () => {
  it("price ranges, typical ranges and budget bands are not published", () => {
    expect(PRICE_RANGES_OWNER_REVIEWED).toBe(false);
    expect(Object.keys(publicPriceRanges)).toHaveLength(0);
    expect(estimateConfig.budgetBands).toEqual([]);
  });
  it("public source files contain no dollar amounts", () => {
    const root = path.resolve(__dirname, "../src");
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
    const isPrivate = (f: string) => /src\/(app\/admin|app\/api\/admin|components\/ops|components\/admin|lib\/ops|lib\/estimator|lib\/pricing|config\/pricing)/.test(f);
    const bad: string[] = [];
    for (const f of walk(root).filter((x) => /\.(tsx?|md)$/.test(x) && !isPrivate(x))) {
      const t = readFileSync(f, "utf8");
      const m = t.match(/(?<![\w$`{])\$\s?\d[\d,]*(\.\d+)?(?!\w)/g);
      if (m) bad.push(`${path.relative(root, f)}: ${m.slice(0, 3).join(", ")}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("native AR adapters", () => {
  it("are contracts only: every provider disabled, every method refuses, fallback is the manual walkthrough", async () => {
    expect(arProviders).toEqual(["arkit", "roomplan", "arcore", "hover", "cubicasa"]);
    for (const a of arSummary()) { expect(a.status).toBe("disabled"); expect(a.fallback).toBe("manual_walkthrough"); }
    await expect(arAdapters.hover.createSession({ market: "boston" })).rejects.toMatchObject({ code: "ar_disabled" });
    process.env.AR_HOVER_ENABLED = "true";
    expect(arAdapters.hover.status()).toBe("not_configured"); // a flag alone never makes it live
    delete process.env.AR_HOVER_ENABLED;
    const { POST } = await import("@/app/api/ar/webhook/[provider]/route");
    expect((await POST(new Request("http://x/api/ar/webhook/hover", { method: "POST", body: "{}" }), { params: Promise.resolve({ provider: "hover" }) })).status).toBe(404);
  });
});
