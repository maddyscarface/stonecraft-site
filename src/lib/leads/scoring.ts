import type { LeadInput } from "./schema";

/**
 * Editable lead scoring. Admin overrides are stored in KV (see /admin/settings).
 * Score informs routing and follow-up urgency, not whether a lead is answered.
 */
export type ScoringConfig = {
  hot: number;
  warm: number;
  points: Record<string, number>;
};

export const defaultScoring: ScoringConfig = {
  hot: 55,
  warm: 30,
  points: {
    in_active_zone: 15,
    out_of_area: -30,
    photos_1plus: 15,
    photos_3plus: 10,
    timeline_asap: 15,
    timeline_2weeks: 10,
    goal_selling: 15,
    goal_rental_turn: 10,
    multi_surface: 10,
    renter_landlord_approved: 20,
    renter_landlord_outreach: 8,
    renter_roommates_2plus: 5,
    landlord_units_5plus: 20,
    landlord_pm: 10,
    commercial_base: 30,
    commercial_decision_maker: 15,
    commercial_budget_25k_plus: 15,
    commercial_timeline_90d: 10,
    commercial_multi_building: 10,
    sms_consent: 3,
  },
};

export type Score = { score: number; tier: "hot" | "warm" | "cold"; reasons: string[] };

export function scoreLead(lead: LeadInput, ctx: { inActiveZone: boolean; inMarket: boolean }, cfg: ScoringConfig = defaultScoring): Score {
  const p = cfg.points;
  const reasons: string[] = [];
  let s = 0;
  const add = (key: string, why: string) => { const v = p[key] ?? 0; if (v) { s += v; reasons.push(`${v > 0 ? "+" : ""}${v} ${why}`); } };

  if (ctx.inActiveZone) add("in_active_zone", "in an active scheduling zone");
  if (!ctx.inMarket) add("out_of_area", "outside service area");
  if (lead.photoKeys.length >= 1) add("photos_1plus", "photos uploaded");
  if (lead.photoKeys.length >= 3) add("photos_3plus", "3+ photos");
  if (lead.smsConsent) add("sms_consent", "SMS opt-in");

  switch (lead.variant) {
    case "residential":
      if (lead.timeline === "asap") add("timeline_asap", "wants it ASAP");
      if (lead.timeline === "2weeks") add("timeline_2weeks", "within 2 weeks");
      if (lead.goal === "selling") add("goal_selling", "preparing to sell");
      if (lead.goal === "rental_turn") add("goal_rental_turn", "rental turn");
      if (lead.surfaces.length >= 2) add("multi_surface", "multiple surfaces");
      break;
    case "renter":
      if (lead.landlordApprovalStatus === "approved") add("renter_landlord_approved", "landlord already approved");
      if (lead.landlordOutreachConsent) add("renter_landlord_outreach", "authorised landlord outreach");
      if (lead.roommates >= 2) add("renter_roommates_2plus", "cost shared by 2+ roommates");
      if (lead.landlordApprovalStatus === "declined") { s -= 25; reasons.push("-25 landlord declined"); }
      break;
    case "landlord":
      if (lead.units >= 5) add("landlord_units_5plus", "5+ units");
      if (lead.isPropertyManager) add("landlord_pm", "property manager");
      break;
    case "commercial":
      add("commercial_base", "commercial request");
      if (lead.decisionRole === "decision_maker") add("commercial_decision_maker", "decision maker");
      if (lead.budget && ["25to75k", "75to250k", "250kplus"].includes(lead.budget)) add("commercial_budget_25k_plus", "budget $25k+");
      if (lead.timeline && ["30d", "90d"].includes(lead.timeline)) add("commercial_timeline_90d", "timeline within 90 days");
      if (lead.buildings > 1) add("commercial_multi_building", "multiple buildings");
      break;
  }
  const tier = s >= cfg.hot ? "hot" : s >= cfg.warm ? "warm" : "cold";
  return { score: s, tier, reasons };
}
