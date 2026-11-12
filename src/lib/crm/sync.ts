/**
 * Website ↔ GoHighLevel ↔ SmartOps synchronisation rules.
 *
 * System of record (prevents duplicate contacts, jobs and payments):
 *   - Contact & opportunity (pre-sale): GoHighLevel
 *   - Appointment (estimate): GoHighLevel calendar (until SmartOps scheduling is live, then SmartOps → GHL mirror)
 *   - Job, work order, tech assignment, job photos: SmartOps
 *   - Customer payment: Stripe via SmartOps (GHL receives a "paid" stage update only — never creates a second invoice)
 *
 * Every record carries `sc_external_id`, derived deterministically from normalised email/phone,
 * so retries and cross-system writes upsert instead of duplicating.
 */
import { createHash } from "node:crypto";

export const normEmail = (e?: string) => (e ?? "").trim().toLowerCase();
export function normPhone(p?: string) {
  const d = (p ?? "").replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return d ? `+${d}` : "";
}

export function externalContactId(email?: string, phone?: string) {
  const key = normEmail(email) || normPhone(phone);
  return `sc_c_${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
}

/**
 * One OPEN opportunity per contact per pipeline. A repeat submission updates the open one
 * (GHL /opportunities/upsert matches on contact + pipeline). A new opportunity is created only
 * after the previous one is Won/Lost/Closed.
 */
export function opportunityKey(contactExternalId: string, pipeline: string) {
  return `${contactExternalId}:${pipeline}`;
}

export const OWNERSHIP = {
  contact: "ghl",
  opportunity: "ghl",
  estimate_appointment: "ghl",
  job: "smartops",
  work_order: "smartops",
  payment: "smartops",
  tech_payout: "smartops",
  review_request: "ghl",
} as const;

/**
 * GHL pipelines and stages — exactly as spec §3. Residential and commercial opportunities live in separate
 * pipelines (property managers / portfolios go to the commercial pipeline, tagged segment:property-portfolio).
 */
export const PIPELINES = {
  residential: ["New", "Photos requested", "Photos received", "Qualified", "Estimate visit", "Proposal", "Won", "Lost", "Scheduled", "Completed"],
  commercial: ["Inbound/outreach", "Facility qualified", "Site walkthrough", "Scope", "Bid/proposal", "Awarded", "Scheduled", "Closeout", "Recurring program"],
} as const;
export type GhlPipeline = keyof typeof PIPELINES;

/** Internal routing track → GHL pipeline. */
export const ghlPipeline = (track: "residential" | "commercial" | "property_manager"): GhlPipeline => (track === "residential" ? "residential" : "commercial");

/**
 * CRM stage → measurement events (spec §4): assessment_start and photos_received fire in the browser;
 * the rest are sent server-side from the CRM webhook when the opportunity moves.
 * Keys are normalised stage names (lowercase, non-letters → "_").
 */
export type StageEvent = { ga4: string; meta?: string; googleAds?: string };
export const STAGE_EVENTS: Record<string, StageEvent | undefined> = {
  // residential
  photos_received: { ga4: "photos_received" },
  qualified: { ga4: "qualified_lead", meta: "QualifiedLead", googleAds: "qualified_lead" },
  proposal: { ga4: "estimate_sent", meta: "EstimateSent", googleAds: "estimate_sent" },
  won: { ga4: "job_won", meta: "Purchase", googleAds: "job_won" },
  completed: { ga4: "completed_revenue", meta: "CompletedRevenue", googleAds: "completed_revenue" },
  // commercial
  facility_qualified: { ga4: "qualified_lead", meta: "QualifiedLead", googleAds: "qualified_lead" },
  site_walkthrough: { ga4: "commercial_walkthrough_booked", meta: "Schedule", googleAds: "commercial_walkthrough_booked" },
  bid_proposal: { ga4: "estimate_sent", meta: "EstimateSent", googleAds: "estimate_sent" },
  awarded: { ga4: "job_won", meta: "Purchase", googleAds: "job_won" },
  closeout: { ga4: "completed_revenue", meta: "CompletedRevenue", googleAds: "completed_revenue" },
};

/** Exact-key match first; then the longest key contained in the stage name (so "facility_qualified" beats "qualified"). */
export function stageEvent(stage: string): StageEvent | undefined {
  const k = stage.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
  if (STAGE_EVENTS[k]) return STAGE_EVENTS[k];
  const hit = Object.keys(STAGE_EVENTS).filter((x) => k.includes(x)).sort((a, b) => b.length - a.length)[0];
  return hit ? STAGE_EVENTS[hit] : undefined;
}

/** Events that carry revenue into attribution reporting. */
export const REVENUE_EVENTS = new Set(["job_won", "completed_revenue"]);

/** First stage an inbound web lead lands in. Commercial inbound skips outbound-only stages. */
export function entryStage(track: "residential" | "commercial" | "property_manager", hasPhotos: boolean) {
  if (ghlPipeline(track) === "residential") return hasPhotos ? "Photos received" : "New";
  return "Inbound/outreach";
}
