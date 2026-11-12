/**
 * StoneCraft GoHighLevel configuration — kept separate from every other company.
 *
 * StoneCraft runs its OWN pipelines, per market, so Boston and Southeast Florida can live in
 * two GHL sub-accounts (GHL_LOCATION_ID_BOSTON / GHL_LOCATION_ID_FL) or share one (set both
 * location ids to the same value and use distinct pipeline ids).
 *
 * Every id is read from env at runtime; nothing is hard-coded. With no token the CRM layer runs
 * in dry-run/log mode and returns the exact payloads it would have sent.
 *
 * Env naming (MARKET = BOSTON | FL):
 *   GHL_<MARKET>_PIPELINE_RESIDENTIAL | _COMMERCIAL | _PROPERTY_MANAGER        pipeline ids
 *   GHL_<MARKET>_STAGE_<STAGE_NAME>                                             stage ids (e.g. GHL_BOSTON_STAGE_PHOTOS_RECEIVED)
 *   GHL_<MARKET>_WORKFLOW_<HOOK>                                                workflow ids for follow-up hooks (see FOLLOW_UP_HOOKS)
 *   GHL_CUSTOM_FIELD_IDS   optional JSON {"sc_lead_score":"<fieldId>", ...}; without it fields are sent by key
 */
export const BRAND_TAG = "brand:stonecraft";

export const MARKET_ENV = { boston: "BOSTON", "south-florida": "FL" } as const;

/**
 * Automated follow-up hooks. Each hook maps to one GHL workflow per market; the workflow owns the
 * actual messages (email/SMS copy, timing). SMS steps must check the contact's sc_sms_consent field.
 */
export const FOLLOW_UP_HOOKS = {
  new_lead: "Instant acknowledgement + owner alert (every lead)",
  photos_missing: "Ask for 3–4 photos (no photos uploaded)",
  hot_lead: "Speed-to-lead: call/text task within 5 minutes during business hours",
  nurture: "Cold/warm nurture: restoration education sequence",
  renter_landlord: "Landlord-approval help for renters",
  property_manager: "Unit-turn / portfolio sequence for landlords & PMs",
  commercial: "Commercial: site-walk booking + capabilities PDF",
  prelaunch_waitlist: "Pre-launch market: availability waitlist, never auto-book",
  out_of_area: "Polite out-of-area reply",
} as const;
export type FollowUpHook = keyof typeof FOLLOW_UP_HOOKS;

/** Lead-score bands synced to GHL as tags so smart lists and workflows can branch on them. */
export function scoreBand(score: number) {
  if (score >= 80) return "80+";
  if (score >= 55) return "55-79";
  if (score >= 30) return "30-54";
  return "0-29";
}
