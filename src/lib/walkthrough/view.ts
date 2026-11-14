import { walkthroughTemplates } from "@/config/walkthrough-templates";
import { latestMeasurements } from "./outcome";
import type { Walkthrough } from "./model";

/**
 * PUBLIC RESPONSE ALLOWLIST for the customer walkthrough API. Built field-by-field (never spread) so internal
 * fields — escalations, suggested/confirmed outcome, internal notes, proposal/price data, storage keys, staff ids,
 * email, lead/project ids — can never leak. Enforced by tests/phase4-walkthrough.test.ts.
 */
export const PUBLIC_VIEW_KEYS = ["reference", "workType", "title", "status", "units", "firstName", "expiresAt", "repeats", "steps", "measurements", "media", "corrections", "submittedAt"] as const;

export function publicView(w: Walkthrough) {
  const t = walkthroughTemplates[w.workType];
  const latest = latestMeasurements(w);
  return {
    reference: w.reference,
    workType: w.workType,
    title: t.title,
    status: w.status === "reviewed" ? "submitted" : w.status, // staff review state is internal
    units: w.units,
    firstName: w.customer.firstName,
    expiresAt: w.invite.expiresAt,
    repeats: { ...w.repeats },
    steps: Object.fromEntries(Object.values(w.steps).map((s) => [s.key, { answers: s.answers, completed: Boolean(s.completedAt) }])),
    measurements: Object.fromEntries(Object.entries(latest).map(([k, vals]) => [k, vals.map((m) => ({ fieldId: m.fieldId, kind: m.kind, unknown: m.unknown, uncertain: m.uncertain, entered: m.entered }))])),
    media: w.media.filter((m) => m.status === "uploaded" || m.status === "pending_upload").map((m) => ({ id: m.id, stepKey: m.stepKey, kind: m.kind, status: m.status })),
    corrections: w.corrections.filter((c) => !c.resolvedAt).map((c) => ({ id: c.id, stepKeys: c.stepKeys, note: c.note })),
    submittedAt: w.submittedAt ?? null,
  };
}
export type PublicWalkthrough = ReturnType<typeof publicView>;
