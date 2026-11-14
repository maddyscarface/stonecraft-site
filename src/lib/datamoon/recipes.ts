import { z } from "zod";

/**
 * Audience recipe manager — schema + compliance validation (pure; unit-tested).
 * StoneCraft rules (03_STONECRAFT_PHASE4 + BRIEF_COMMON): recipes are scoped to ONE market — Greater Boston (MA)
 * or Southeast Florida (Palm Beach / Broward, FL) — and run as separate pipelines. No sensitive-trait targeting
 * (ethnicity, religion, nationality, health, age/seniority, family status, income/credit/net worth); no financial-
 * eligibility modelling; never auto-enrol identified people into SMS/email. Topic ids must come from catalog
 * discovery (never invented). Mock fixtures only until the owner buys access.
 */
export const US_STATES = ["ak","al","ar","az","ca","co","ct","de","fl","ga","hi","ia","id","il","in","ks","ky","la","ma","md","me","mi","mn","mo","ms","mt","nc","nd","ne","nh","nj","nm","nv","ny","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","va","vt","wa","wi","wv","wy"] as const;
export const markets = ["boston", "south-florida"] as const;
export type DmMarket = (typeof markets)[number];
/** Allowed state + ZIP3 geography per market (editable; FL ZIP3s match src/config/florida-areas.ts). */
export const MARKET_GEO: Record<DmMarket, { states: string[]; zip3: string[]; label: string }> = {
  boston: { states: ["ma"], zip3: ["017", "018", "019", "020", "021", "022", "024"], label: "Greater Boston, MA" },
  "south-florida": { states: ["fl"], zip3: ["330", "333", "334"], label: "Southeast Florida (Palm Beach + Broward), FL" },
};
export const destinations = ["admin_review_only", "ghl_stonecraft_boston", "ghl_stonecraft_fl", "ads_customer_list"] as const;
export const ghlDestinationFor = (m: DmMarket) => (m === "boston" ? "ghl_stonecraft_boston" : "ghl_stonecraft_fl");
export const recipeStatuses = ["draft", "submitted", "approved", "paused", "retired"] as const;
export const personas = ["residential_homeowner", "residential_condo_owner", "landlord_small_portfolio", "commercial_facilities", "property_management", "hospitality_hoa"] as const;

export const PROHIBITED_FIELD = /(ethnic|race|racial|religio|national|ancestr|origin|language|politic|donor|financial|credit|net_worth|income|gender|age_range|age\b|birth|married|marital|children|kids|health|medical|disab|sexual|senior|retire)/i;
export const PROHIBITED_TERMS = /(ethnic|diaspora|hispanic|latino|jewish|christian|muslim|religio|church|synagogue|mosque|immigrant|nationality|ancestr|heritage|\bseniors?\b|elderly|retiree|55\+|over 55|disab|pregnan|diagnos|wealthy|affluent|high.net.worth|credit score|income)/i;
export const PROHIBITED_BUNDLES = ["financial", "donor", "political", "health"];

export const topicRefSchema = z.object({
  kind: z.enum(["b2b", "b2c"]), id: z.union([z.string().min(1).max(64), z.number().int()]), name: z.string().min(1).max(160),
  confirmedAt: z.string().optional(), synthetic: z.boolean().default(false),
});
export const filterSchema = z.object({
  api: z.enum(["main", "intent_consumer", "intent_business"]),
  field: z.string().min(1).max(80), operator: z.string().min(1).max(20), value: z.unknown(),
  /** documented = listed in public main-API docs; discovered = returned by /intent/feeds/filters/{consumer|business}/fields for this org. */
  verification: z.enum(["documented", "discovered", "unverified"]).default("unverified"),
});

export const recipeInputSchema = z.object({
  name: z.string().trim().min(3).max(100),
  persona: z.enum(personas),
  kind: z.enum(["b2c", "b2b"]),
  api: z.enum(["main_audience", "intent_feed"]),
  market: z.enum(markets),
  states: z.array(z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.enum(US_STATES))).max(51).default([]),
  topics: z.array(topicRefSchema).max(5).default([]),
  feedId: z.string().uuid().optional(),
  lookbackDays: z.number().int().min(1).max(14).default(14),
  filters: z.array(filterSchema).max(12).default([]),
  enrichmentBundles: z.array(z.string().max(40)).max(6).default([]),
  maxRecords: z.number().int().min(1).max(1_000_000),
  purpose: z.string().trim().min(10).max(400),
  legalBasis: z.string().trim().min(5).max(300),
  destinations: z.array(z.enum(destinations)).min(1).default(["admin_review_only"]),
  cta: z.string().trim().max(200).optional(),
  notes: z.string().max(1000).optional(),
});
export type RecipeInput = z.infer<typeof recipeInputSchema>;
export type Approval = { by: string; at: string; maxRecords?: number };
export type Recipe = RecipeInput & {
  id: string; brand: string; status: (typeof recipeStatuses)[number]; owner: string; createdAt: string; updatedAt: string;
  estimatedCredits: number; lastRunAt?: string; exportApproval?: Approval; crmSyncApproval?: Approval; synthetic: boolean; version: number;
};

/** Returns a list of compliance problems (empty = OK). */
/** Hard violations: a recipe with any of these is refused outright (not even saved as a draft). */
export function targetingViolations(r: RecipeInput): string[] {
  const issues: string[] = [];
  const geo = MARKET_GEO[r.market];
  if (!geo) issues.push("Choose a StoneCraft market (boston or south-florida).");
  else for (const st of r.states) if (!geo.states.includes(st)) issues.push(`State "${st.toUpperCase()}" is outside ${geo.label}. Boston and Southeast Florida recipes are separate.`);
  for (const f of r.filters) if (PROHIBITED_FIELD.test(f.field)) issues.push(`Filter field "${f.field}" targets a sensitive or financial-eligibility trait and is not allowed.`);
  const text = [r.name, r.purpose, r.legalBasis, r.cta ?? "", r.notes ?? "", ...r.topics.map((t) => t.name), ...r.filters.map((f) => JSON.stringify(f.value ?? ""))].join(" ");
  if (PROHIBITED_TERMS.test(text)) issues.push("Recipe text or topics reference a sensitive trait (ethnicity, religion, nationality, age/seniority, health, wealth/income). Use non-sensitive home-improvement / facilities topics only.");
  for (const b of r.enrichmentBundles) if (PROHIBITED_BUNDLES.includes(b.replace(/-/g, "_"))) issues.push(`Enrichment bundle "${b}" is not permitted for this brand.`);
  if (geo && r.destinations.some((d) => d.startsWith("ghl_") && d !== ghlDestinationFor(r.market))) issues.push("A recipe may only sync to its own market's GHL destination (Boston and Southeast Florida GHL locations are separate).");
  return issues;
}

export function complianceIssues(r: RecipeInput): string[] {
  const issues: string[] = targetingViolations(r);
  if (r.kind === "b2c" || r.kind === "b2b") { if (r.api === "main_audience" && r.topics.length === 0) issues.push("Main-API b2b/b2c audiences require at least one topic id from catalog discovery."); }
  if (r.api === "intent_feed" && !r.feedId) issues.push("Intent recipes need a feed id from GET /intent/feeds.");
  if (r.destinations.includes("ads_customer_list")) issues.push("Ads customer-list upload is blocked until the owner selects a platform and vendor terms permit it.");
  if (/sms|whatsapp|text message|cold email|auto.?enrol/i.test(`${r.purpose} ${r.cta ?? ""}`)) issues.push("Recipes may not plan unsolicited SMS/WhatsApp/email outreach.");
  if (r.topics.some((t) => !t.synthetic && !t.confirmedAt)) issues.push("Every live topic needs a confirmedAt timestamp from catalog discovery.");
  return issues;
}

/** Rough credit estimate: one record credit per exported row (intent docs: export creation reserves records). */
export const estimateCredits = (r: Pick<RecipeInput, "maxRecords">) => r.maxRecords;

/** Approval-time checks beyond compliance (owner-only action). */
export function approvalIssues(r: Recipe, cfg: { recordCeiling: number }, kind: "export" | "crm_sync"): string[] {
  const issues = complianceIssues(r);
  if (r.status !== "approved" && kind === "crm_sync" && !r.exportApproval) issues.push("Approve the export first.");
  if (kind === "export") {
    // Synthetic recipes never bill (fixtures only), so the owner ceiling is enforced for live recipes only.
    if (r.synthetic) { /* no billable export */ }
    else if (cfg.recordCeiling <= 0) issues.push("DATAMOON_RECORD_CEILING is 0 — set an owner-approved record ceiling before approving exports.");
    else if (r.maxRecords > cfg.recordCeiling) issues.push(`maxRecords ${r.maxRecords} exceeds the record ceiling ${cfg.recordCeiling}.`);
  }
  if (kind === "crm_sync" && !r.destinations.includes(ghlDestinationFor(r.market))) issues.push(`Recipe destinations do not include the ${r.market === "boston" ? "Boston" : "Southeast Florida"} GHL pipeline.`);
  if (r.destinations.some((d) => d.startsWith("ghl_") && d !== ghlDestinationFor(r.market))) issues.push("A recipe may only sync to its own market's GHL pipeline.");
  return issues;
}

/**
 * Pre-built StoneCraft recipe templates (Boston + Southeast Florida). Topics are SYNTHETIC hypotheses until topic
 * discovery returns real catalog ids; maxRecords is small and still capped by DATAMOON_RECORD_CEILING (default 0).
 */
export const RECIPE_TEMPLATES: (Omit<RecipeInput, "topics"> & { key: string; topicFixtureIds: string[] })[] = [
  { key: "boston-b2c-bath-refresh", name: "Boston homeowners — shower & grout restoration interest", persona: "residential_homeowner", kind: "b2c", api: "main_audience", market: "boston", states: ["ma"], topicFixtureIds: ["fx-b2c-3001", "fx-b2c-3002"], feedId: undefined, lookbackDays: 14, filters: [], enrichmentBundles: [], maxRecords: 250, purpose: "Admin review of Greater Boston homeowners researching bathroom tile, grout or shower restoration, for a first-party retargeting test.", legalBasis: "Vendor-attested opt-in data; owner to confirm terms before any outreach", destinations: ["admin_review_only"], cta: "Free photo assessment", notes: "Template. No SMS/email enrolment." },
  { key: "boston-b2b-facilities", name: "Boston facilities & property managers — hard-surface maintenance", persona: "commercial_facilities", kind: "b2b", api: "main_audience", market: "boston", states: ["ma"], topicFixtureIds: ["fx-b2b-4001", "fx-b2b-4002"], feedId: undefined, lookbackDays: 14, filters: [], enrichmentBundles: [], maxRecords: 150, purpose: "Admin review of Greater Boston facilities and property-management companies researching restroom or lobby floor maintenance.", legalBasis: "B2B legitimate interest; owner to confirm vendor terms", destinations: ["admin_review_only"], cta: "Commercial site assessment", notes: "Template. Company-level review first." },
  { key: "fl-b2c-condo-stone", name: "SE Florida condo owners — marble & tile restoration interest", persona: "residential_condo_owner", kind: "b2c", api: "main_audience", market: "south-florida", states: ["fl"], topicFixtureIds: ["fx-b2c-3002", "fx-b2c-3003"], feedId: undefined, lookbackDays: 14, filters: [], enrichmentBundles: [], maxRecords: 250, purpose: "Admin review of Palm Beach and Broward condo and home owners researching marble, travertine or tile restoration.", legalBasis: "Vendor-attested opt-in data; owner to confirm terms before any outreach", destinations: ["admin_review_only"], cta: "Free photo assessment", notes: "Template. Separate FL pipeline." },
  { key: "fl-b2b-hoa-hospitality", name: "SE Florida HOAs, hotels & managed buildings — common-area floors", persona: "hospitality_hoa", kind: "b2b", api: "main_audience", market: "south-florida", states: ["fl"], topicFixtureIds: ["fx-b2b-4002", "fx-b2b-4003"], feedId: undefined, lookbackDays: 14, filters: [], enrichmentBundles: [], maxRecords: 150, purpose: "Admin review of Palm Beach and Broward associations, hotels and managed buildings researching lobby, corridor or restroom tile maintenance.", legalBasis: "B2B legitimate interest; owner to confirm vendor terms", destinations: ["admin_review_only"], cta: "Commercial site assessment", notes: "Template. Separate FL pipeline." },
];
