import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { realPhone, formatUs, markets, CONTACT_EMAIL } from "@/config/markets";
import { followUpPlan } from "@/lib/crm/followup";
import { customFieldList } from "@/lib/crm/ghl";
import { scoreBand } from "@/config/crm";
import { activeIntentProvider, audiencelab, datamoon, intentTags } from "@/lib/intent/providers";
import { attributionSnapshot, summarizeRevenue, type RevenueRecord } from "@/lib/attribution/revenue";
import { adsDateTime, clickConversionPayload, googleAdsConfigured } from "@/lib/tracking/google-ads";
import { photos } from "@/config/photos";

describe("phone is config-driven and placeholders never render", () => {
  it("rejects placeholder and malformed numbers", () => {
    for (const p of ["+16170000000", "(617) 000-0000", "+15610000000", "5555550123", "", undefined, "123", "1111111111"]) expect(realPhone(p)).toBeNull();
  });
  it("accepts a real number and formats it", () => {
    expect(realPhone("(617) 482-1234")).toBe("+16174821234");
    expect(formatUs("+16174821234")).toBe("(617) 482-1234");
  });
  it("markets have no phone without env and use the owner email", () => {
    for (const m of markets) { expect(m.phoneE164).toBeNull(); expect(m.phoneDisplay).toBeNull(); expect(m.email).toBe("info@stonecraftpros.com"); }
    expect(CONTACT_EMAIL).toBe("info@stonecraftpros.com");
  });
  it("no placeholder number or old domain remains anywhere in src", () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
    const files = walk(path.resolve(__dirname, "../src")).filter((f) => /\.(tsx?|css)$/.test(f));
    for (const f of files) {
      const t = readFileSync(f, "utf8");
      expect(t, f).not.toMatch(/000-0000|0000000"|stonecraftboston\.com|stonecraftsefl\.com/);
    }
  });
});

describe("GHL follow-up plan", () => {
  const live = { marketId: "boston", marketStatus: "live" as const, pipeline: "residential" as const };
  it("hot residential lead with photos → new_lead + hot_lead", () => {
    const plan = followUpPlan({ variant: "residential", photoKeys: ["a"] }, live, { tier: "hot" }, {});
    expect(plan.map((p) => p.hook)).toEqual(["new_lead", "hot_lead"]);
    expect(plan[0].workflowEnv).toBe("GHL_BOSTON_WORKFLOW_NEW_LEAD");
  });
  it("renter without photos asks for photos and nurtures", () => {
    const plan = followUpPlan({ variant: "renter", photoKeys: [] }, live, { tier: "warm" }, { GHL_BOSTON_WORKFLOW_PHOTOS_MISSING: "wf_1" });
    expect(plan.map((p) => p.hook)).toEqual(["new_lead", "renter_landlord", "photos_missing", "nurture"]);
    expect(plan.find((p) => p.hook === "photos_missing")?.workflowId).toBe("wf_1");
  });
  it("pre-launch Florida never enters booking flows", () => {
    const plan = followUpPlan({ variant: "commercial", photoKeys: [] }, { marketId: "south-florida", marketStatus: "pre-launch", pipeline: "commercial" }, { tier: "hot" }, {});
    expect(plan.map((p) => p.hook)).toEqual(["new_lead", "prelaunch_waitlist"]);
    expect(plan[1].workflowEnv).toBe("GHL_FL_WORKFLOW_PRELAUNCH_WAITLIST");
  });
  it("out-of-area lead gets only the out-of-area reply", () => {
    expect(followUpPlan({ variant: "residential", photoKeys: [] }, { marketId: null, marketStatus: null, pipeline: "residential" }, { tier: "cold" }, {}).map((p) => p.hook)).toEqual(["out_of_area"]);
  });
  it("custom fields switch to ids when a map is configured", () => {
    expect(customFieldList({ sc_lead_score: 60, sc_market: "boston", empty: "" }, JSON.stringify({ sc_lead_score: "fld_1" }))).toEqual([{ id: "fld_1", field_value: 60 }, { key: "sc_market", field_value: "boston" }]);
    expect(customFieldList({ a: 1 }, "not json")).toEqual([{ key: "a", field_value: 1 }]);
  });
  it("score bands", () => { expect([scoreBand(90), scoreBand(60), scoreBand(31), scoreBand(5)]).toEqual(["80+", "55-79", "30-54", "0-29"]); });
});

describe("intent data adapter", () => {
  it("is disabled by default and needs a secret", () => {
    expect(activeIntentProvider({})).toBeNull();
    expect(activeIntentProvider({ INTENT_PROVIDER: "datamoon" })).toBeNull();
    expect(activeIntentProvider({ INTENT_PROVIDER: "datamoon", INTENT_WEBHOOK_SECRET: "x" })?.id).toBe("datamoon");
    expect(activeIntentProvider({ INTENT_PROVIDER: "unknown", INTENT_WEBHOOK_SECRET: "x" })).toBeNull();
  });
  it("normalises provider payloads and never allows auto-SMS", () => {
    const d = datamoon.parse({ data: [{ business_email: "a@b.com", first_name: "A", topics: "grout cleaning, marble polishing", intent_score: "75" }, { nothing: true }] });
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ email: "a@b.com", kind: "person", score: 75, topics: ["grout cleaning", "marble polishing"] });
    expect(intentTags(d[0])).toEqual(expect.arrayContaining(["intent:no-auto-sms", "intent-topic:grout-cleaning", "intent-score:high", "brand:stonecraft"]));
    const a = audiencelab.parse([{ company: { name: "Acme Hotels", domain: "acme.com" }, segments: ["hotel renovation"] }]);
    expect(a[0]).toMatchObject({ kind: "company", company: "Acme Hotels", domain: "acme.com" });
  });
});

describe("revenue attribution", () => {
  it("captures first and last touch and click ids", () => {
    const s = attributionSnapshot({ utm_source: "google", utm_medium: "cpc", utm_campaign: "grout-boston", gclid: "G1", first_touch_source: "chatgpt", first_touch_medium: "paid" }, "evt_1", "boston");
    expect(s.first.source).toBe("chatgpt");
    expect(s.last).toMatchObject({ source: "google", medium: "cpc", campaign: "grout-boston" });
    expect(s.clickIds).toEqual({ gclid: "G1" });
  });
  it("summarises revenue by model", () => {
    const mk = (v: number, first: string, last: string): RevenueRecord => ({ eventId: String(v), stage: "won", value: v, currency: "USD", at: new Date().toISOString(), attribution: { first: { source: first }, last: { source: last }, clickIds: {}, leadEventId: "x", leadAt: "" } });
    const recs = [mk(1000, "meta", "google"), mk(500, "google", "google"), { ...mk(200, "", ""), attribution: null }];
    expect(summarizeRevenue(recs, "last", "won").rows[0]).toMatchObject({ source: "google", revenue: 1500, deals: 2 });
    expect(summarizeRevenue(recs, "first", "won").rows.map((r) => r.source)).toEqual(["meta", "google", "unattributed"]);
    expect(summarizeRevenue(recs, "last", "won").total).toBe(1700);
    // completed_revenue is reported separately so a won job isn't double-counted when it completes
    const done = [{ ...mk(900, "meta", "google"), event: "completed_revenue" }, { ...mk(1000, "meta", "google"), event: "job_won" }];
    expect(summarizeRevenue(done).total).toBe(900);
    expect(summarizeRevenue(done, "last", "won").total).toBe(1000);
  });
  it("builds Google Ads click conversions and stays off without credentials", () => {
    expect(googleAdsConfigured()).toBe(false);
    expect(adsDateTime("2026-11-12T10:00:00.000Z")).toBe("2026-11-12 10:00:00+00:00");
    const p = clickConversionPayload({ gclid: "G1", conversion: "job_won", time: "2026-11-12T10:00:00.000Z", value: 2400, orderId: "crm_1" }, "123", "456");
    expect(p.conversions[0]).toMatchObject({ conversionAction: "customers/123/conversionActions/456", gclid: "G1", conversionValue: 2400, currencyCode: "USD", orderId: "crm_1" });
  });
});

describe("photo manifest", () => {
  it("every photo is licensed stock with a source and the file exists", () => {
    for (const [k, p] of Object.entries(photos)) {
      expect(p.license).toBe("Pexels License");
      expect(p.source).toMatch(/^https:\/\/www\.pexels\.com\/photo\/\d+\/$/);
      const f = path.resolve(__dirname, "../public", p.src.slice(1));
      let exists = false; try { exists = statSync(f).isFile() || statSync(`${f}.b64`).isFile(); } catch { try { exists = statSync(`${f}.b64`).isFile(); } catch {} }
      expect(exists, k).toBe(true);
      expect(p.alt.length).toBeGreaterThan(10);
    }
  });
});
