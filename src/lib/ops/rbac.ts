/**
 * Phase 4 staff roles and least-privilege permission matrix (deny by default).
 * Pricing is OWNER-ONLY: only the owner can edit the rate book, approve a proposal, export DOCX/PDF or record
 * "marked sent externally". Estimators draft proposals and measurements; nobody can auto-send anything.
 */
export const roles = ["owner", "manager", "marketer", "estimator", "operator", "legal_reviewer", "read_only"] as const;
export type OpsRole = (typeof roles)[number];

export const permissions = [
  "records.read", "records.read_pii", "records.export",
  "projects.read", "projects.write",
  "documents.read", "documents.write", "documents.delete",
  "walkthrough.read", "walkthrough.write", "walkthrough.invite", "walkthrough.media_read",
  "estimator.read", "estimator.write", "estimator.rates_read", "estimator.rates_write", "estimator.approve", "estimator.export", "estimator.mark_sent",
  "areas.read", "areas.write", "ar.read", "legal.review",
  "crm.read", "crm.replay",
  "datamoon.read", "datamoon.recipe_write", "datamoon.approve_export", "datamoon.approve_crm_sync", "datamoon.import", "datamoon.sync_crm",
  "suppressions.read", "suppressions.write",
  "reports.read", "staff.read", "staff.write", "audit.read", "health.read",
] as const;
export type Permission = (typeof permissions)[number];

const ALL = [...permissions] as Permission[];
const OWNER_ONLY: Permission[] = ["staff.write", "datamoon.approve_export", "datamoon.approve_crm_sync", "documents.delete", "estimator.rates_write", "estimator.approve", "estimator.export", "estimator.mark_sent", "areas.write"];
export const matrix: Record<OpsRole, Permission[]> = {
  owner: ALL,
  manager: ALL.filter((p) => !OWNER_ONLY.includes(p)),
  marketer: ["records.read", "reports.read", "crm.read", "datamoon.read", "datamoon.recipe_write", "datamoon.import", "suppressions.read", "suppressions.write", "areas.read", "health.read"],
  estimator: ["records.read", "records.read_pii", "projects.read", "projects.write", "documents.read", "documents.write", "walkthrough.read", "walkthrough.write", "walkthrough.invite", "walkthrough.media_read", "estimator.read", "estimator.write", "estimator.rates_read", "areas.read", "ar.read"],
  operator: ["records.read", "records.read_pii", "projects.read", "projects.write", "documents.read", "documents.write", "walkthrough.read", "walkthrough.write", "walkthrough.invite", "walkthrough.media_read", "areas.read", "crm.read", "crm.replay", "suppressions.read", "suppressions.write", "health.read"],
  legal_reviewer: ["records.read", "projects.read", "documents.read", "walkthrough.read", "estimator.read", "legal.review", "audit.read"],
  read_only: ["records.read", "projects.read", "walkthrough.read", "reports.read", "areas.read", "health.read"],
};

export const roleLabel: Record<OpsRole, string> = {
  owner: "Owner", manager: "Manager", marketer: "Marketer", estimator: "Estimator (drafts only; owner approves)",
  operator: "Operator", legal_reviewer: "Legal reviewer", read_only: "Read-only",
};

export const isRole = (r: unknown): r is OpsRole => typeof r === "string" && (roles as readonly string[]).includes(r);
export function hasPermission(role: OpsRole | null | undefined, p: Permission): boolean {
  if (!role || !isRole(role)) return false;
  return matrix[role].includes(p);
}
