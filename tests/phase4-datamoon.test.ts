import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { __resetMemoryStore } from "@/lib/server/kv";
import { dmConfig, dmStatus } from "@/lib/datamoon/config";
import { getProvider, LiveDataMoonAdapter, NoopDataMoonAdapter } from "@/lib/datamoon/adapter";
import { mainClient } from "@/lib/datamoon/main-client";
import { intentClient } from "@/lib/datamoon/intent-client";
import { DataMoonError, dmRequest } from "@/lib/datamoon/http";
import { signDataMoon, verifyDataMoonSignature } from "@/lib/datamoon/webhook";
import { handleExportWebhook, createRecipe, recipeAction } from "@/lib/datamoon/service";
import { complianceIssues, recipeInputSchema, approvalIssues, type Recipe } from "@/lib/datamoon/recipes";
import { checkQuota } from "@/lib/datamoon/quota";
import { importRows, normaliseRow, parseCsv } from "@/lib/datamoon/importer";
import { listVendorContacts, listRecipes, saveRecipe, indexRecipe } from "@/lib/datamoon/store";
import { syncBlockers, vendorGhlPayload } from "@/lib/datamoon/ghl-map";
import { addSuppression } from "@/lib/ops/store";
import { listJobs } from "@/lib/ops/outbox";
import { FOREIGN_FEED_ID, fixtureFeeds } from "@/lib/datamoon/fixtures";
import type { Actor } from "@/lib/ops/auth";

const DM_ENV = ["DATAMOON_ENABLED", "DATAMOON_MAIN_API_ENABLED", "DATAMOON_INTENT_ENABLED", "DATAMOON_INTENT_KEY", "DATAMOON_MAIN_MODULE_KEY", "DATAMOON_INTENT_WEBHOOK_SECRET", "DATAMOON_FEED_BRAND_MAP", "DATAMOON_RECORD_CEILING", "DATAMOON_MONTHLY_RECORD_BUDGET", "DATAMOON_GHL_SYNC_ENABLED", "DATAMOON_AUDIENCE_ACTIVATION_STONECRAFT", "VERCEL_ENV"];
const owner: Actor = { id: "owner", name: "Owner", role: "owner", brands: ["stonecraft"], via: "bearer" };
const marketer: Actor = { ...owner, id: "mk", role: "marketer" };
const SECRET = "whsec_test_0123456789abcdef";
const goodRecipe = (o: Record<string, unknown> = {}) => ({
  name: "Boston homeowners — shower restoration interest", persona: "residential_homeowner", kind: "b2c", api: "intent_feed", market: "boston", states: ["ma"],
  topics: [{ kind: "b2c", id: "fx-b2c-3001", name: "Bathroom remodeling and refresh (hypothesis)", synthetic: true }], feedId: fixtureFeeds[0].id,
  lookbackDays: 14, maxRecords: 200, purpose: "Invite to the opt-in free photo assessment landing page", legalBasis: "Vendor-represented permission; counsel review pending", destinations: ["admin_review_only", "ghl_stonecraft_boston"], ...o,
});
beforeEach(() => { __resetMemoryStore(); for (const k of DM_ENV) delete process.env[k]; });
afterEach(() => vi.unstubAllGlobals());

describe("flags off by default", () => {
  it("everything is disabled with no env; provider is synthetic fixtures (non-prod) and makes no network calls", async () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    const s = dmStatus();
    expect([s.main, s.intent, s.webhook, s.activation, s.ghlSync]).toEqual(["disabled", "disabled", "disabled", "off", "off"]);
    expect(s.label).toMatch(/Not connected/);
    const p = getProvider(); expect(p.mode).toBe("noop_fixtures");
    await p.listAvailableFeeds(); await p.getCreditStatus(); await p.discoverTopics("b2c", "real");
    expect(f).not.toHaveBeenCalled();
    await expect(mainClient().listTopics("b2c", "real estate")).rejects.toThrow(/disabled/);
    await expect(intentClient().listFeeds()).rejects.toMatchObject({ code: "disabled" });
  });
  it("production without flags shows disabled adapter (no fixtures)", async () => {
    process.env.VERCEL_ENV = "production";
    expect(getProvider().mode).toBe("disabled");
    expect(await getProvider().getCreditStatus()).toBeNull();
  });
  it("keys alone never enable live mode; flag + key needed, and status stays 'unverified'", () => {
    process.env.DATAMOON_INTENT_KEY = "k";
    expect(getProvider().mode).toBe("noop_fixtures");
    process.env.DATAMOON_ENABLED = "true"; process.env.DATAMOON_INTENT_ENABLED = "true";
    expect(getProvider().mode).toBe("live");
    expect(dmStatus().intent).toBe("configured_unverified");
  });
  it("webhook endpoint is 404 while disabled", async () => {
    const [st] = await handleExportWebhook("{}", {});
    expect(st).toBe(404);
  });
});

describe("separate auth per API family (mocked)", () => {
  it("main audience calls send X-Api-Key to /v2/m; topic search sends no key; intent sends X-API-Key", async () => {
    process.env.DATAMOON_ENABLED = "true"; process.env.DATAMOON_MAIN_API_ENABLED = "true"; process.env.DATAMOON_INTENT_ENABLED = "true";
    process.env.DATAMOON_MAIN_MODULE_KEY = "main-key"; process.env.DATAMOON_INTENT_KEY = "intent-key"; process.env.DATAMOON_MAIN_TIER = "module";
    const seen: { url: string; headers: Record<string, string> }[] = [];
    const f = async (url: string, init: RequestInit) => { seen.push({ url, headers: init.headers as Record<string, string> }); return new Response(JSON.stringify({ success: true, data: [{ id: 7, name: "Real Estate" }], feeds: [], total: 0, page: 1, page_size: 25, total_pages: 0, message: "Audience is being built." }), { status: 200 }); };
    const topics = await mainClient(f).listTopics("b2c", "real estate");
    expect(topics[0]).toMatchObject({ id: 7, name: "Real Estate" });
    await mainClient(f).buildAudience({ type: "b2c", topic_ids: [7], filters: [] });
    await intentClient(f).listFeeds();
    expect(seen[0].url).toContain("/v2/b2c-topics/search?keywords=real+estate&mode=auto"); expect(seen[0].headers["X-Api-Key"]).toBeUndefined();
    expect(seen[1].url).toBe("https://app.datamoon.com/api/v2/m/audiences/build"); expect(seen[1].headers["X-Api-Key"]).toBe("main-key");
    expect(seen[2].url).toContain("https://intentapi.datamoon.com/intent/feeds"); expect(seen[2].headers["X-API-Key"]).toBe("intent-key"); expect(seen[2].headers["X-Api-Key"]).toBeUndefined();
    delete process.env.DATAMOON_MAIN_TIER;
  });
  it("maps 401, 422 (validation vs monthly limit), 429 Retry-After and 410 expired", async () => {
    const mk = (status: number, body: unknown, headers: Record<string, string> = {}) => async () => new Response(JSON.stringify(body), { status, headers });
    const go = (fetcher: never) => dmRequest({ base: "https://x", path: "/y", method: "GET", fetcher });
    await expect(go(mk(401, { detail: "bad key" }) as never)).rejects.toMatchObject({ code: "auth", status: 401 });
    await expect(go(mk(422, { message: "Validation failed", errors: { "filters.0.operator": ["bad"] } }) as never)).rejects.toMatchObject({ code: "validation" });
    await expect(go(mk(422, { message: "Monthly record limit exceeded" }) as never)).rejects.toMatchObject({ code: "quota_exceeded" });
    await expect(go(mk(429, { detail: "slow down" }, { "Retry-After": "30" }) as never)).rejects.toMatchObject({ code: "rate_limited", retryAfterSec: 30 });
    await expect(go(mk(410, { detail: "source_expired" }) as never)).rejects.toMatchObject({ code: "expired" });
    await expect(go((async () => { throw new TypeError("fetch failed"); }) as never)).rejects.toBeInstanceOf(DataMoonError);
  });
  it("async export polling: building → ready (live adapter with mocked API)", async () => {
    process.env.DATAMOON_ENABLED = "true"; process.env.DATAMOON_INTENT_ENABLED = "true"; process.env.DATAMOON_INTENT_KEY = "k";
    let n = 0;
    const f = async () => new Response(JSON.stringify({ exports: [{ export_id: "e1", status: n++ === 0 ? "building" : "ready", total_rows: 5, total_pages: 1, page_size: 1000, created_at: "2026-11-14T00:00:00Z" }] }), { status: 200 });
    const a = new LiveDataMoonAdapter(f as never);
    expect(((await a.poll("e1", "intent_feed")) as { status: string }).status).toBe("building");
    expect(((await a.poll("e1", "intent_feed")) as { status: string }).status).toBe("ready");
  });
});

describe("webhook HMAC verification", () => {
  const now = 1_792_577_100;
  const raw = JSON.stringify({ id: "evt_1", type: "export.ready", test: false, created_at: "2026-10-21T10:05:00Z", data: { export_id: "00000000-0000-4000-8000-000000000001", feed_id: fixtureFeeds[0].id, row_count: 6, download_url: "https://storage.example/signed", download_expires_at: new Date(Date.now() + 3600_000).toISOString() } });
  it("accepts a valid v1 signature and rejects tampered, stale, malformed or missing ones", () => {
    const sig = signDataMoon(SECRET, String(now), raw);
    expect(verifyDataMoonSignature(raw, { timestamp: String(now), signature: sig }, SECRET, now)).toEqual({ ok: true });
    expect(verifyDataMoonSignature(raw + " ", { timestamp: String(now), signature: sig }, SECRET, now)).toMatchObject({ ok: false, reason: "bad_signature" });
    expect(verifyDataMoonSignature(raw, { timestamp: String(now), signature: sig }, "whsec_other", now)).toMatchObject({ ok: false, reason: "bad_signature" });
    expect(verifyDataMoonSignature(raw, { timestamp: String(now), signature: sig }, SECRET, now + 301)).toMatchObject({ ok: false, reason: "stale_timestamp" });
    expect(verifyDataMoonSignature(raw, { timestamp: "abc", signature: sig }, SECRET, now)).toMatchObject({ ok: false, reason: "bad_timestamp" });
    expect(verifyDataMoonSignature(raw, { timestamp: String(now) }, SECRET, now)).toMatchObject({ ok: false, reason: "missing_headers" });
    expect(sig).toMatch(/^v1=[0-9a-f]{64}$/);
  });
  it("end to end: unsigned test ignored, unsigned real rejected, signed queued once, duplicates and foreign feeds rejected", async () => {
    process.env.DATAMOON_ENABLED = "true"; process.env.DATAMOON_INTENT_ENABLED = "true"; process.env.DATAMOON_INTENT_WEBHOOK_SECRET = SECRET;
    process.env.DATAMOON_FEED_BRAND_MAP = JSON.stringify({ [fixtureFeeds[0].id]: "stonecraft", [FOREIGN_FEED_ID]: "deckcraft" });
    const ts = String(Math.floor(Date.now() / 1000));
    const test = JSON.stringify({ id: "evt_test", type: "export.ready", test: true, created_at: "", data: { export_id: "x", feed_id: null, row_count: 0, download_url: null, download_expires_at: null } });
    expect(await handleExportWebhook(test, {})).toEqual([200, { ok: true, test: true, ingested: false }]);
    expect((await handleExportWebhook(raw, {}))[0]).toBe(401);
    expect((await handleExportWebhook(raw, { id: "evt_1", timestamp: ts, signature: "v1=" + "0".repeat(64) }))[0]).toBe(401);
    const sig = signDataMoon(SECRET, ts, raw);
    expect(await handleExportWebhook(raw, { id: "evt_1", timestamp: ts, signature: sig })).toEqual([200, { ok: true, queued: true }]);
    expect(await handleExportWebhook(raw, { id: "evt_1", timestamp: ts, signature: sig })).toEqual([200, { ok: true, duplicate: true }]);
    expect((await listJobs()).filter((j) => j.kind === "datamoon.import")).toHaveLength(1);
    const foreign = raw.replace(fixtureFeeds[0].id, FOREIGN_FEED_ID).replace("evt_1", "evt_2");
    const r = await handleExportWebhook(foreign, { id: "evt_2", timestamp: ts, signature: signDataMoon(SECRET, ts, foreign) });
    expect(r[0]).toBe(202); expect(r[1]).toMatchObject({ ingested: false, reason: "feed_not_mapped_to_brand" });
    expect((await listJobs()).filter((j) => j.kind === "datamoon.import")).toHaveLength(1);
  });
});

describe("recipe compliance (Boston/SE Florida only, no sensitive targeting)", () => {
  it("accepts a compliant US recipe", () => {
    const p = recipeInputSchema.safeParse(goodRecipe()); expect(p.success).toBe(true);
    expect(complianceIssues(p.data!)).toEqual([]);
  });
  it("rejects non-StoneCraft geography, ethnicity wording, sensitive or financial fields and bundles", () => {
    expect(recipeInputSchema.safeParse(goodRecipe({ market: "US" })).success).toBe(false);
    const bad = (o: Record<string, unknown>) => complianceIssues(recipeInputSchema.parse(goodRecipe(o)));
    expect(bad({ name: "Hispanic homeowners in Boston" }).join(" ")).toMatch(/ethnicity/);
    expect(bad({ filters: [{ api: "intent_consumer", field: "individual_core.ethnicity.value", operator: "eq", value: "x" }] }).join(" ")).toMatch(/sensitive/);
    expect(bad({ filters: [{ api: "main", field: "income_range", operator: "in", value: ["$250,000+"] }] }).join(" ")).toMatch(/financial/);
    expect(bad({ enrichmentBundles: ["financial"] }).join(" ")).toMatch(/not permitted/);
    expect(bad({ purpose: "Blast an SMS campaign to everyone" }).join(" ")).toMatch(/SMS/);
    expect(bad({ destinations: ["ads_customer_list"] }).join(" ")).toMatch(/Ads customer-list/);
    expect(bad({ topics: [{ kind: "b2c", id: 99, name: "Real estate", synthetic: false }] }).join(" ")).toMatch(/confirmedAt/);
  });
  it("enforces documented constraints: ≤5 topics, lookback ≤14 days", () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ kind: "b2c", id: i, name: `t${i}`, synthetic: true }));
    expect(recipeInputSchema.safeParse(goodRecipe({ topics: six })).success).toBe(false);
    expect(recipeInputSchema.safeParse(goodRecipe({ lookbackDays: 30 })).success).toBe(false);
  });
  it("approvals are owner-only and blocked without a record ceiling", async () => {
    const r = await createRecipe(owner, goodRecipe()); expect(r.ok).toBe(true);
    const id = (r as { data: Recipe }).data.id;
    expect((await recipeAction(owner, id, "submit")).ok).toBe(true);
    expect(await recipeAction(marketer, id, "approve")).toMatchObject({ ok: false, status: 403 });
    expect((await recipeAction(owner, id, "approve")).ok).toBe(true);
    expect(await recipeAction(marketer, id, "approve_export")).toMatchObject({ ok: false, status: 403 });
    // Synthetic recipe (fixtures, no billing): export approval does not need a ceiling.
    expect((await recipeAction(owner, id, "approve_export")).ok).toBe(true);
    expect((await recipeAction(owner, id, "approve_crm_sync")).ok).toBe(true);
    // Live recipes: blocked with no ceiling, and above the ceiling.
    const live = { ...(r as { data: Recipe }).data, synthetic: false };
    expect(approvalIssues(live, { recordCeiling: 0 }, "export").join(" ")).toMatch(/DATAMOON_RECORD_CEILING/);
    expect(approvalIssues({ ...live, maxRecords: 900 }, { recordCeiling: 500 }, "export").join(" ")).toMatch(/exceeds/);
    expect(approvalIssues({ ...live, maxRecords: 100 }, { recordCeiling: 500 }, "export")).toEqual([]);
  });
  it("prohibited targeting is refused outright (not saved as a draft), including on update", async () => {
    const before = (await listRecipes()).length;
    expect(await createRecipe(owner, goodRecipe({ purpose: "Reach Hispanic homeowners by ethnicity" }))).toMatchObject({ ok: false, status: 422 });
    expect(await createRecipe(owner, goodRecipe({ filters: [{ api: "intent_consumer", field: "individual_core.ethnicity.value", operator: "eq", value: "x" }] }))).toMatchObject({ ok: false, status: 422 });
    expect((await listRecipes()).length).toBe(before);
    const ok = (await createRecipe(owner, goodRecipe())) as { data: Recipe };
    expect(await recipeAction(owner, ok.data.id, "update", { notes: "target retirees over 55" })).toMatchObject({ ok: false, status: 422 });
  });
  it("synthetic run → queued import → vendor prospects stored separately, locked to the recipe market", async () => {
    process.env.DATAMOON_RECORD_CEILING = "500";
    const r = (await createRecipe(owner, goodRecipe())) as { data: Recipe };
    for (const a of ["submit", "approve", "approve_export"]) expect((await recipeAction(owner, r.data.id, a)).ok).toBe(true);
    const run = await recipeAction(owner, r.data.id, "run"); expect(run).toMatchObject({ ok: true, data: { synthetic: true } });
    const { processDue } = await import("@/lib/ops/outbox"); const { handlers } = await import("@/lib/ops/handlers");
    const res = await processDue(handlers); expect(res.done).toBe(1);
    const contacts = await listVendorContacts();
    // Boston recipe: only the MA rows (02116, 02139) are accepted; FL/NY fixture rows are rejected as out_of_market.
    expect(contacts.length).toBe(2); expect(contacts.every((c) => c.synthetic && c.provenance === "DataMoon" && c.brand === "stonecraft" && c.market === "boston" && c.state === "ma")).toBe(true);
  });
});

describe("quota / credit guard", () => {
  const base = { requested: 100, ceiling: 500, monthlyBudget: 1000, monthUsed: 0, credits: { record_limit: 1000, records_used: 0, remaining: 1000 } };
  it("allows within limits and refuses every unsafe case", () => {
    expect(checkQuota(base)).toEqual({ ok: true });
    expect(checkQuota({ ...base, ceiling: 0 })).toMatchObject({ ok: false });
    expect(checkQuota({ ...base, requested: 600 })).toMatchObject({ ok: false });
    expect(checkQuota({ ...base, monthUsed: 950 })).toMatchObject({ ok: false });
    expect(checkQuota({ ...base, credits: null })).toMatchObject({ ok: false });
    expect(checkQuota({ ...base, credits: { record_limit: 1000, records_used: 990, remaining: 10 } }).ok).toBe(false);
    expect(checkQuota({ ...base, feedRemaining: 5 }).ok).toBe(false);
    expect(checkQuota({ ...base, credits: { record_limit: null, records_used: 0, remaining: null } })).toEqual({ ok: true });
  });
});

describe("importer: dry run, rejection, dedupe, suppression", () => {
  it("normalises and rejects non-US or invalid rows", () => {
    expect(normaliseRow({ contact_id: "id_3f2a8d1b9c0e5f47", personal_state: "NY", contact_country: "US", personal_emails: "A@Example.test" })).toMatchObject({ ok: true, v: { email: "a@example.test", state: "ny" } });
    expect(normaliseRow({ contact_id: "id_3f2a8d1b9c0e5f47", contact_country: "GH" })).toMatchObject({ ok: false, reason: "non_us_record" });
    expect(normaliseRow({ contact_id: "id_3f2a8d1b9c0e5f47", personal_state: "Greater Accra" })).toMatchObject({ ok: false, reason: "non_us_record" });
    expect(normaliseRow({ contact_id: "12345" })).toMatchObject({ ok: false, reason: "invalid_contact_id" });
  });
  it("dry run stores nothing; commit dedupes and honours suppressions", async () => {
    const csv = parseCsv(`contact_id,first_name,personal_emails,personal_state,contact_country\nid_0000000000000001,A,a@example.test,ny,US\nid_0000000000000001,A,a@example.test,ny,US\nid_0000000000000002,B,"b@example.test",tx,US\nid_0000000000000003,C,c@example.test,ga,US\nbad,D,d@example.test,ny,US\nid_0000000000000004,E,e@example.test,,GH`);
    await addSuppression({ email: "c@example.test", reason: "opt_out", by: "t" });
    const dry = await importRows(csv, { exportId: "e", recipeId: "r", by: "t", dryRun: true, synthetic: true });
    expect(dry).toMatchObject({ accepted: 2, duplicates: 1, suppressed: 1, rejected: 2 });
    expect(await listVendorContacts()).toHaveLength(0);
    await importRows(csv, { exportId: "e", recipeId: "r", by: "t", dryRun: false, synthetic: true });
    expect(await listVendorContacts()).toHaveLength(2);
    const again = await importRows(csv, { exportId: "e2", recipeId: "r", by: "t", dryRun: false, synthetic: true });
    expect(again.accepted).toBe(0);
  });
});

describe("GHL mapping for vendor prospects", () => {
  const v = { id: randomUUID(), brand: "stonecraft", market: "boston", contactId: "id_0000000000000009", recipeId: "r1", importId: "i1", exportId: "e1", email: "p@example.test", state: "ny", status: "imported" as const, synthetic: true, provenance: "DataMoon" as const, importedAt: "2026-11-14T00:00:00Z", expiresAt: "2099-01-01T00:00:00Z" };
  const recipe = { id: "r1-0000-0000", persona: "residential_homeowner", market: "boston", kind: "b2c", destinations: ["ghl_stonecraft_boston"], crmSyncApproval: { by: "owner", at: "" } } as unknown as Recipe;
  it("tags prospects no-auto-outreach with no consent tags and no phone", () => {
    const p = vendorGhlPayload(v, recipe);
    expect(p.tags).toEqual(expect.arrayContaining(["datamoon-prospect", "no-auto-outreach"]));
    expect(p.tags.some((t) => t.startsWith("consent-"))).toBe(false);
    expect(JSON.stringify(p)).not.toMatch(/phone/i);
    expect(p.fields.dm_provenance).toMatch(/no opt-in/);
  });
  it("blocks sync while the flag is off, without owner approval, for suppressed contacts, or synthetic on production", () => {
    expect(syncBlockers(v, recipe, { ...dmConfig(), ghlSyncEnabled: false })).toMatch(/OFF|off/);
    const cfg = { ...dmConfig(), ghlSyncEnabled: true };
    expect(syncBlockers(v, recipe, cfg)).toBeNull();
    expect(syncBlockers(v, { ...recipe, crmSyncApproval: undefined }, cfg)).toMatch(/approval/);
    expect(syncBlockers({ ...v, status: "suppressed" }, recipe, cfg)).toMatch(/suppressed/);
    process.env.VERCEL_ENV = "production"; expect(syncBlockers(v, recipe, cfg)).toMatch(/production/);
  });
});

describe("noop adapter fixtures", () => {
  it("are labelled synthetic and never pretend to be live", async () => {
    const a = new NoopDataMoonAdapter();
    expect((await a.listAvailableFeeds()).every((f) => f.synthetic && f.description.startsWith("[SYNTHETIC]"))).toBe(true);
    expect((await a.getCreditStatus()).synthetic).toBe(true);
    const r = recipeInputSchema.parse(goodRecipe()) as unknown as Recipe;
    expect((await a.preview(r)).synthetic).toBe(true);
    await saveRecipe({ ...(r as Recipe), id: randomUUID(), brand: "stonecraft" } as Recipe); await indexRecipe("x");
  });
});

describe("StoneCraft Boston / Southeast Florida recipes", () => {
  it("templates exist for both markets, are market-locked and pass compliance", async () => {
    const { RECIPE_TEMPLATES, targetingViolations } = await import("@/lib/datamoon/recipes");
    expect(RECIPE_TEMPLATES.map((t) => t.market).sort()).toEqual(["boston", "boston", "south-florida", "south-florida"]);
    for (const t of RECIPE_TEMPLATES) expect(t.states).toEqual(t.market === "boston" ? ["ma"] : ["fl"]);
    const { createFromTemplate } = await import("@/lib/datamoon/service");
    for (const t of RECIPE_TEMPLATES) {
      const r = await createFromTemplate(owner, t.key);
      expect(r.ok).toBe(true);
      if (r.ok) { expect(targetingViolations(r.data)).toEqual([]); expect(r.data.synthetic).toBe(true); expect(r.data.status).toBe("draft"); }
    }
  });
  it("refuses cross-market geography and the wrong market's GHL destination", () => {
    expect(complianceIssues(recipeInputSchema.parse(goodRecipe({ states: ["fl"] }))).join(" ")).toMatch(/market|state/i);
    expect(complianceIssues(recipeInputSchema.parse(goodRecipe({ destinations: ["admin_review_only", "ghl_stonecraft_fl"] }))).join(" ")).toMatch(/GHL|destination/i);
  });
  it("FL import accepts only Palm Beach / Broward ZIP3 rows", async () => {
    const rows = [{ contact_id: "id_00000000000000f1", personal_state: "fl", personal_zip: "33480", contact_country: "US" }, { contact_id: "id_00000000000000f2", personal_state: "fl", personal_zip: "32801", contact_country: "US" }, { contact_id: "id_00000000000000f3", personal_state: "ma", personal_zip: "02116", contact_country: "US" }];
    const s = await importRows(rows, { exportId: "e", recipeId: "r", by: "t", dryRun: true, synthetic: true, market: "south-florida" });
    expect(s).toMatchObject({ accepted: 1, rejected: 2 });
    expect(s.reasons.out_of_market).toBe(2);
  });
});
