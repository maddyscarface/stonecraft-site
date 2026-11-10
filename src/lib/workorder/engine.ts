/**
 * Scope-to-brief generator (SmartOps Module 4).
 * Deterministic: same input → same brief. An LLM may be used upstream to suggest
 * conditions from photos/notes, but the brief itself is composed from the editable library.
 *
 * Technicians never receive pricing, margin or owner profitability fields.
 */
import { CLOSING, CONDITIONS, LIBRARY_META, OPENING, SOPS, type Condition, type Section } from "./library";

export type WorkOrderInput = {
  jobId: string;
  services: string[];
  scopeNotes?: string;
  surfaceType?: string;
  groutType?: "cementitious" | "epoxy" | "unknown";
  groutColor?: string;
  areaSqft?: number;
  linearFt?: number;
  specialConditions?: string[];
  productSelections?: Record<string, string>;
  siteAccessNotes?: string;
  customerRestrictions?: string;
  photoUrls?: string[];
  technician?: { name: string; qualifications: string[] };
  // Fields that MUST NOT leak into the brief — present here so tests can prove they're stripped.
  priceTotal?: number;
  margin?: number;
  techPay?: number;
};

export type Brief = {
  jobId: string;
  services: string[];
  sections: Section[];
  materials: { item: string; qty?: string }[];
  warnings: string[];
  ppe: string[];
  photoRequirements: string[];
  qc: string[];
  exclusions: string[];
  access: { siteAccess?: string; restrictions?: string };
  conditions: string[];
  blocksProceeding: boolean;
  fieldReady: boolean;
  reviewRequired: string[];
  qualificationGaps: string[];
  libraryVersion: string;
};

export function detectConditions(notes = "", selected: string[] = [], groutType?: string, surfaceType?: string): Condition[] {
  const text = `${notes} ${surfaceType ?? ""}`.toLowerCase();
  const ids = new Set(selected);
  for (const c of CONDITIONS) if (c.keywords.some((k) => text.includes(k))) ids.add(c.id);
  if (groutType === "epoxy") ids.add("epoxy_grout");
  return CONDITIONS.filter((c) => ids.has(c.id));
}

const QUAL_REQUIRED: Record<string, string> = { marble_hone_polish: "stone_polishing", grout_color_seal: "color_seal" };

export function generateBrief(input: WorkOrderInput, opts: { libraryValidated?: boolean } = {}): Brief {
  const validated = opts.libraryValidated ?? LIBRARY_META.validated;
  const sections: Section[] = [structuredClone(OPENING)];
  const materials: { item: string; qty?: string }[] = [];
  const photo: string[] = [], qc: string[] = [], exclusions: string[] = [];
  const unknown: string[] = [];

  for (const svc of input.services) {
    const sop = SOPS.find((s) => s.service === svc);
    if (!sop) { unknown.push(svc); continue; }
    for (const sec of sop.sections) sections.push({ id: `${svc}:${sec.id}`, title: `${sop.label.toUpperCase()} — ${sec.title}`, steps: [...sec.steps] });
    for (const m of sop.materials) {
      const qty = m.qtyRule && input.areaSqft && m.qtyRule.includes("sq ft") ? `${Math.ceil(input.areaSqft * 1.15)} sq ft coverage (area + 15%)` : m.qtyRule;
      const item = input.productSelections?.[m.item] ?? m.item;
      if (!materials.some((x) => x.item === item)) materials.push({ item: input.groutColor ? item.replace("colour per brief", `colour: ${input.groutColor}`) : item, qty });
    }
    photo.push(...sop.photoRequirements); qc.push(...sop.qc); exclusions.push(...sop.exclusions);
  }

  const conditions = detectConditions(input.scopeNotes, input.specialConditions, input.groutType, input.surfaceType);
  const warnings: string[] = [], ppe: string[] = ["Gloves and eye protection per product SDS", "Knee protection"];
  const reviewRequired: string[] = [];
  if (!validated) reviewRequired.push("Step library not yet validated by a qualified StoneCraft technician against manufacturer data sheets.");
  if (unknown.length) reviewRequired.push(`No SOP for: ${unknown.join(", ")}`);

  for (const c of conditions) {
    if (c.insert) {
      const idx = sections.findIndex((s) => s.id.endsWith(`:${c.insert!.beforeSection}`));
      if (idx >= 0) sections[idx].steps.unshift(c.insert.step);
      else sections[1]?.steps.unshift(c.insert.step);
    }
    if (c.warning) warnings.push(c.warning);
    if (c.ppe) ppe.push(c.ppe);
    if (c.hazardReview) reviewRequired.push(`Hazard review: ${c.label}`);
  }
  // Colour sealing over epoxy is blocked even if not mentioned in notes.
  if (input.services.includes("grout_color_seal") && conditions.some((c) => c.id === "epoxy_grout")) {
    warnings.unshift("Colour sealing is scoped on epoxy grout — re-scope before dispatch.");
  }

  const quals = new Set(input.technician?.qualifications ?? []);
  const qualificationGaps = input.services.filter((s) => QUAL_REQUIRED[s] && !quals.has(QUAL_REQUIRED[s])).map((s) => `${s} requires ${QUAL_REQUIRED[s]}`);

  sections.push(structuredClone(CLOSING));
  const blocksProceeding = conditions.some((c) => c.blocksProceeding);

  return {
    jobId: input.jobId,
    services: input.services,
    sections,
    materials,
    warnings,
    ppe: Array.from(new Set(ppe)),
    photoRequirements: Array.from(new Set(["Before photos of every area in scope", ...photo, "After photos matching each before angle"])),
    qc: Array.from(new Set(qc)),
    exclusions: Array.from(new Set(exclusions)),
    access: { siteAccess: input.siteAccessNotes, restrictions: input.customerRestrictions },
    conditions: conditions.map((c) => c.label),
    blocksProceeding,
    fieldReady: validated && reviewRequired.length === 0 && qualificationGaps.length === 0 && !blocksProceeding,
    reviewRequired,
    qualificationGaps,
    libraryVersion: LIBRARY_META.version,
  };
}

export function briefToText(b: Brief): string {
  const out: string[] = [`== JOB BRIEF ${b.jobId} ==`, `Library ${b.libraryVersion} · Field-ready: ${b.fieldReady ? "YES" : "NO — review required"}`];
  if (b.reviewRequired.length) out.push("", "REVIEW REQUIRED:", ...b.reviewRequired.map((r) => `  ! ${r}`));
  if (b.warnings.length) out.push("", "WARNINGS:", ...b.warnings.map((w) => `  ⚠ ${w}`));
  if (b.access.siteAccess || b.access.restrictions) out.push("", "ACCESS:", `  ${b.access.siteAccess ?? ""}`, `  ${b.access.restrictions ?? ""}`);
  let n = 1;
  for (const s of b.sections) { out.push("", `[${s.title}]`); for (const st of s.steps) out.push(`  Step ${n++}: ${st}`); }
  out.push("", "MATERIALS:", ...b.materials.map((m) => `  [ ] ${m.item}${m.qty ? ` — ${m.qty}` : ""}`));
  out.push("", "PPE:", ...b.ppe.map((p) => `  - ${p}`));
  out.push("", "PHOTOS REQUIRED:", ...b.photoRequirements.map((p) => `  - ${p}`));
  out.push("", "QC CHECKLIST:", ...b.qc.map((q) => `  [ ] ${q}`));
  out.push("", "NOT IN SCOPE:", ...b.exclusions.map((e) => `  - ${e}`));
  return out.join("\n");
}
