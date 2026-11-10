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

/** CRM stage → conversion event mapping (sent server-side from the CRM webhook). */
export const STAGE_EVENTS: Record<string, { ga4: string; meta?: string; googleAds?: string } | undefined> = {
  qualified: { ga4: "qualified_lead", meta: "QualifiedLead", googleAds: "qualified_lead" },
  estimate_scheduled: { ga4: "appointment_booked", meta: "Schedule", googleAds: "appointment_booked" },
  site_walk: { ga4: "appointment_booked", meta: "Schedule", googleAds: "appointment_booked" },
  proposal_sent: { ga4: "quote_sent" },
  won: { ga4: "job_won", meta: "Purchase", googleAds: "job_won" },
  contract: { ga4: "job_won", meta: "Purchase", googleAds: "job_won" },
  paid: { ga4: "purchase", meta: "Purchase", googleAds: "purchase" },
};

export const PIPELINES = {
  residential: ["New Lead", "Photos Requested", "Photos Received", "Qualified", "Estimate Scheduled", "Proposal Sent", "Won", "Job Scheduled", "Work Complete", "Paid", "Review"],
  commercial: ["Target Account", "Contact Identified", "Outreach Started", "Meeting Booked", "Site Walk", "Scope Development", "Proposal", "Procurement/Approval", "Contract", "Work Scheduled", "Completed", "Renewal"],
  property_manager: ["Partner Lead", "Portfolio Review", "Pilot Unit", "Approved Vendor", "Recurring Work", "Expansion"],
} as const;

/** First stage an inbound web lead lands in. Commercial inbound skips outbound-only stages. */
export function entryStage(pipeline: keyof typeof PIPELINES, hasPhotos: boolean) {
  if (pipeline === "residential") return hasPhotos ? "Photos Received" : "New Lead";
  if (pipeline === "commercial") return "Contact Identified";
  return "Partner Lead";
}
