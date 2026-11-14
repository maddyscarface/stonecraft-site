/**
 * Manual measurements (pure; shared by the walkthrough UI, API and tests).
 * Customers enter feet/inches or metres/centimetres; values are normalised to millimetres (length) and
 * square metres (area). "Unknown" and "estimate / not sure" are first-class flags. Measurements are kept
 * SEPARATE from price: nothing here knows about rates.
 */
export type UnitSystem = "imperial" | "metric";
export type MeasureInput = {
  fieldId: string;
  kind: "length" | "area" | "count";
  /** imperial length: ft + in; metric length: m + cm; area: value in sq ft (imperial) or m² (metric); count: value */
  a?: number | null; b?: number | null;
  unknown?: boolean;
  uncertain?: boolean;
  note?: string;
};
export type Measurement = {
  fieldId: string; kind: MeasureInput["kind"]; unknown: boolean; uncertain: boolean;
  mm?: number; m2?: number; count?: number; entered: { system: UnitSystem; a?: number; b?: number }; note?: string;
};

const MAX_MM = 100_000; // 100 m
const MAX_M2 = 10_000;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);

export function normalise(input: MeasureInput, system: UnitSystem): { ok: true; m: Measurement } | { ok: false; error: string } {
  const a = num(input.a), b = num(input.b);
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 200) || undefined : undefined;
  const base = { fieldId: input.fieldId, kind: input.kind, uncertain: Boolean(input.uncertain), note };
  if (input.unknown) return { ok: true, m: { ...base, unknown: true, entered: { system } } };
  if (a === undefined && b === undefined) return { ok: false, error: "Enter a value or tick “I don’t know”." };
  if ((a ?? 0) < 0 || (b ?? 0) < 0) return { ok: false, error: "Values can’t be negative." };
  if (input.kind === "count") {
    const c = Math.round(a ?? 0);
    if (c > 500) return { ok: false, error: "That count looks too large." };
    return { ok: true, m: { ...base, unknown: false, count: c, entered: { system, a: c } } };
  }
  if (input.kind === "area") {
    const v = a ?? 0;
    const m2 = system === "imperial" ? v * 0.09290304 : v;
    if (!(m2 > 0) || m2 > MAX_M2) return { ok: false, error: "Area must be greater than 0 and under 10,000 m² (107,639 sq ft)." };
    return { ok: true, m: { ...base, unknown: false, m2: Math.round(m2 * 1000) / 1000, entered: { system, a: v } } };
  }
  if (system === "imperial" && (b ?? 0) >= 12) return { ok: false, error: "Inches must be under 12 (add the rest to feet)." };
  if (system === "metric" && (b ?? 0) >= 100) return { ok: false, error: "Centimetres must be under 100 (add the rest to metres)." };
  const mm = system === "imperial" ? ((a ?? 0) * 12 + (b ?? 0)) * 25.4 : ((a ?? 0) * 100 + (b ?? 0)) * 10;
  if (!(mm > 0) || mm > MAX_MM) return { ok: false, error: "Length must be greater than 0 and under 100 m (328 ft)." };
  return { ok: true, m: { ...base, unknown: false, mm: Math.round(mm), entered: { system, a: a ?? 0, b: b ?? 0 } } };
}

/** Human display in both systems (owner view) or the customer's chosen system. */
export function display(m: Measurement, system?: UnitSystem): string {
  if (m.unknown) return "Unknown";
  const flag = m.uncertain ? " (estimate)" : "";
  if (m.kind === "count") return `${m.count}${flag}`;
  if (m.kind === "area" && m.m2 !== undefined) {
    const sqft = Math.round((m.m2 / 0.09290304) * 10) / 10;
    const metric = `${m.m2} m²`, imperial = `${sqft} sq ft`;
    return (system === "metric" ? metric : system === "imperial" ? imperial : `${imperial} / ${metric}`) + flag;
  }
  if (m.mm === undefined) return "—";
  const totalIn = m.mm / 25.4, ft = Math.floor(totalIn / 12), inch = Math.round((totalIn - ft * 12) * 10) / 10;
  const imperial = `${ft} ft ${inch} in`, metric = `${(m.mm / 1000).toFixed(2)} m`;
  return (system === "metric" ? metric : system === "imperial" ? imperial : `${imperial} / ${metric}`) + flag;
}

/** Derived area (m²) from a length × width pair when both are known. Used for the owner's quantity worksheet only. */
export function derivedArea(len?: Measurement, wid?: Measurement): number | undefined {
  if (!len?.mm || !wid?.mm || len.unknown || wid.unknown) return undefined;
  return Math.round(((len.mm / 1000) * (wid.mm / 1000)) * 1000) / 1000;
}
export const m2ToSqft = (m2: number) => Math.round((m2 / 0.09290304) * 10) / 10;
