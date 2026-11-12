import { FOLLOW_UP_HOOKS, MARKET_ENV, type FollowUpHook } from "@/config/crm";
import type { LeadInput } from "@/lib/leads/schema";
import type { Routing } from "@/lib/leads/routing";
import type { Score } from "@/lib/leads/scoring";

export type FollowUpStep = { hook: FollowUpHook; why: string; workflowEnv: string; workflowId?: string };

/**
 * Decide which GHL follow-up workflows a lead enters. Pure and deterministic (unit-tested);
 * the CRM adapter enrols the contact in each workflow whose id is configured.
 */
export function followUpPlan(lead: Pick<LeadInput, "variant" | "photoKeys"> & { isPropertyManager?: boolean }, routing: Pick<Routing, "marketId" | "marketStatus" | "pipeline">, score: Pick<Score, "tier">, env: Record<string, string | undefined> = process.env): FollowUpStep[] {
  const mk = routing.marketId ? MARKET_ENV[routing.marketId as keyof typeof MARKET_ENV] : undefined;
  const hooks: FollowUpHook[] = [];
  if (!mk) hooks.push("out_of_area");
  else {
    hooks.push("new_lead");
    if (routing.marketStatus === "pre-launch") hooks.push("prelaunch_waitlist");
    else {
      if (lead.variant === "commercial") hooks.push("commercial");
      else if (lead.variant === "landlord") hooks.push("property_manager");
      else if (lead.variant === "renter") hooks.push("renter_landlord");
      if (lead.variant !== "commercial" && lead.photoKeys.length === 0) hooks.push("photos_missing");
      hooks.push(score.tier === "hot" ? "hot_lead" : "nurture");
    }
  }
  return hooks.map((hook) => {
    const workflowEnv = `GHL_${mk ?? "BOSTON"}_WORKFLOW_${hook.toUpperCase()}`;
    return { hook, why: FOLLOW_UP_HOOKS[hook], workflowEnv, workflowId: env[workflowEnv] || undefined };
  });
}
