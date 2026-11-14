import { walkthroughTemplates, stepKey, type EscalationFlag, type WalkthroughTemplate } from "@/config/walkthrough-templates";
import type { Outcome, Walkthrough } from "./model";

/**
 * Pure rules (unit-tested). Escalations come from template answer rules; the suggested outcome is a staff aid
 * only — an estimator/owner confirms it. Customers never see escalations or outcomes.
 *   leak / loose tile / substrate / mould / safety-sensitive → site check
 *   stone uncertainty → live video walkthrough
 *   missing required photos, answers or key measurements (or several "unknown"/estimate values) → targeted follow-up
 *   otherwise → ready for remote quote
 */
export function stepKeys(t: WalkthroughTemplate, repeats: Record<string, number>): string[] {
  return t.steps.flatMap((s) => (s.repeat ? Array.from({ length: Math.max(s.repeat.min, Math.min(s.repeat.max, repeats[s.id] ?? s.repeat.min)) }, (_, i) => stepKey(s.id, i + 1)) : [s.id]));
}

export function escalationsFor(w: Pick<Walkthrough, "workType" | "steps" | "repeats">): EscalationFlag[] {
  const t = walkthroughTemplates[w.workType];
  const flags = new Set<EscalationFlag>();
  for (const key of stepKeys(t, w.repeats)) {
    const def = t.steps.find((s) => s.id === key.split("#")[0]);
    const st = w.steps[key];
    if (!def || !st) continue;
    for (const q of def.questions) {
      if (!q.escalate) continue;
      const a = st.answers[q.id];
      const vals = Array.isArray(a) ? a : a ? [a] : [];
      if (vals.some((v) => q.escalate!.when.includes(v))) flags.add(q.escalate.flag);
    }
  }
  return [...flags];
}

export type Gap = { stepKey: string; issue: string };
export function gapsFor(w: Pick<Walkthrough, "workType" | "steps" | "repeats" | "media" | "measurements">): Gap[] {
  const t = walkthroughTemplates[w.workType];
  const gaps: Gap[] = [];
  const latest = latestMeasurements(w);
  for (const key of stepKeys(t, w.repeats)) {
    const def = t.steps.find((s) => s.id === key.split("#")[0])!;
    const st = w.steps[key];
    const photos = w.media.filter((m) => m.stepKey === key && m.kind === "photo" && m.status === "uploaded").length;
    if (photos < def.capture.photosMin) gaps.push({ stepKey: key, issue: `needs ${def.capture.photosMin - photos} more photo(s)` });
    for (const q of def.questions) if (q.required && !(st?.answers[q.id] && String(st.answers[q.id]).length)) gaps.push({ stepKey: key, issue: `answer “${q.label}”` });
    for (const f of def.measurements) if (f.required && !latest[key]?.find((m) => m.fieldId === f.id && !m.unknown)) gaps.push({ stepKey: key, issue: `measure ${f.label.toLowerCase()}` });
  }
  return gaps;
}

export function latestMeasurements(w: Pick<Walkthrough, "measurements">) {
  const out: Record<string, Walkthrough["measurements"][number]["values"]> = {};
  for (const v of [...w.measurements].sort((a, b) => a.version - b.version)) out[v.stepKey] = v.values;
  return out;
}

export function suggestOutcome(w: Pick<Walkthrough, "workType" | "steps" | "repeats" | "media" | "measurements">): { outcome: Outcome; reasons: string[] } {
  const esc = escalationsFor(w);
  const reasons: string[] = [];
  if (esc.some((f) => ["leak", "loose_tile", "substrate", "mold", "safety_sensitive"].includes(f))) {
    reasons.push(...esc.filter((f) => f !== "stone_uncertain").map((f) => `escalation: ${f}`));
    return { outcome: "site_check", reasons };
  }
  if (w.workType === "commercial") return { outcome: "site_check", reasons: ["commercial scopes are confirmed on site"] };
  if (esc.includes("stone_uncertain")) return { outcome: "live_video_walkthrough", reasons: ["stone type or damage uncertain"] };
  const gaps = gapsFor(w);
  const all = Object.values(latestMeasurements(w)).flat();
  const unknownish = all.filter((m) => m.unknown || m.uncertain).length;
  if (gaps.length) return { outcome: "targeted_follow_up", reasons: gaps.slice(0, 6).map((g) => `${g.stepKey}: ${g.issue}`) };
  if (all.length === 0 || unknownish > Math.max(1, all.length / 2)) return { outcome: "targeted_follow_up", reasons: ["measurements missing or mostly estimates"] };
  return { outcome: "ready_for_remote_quote", reasons: ["photos, answers and measurements complete; no escalations"] };
}
