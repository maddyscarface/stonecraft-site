/**
 * DataMoon feature flags and credentials (server-only; never NEXT_PUBLIC). Everything defaults OFF.
 * Two separate API families with separate keys (docs re-checked 2026-11-14):
 *   Main REST   https://app.datamoon.com/api/v2  — module key `X-Api-Key` (/v2/m or /v2/ext audiences),
 *               legacy `api_key` (enrichment + pixel results), public topic search (no key).
 *   Intent API  https://intentapi.datamoon.com   — `X-API-Key` (feeds, exports, enrichment, org credits, webhooks).
 * "Configured" never means "verified live": the console shows Not connected until owner-approved test evidence exists.
 */
const on = (v?: string) => v === "true" || v === "1";
const int = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : d; };

export const dmConfig = () => ({
  enabled: on(process.env.DATAMOON_ENABLED),
  mainEnabled: on(process.env.DATAMOON_MAIN_API_ENABLED),
  intentEnabled: on(process.env.DATAMOON_INTENT_ENABLED),
  /** Per-brand audience activation (exports / CRM sync). Separate from API access. */
  activationEnabled: on(process.env.DATAMOON_AUDIENCE_ACTIVATION_STONECRAFT),
  ghlSyncEnabled: on(process.env.DATAMOON_GHL_SYNC_ENABLED),
  mainTier: process.env.DATAMOON_MAIN_TIER === "module" ? ("m" as const) : ("ext" as const),
  mainBase: process.env.DATAMOON_MAIN_BASE_URL || "https://app.datamoon.com/api/v2",
  intentBase: process.env.DATAMOON_INTENT_BASE_URL || "https://intentapi.datamoon.com",
  hasModuleKey: Boolean(process.env.DATAMOON_MAIN_MODULE_KEY),
  hasLegacyKey: Boolean(process.env.DATAMOON_LEGACY_KEY),
  hasIntentKey: Boolean(process.env.DATAMOON_INTENT_KEY),
  hasWebhookSecret: Boolean(process.env.DATAMOON_INTENT_WEBHOOK_SECRET),
  /** Hard ceiling of records per single export/run, and per calendar month (owner budget). 0 = nothing allowed. */
  recordCeiling: int(process.env.DATAMOON_RECORD_CEILING, 0),
  monthlyBudget: int(process.env.DATAMOON_MONTHLY_RECORD_BUDGET, 0),
  retentionDays: int(process.env.DATAMOON_RETENTION_DAYS, 90),
  /** JSON {"<feed uuid>":"stonecraft"} — feeds this deployment is allowed to ingest. */
  feedBrandMap: (() => { try { return JSON.parse(process.env.DATAMOON_FEED_BRAND_MAP || "{}") as Record<string, string>; } catch { return {}; } })(),
  /** Synthetic fixtures are allowed everywhere except production (unless explicitly allowed for a demo). */
  fixturesAllowed: process.env.VERCEL_ENV !== "production" || on(process.env.DATAMOON_ALLOW_FIXTURES_IN_PRODUCTION),
});

export type DmStatus = "disabled" | "not_connected" | "configured_unverified";
export function dmStatus() {
  const c = dmConfig();
  const main: DmStatus = !c.enabled || !c.mainEnabled ? "disabled" : c.hasModuleKey ? "configured_unverified" : "not_connected";
  const intent: DmStatus = !c.enabled || !c.intentEnabled ? "disabled" : c.hasIntentKey ? "configured_unverified" : "not_connected";
  return {
    main, intent,
    topicSearch: c.enabled && c.mainEnabled ? "public_endpoint_enabled" : "fixtures_only",
    webhook: c.enabled && c.intentEnabled && c.hasWebhookSecret ? "accepting_signed" : "disabled",
    activation: c.activationEnabled ? "flag_on" : "off",
    ghlSync: c.ghlSyncEnabled ? "flag_on" : "off",
    mainTier: c.mainTier, recordCeiling: c.recordCeiling, monthlyBudget: c.monthlyBudget, retentionDays: c.retentionDays,
    fixtures: c.fixturesAllowed ? "synthetic_fixtures_available" : "off",
    label: main === "disabled" && intent === "disabled" ? "Not connected (flags off)" : "Not verified live",
  };
}
