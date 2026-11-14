import type { CreditStatus } from "./types";

/**
 * Credit/quota guard (pure). Called BEFORE any export creation (billable). Denies when:
 *  - the owner ceiling or monthly budget is unset/exceeded,
 *  - the org credit pool (GET /organization/credits) cannot cover the request,
 *  - a feed's export_rows_remaining cannot cover it.
 */
export function checkQuota(o: { requested: number; ceiling: number; monthlyBudget: number; monthUsed: number; credits: CreditStatus | null; feedRemaining?: number | null }): { ok: true } | { ok: false; reason: string } {
  if (!Number.isInteger(o.requested) || o.requested <= 0) return { ok: false, reason: "Requested records must be a positive integer" };
  if (o.ceiling <= 0) return { ok: false, reason: "No record ceiling approved (DATAMOON_RECORD_CEILING=0)" };
  if (o.requested > o.ceiling) return { ok: false, reason: `Request ${o.requested} exceeds per-run ceiling ${o.ceiling}` };
  if (o.monthlyBudget <= 0) return { ok: false, reason: "No monthly record budget approved (DATAMOON_MONTHLY_RECORD_BUDGET=0)" };
  if (o.monthUsed + o.requested > o.monthlyBudget) return { ok: false, reason: `Monthly budget ${o.monthlyBudget} would be exceeded (used ${o.monthUsed})` };
  if (!o.credits) return { ok: false, reason: "Credit balance unknown — refusing billable call" };
  if (o.credits.remaining !== null && o.credits.remaining < o.requested) return { ok: false, reason: `Credits exhausted: ${o.credits.remaining} remaining` };
  if (o.feedRemaining !== undefined && o.feedRemaining !== null && o.feedRemaining < o.requested) return { ok: false, reason: `Feed quota exhausted: ${o.feedRemaining} rows remaining` };
  return { ok: true };
}
