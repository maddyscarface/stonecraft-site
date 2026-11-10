import type { PriceSheet, PriceRow } from "./types";

export type QuoteLineInput = { service: string; quantity: number; note?: string };

export type QuoteInput = {
  sheet: PriceSheet;
  zip?: string;
  customerType?: string;
  isHnw?: boolean;
  month?: number; // 1–12
  lines: QuoteLineInput[];
};

export type QuoteLine = {
  service: string;
  label: string;
  unit: PriceRow["unit"];
  quantity: number;
  rate: number;
  subtotal: number; // after min charge
  minApplied: boolean;
  internalCost: number;
  techPay: number;
};

export type Quote =
  | { kind: "custom"; reason: string }
  | {
      kind: "estimate";
      lines: QuoteLine[];
      subtotal: number;
      modifiers: { label: string; pct: number; amount: number }[];
      total: number;
      deposit: { pct: number; amount: number; required: boolean };
      /** Owner/BDR only. Strip before sending anywhere else. */
      internal: { cost: number; techPay: number; grossMargin: number; grossMarginPct: number };
      customerReady: boolean;
      warnings: string[];
    };

const round2 = (n: number) => Math.round(n * 100) / 100;

function techPayFor(row: PriceRow, subtotal: number, quantity: number) {
  switch (row.techPay.type) {
    case "per_job": return row.techPay.amount;
    case "percent": return (subtotal * row.techPay.pct) / 100;
    case "per_unit": return row.techPay.amount * quantity;
  }
}

export function zipModifierPct(sheet: PriceSheet, zip?: string): { pct: number; note?: string } {
  if (!zip) return { pct: 0 };
  // Longest match wins (exact ZIP beats prefix).
  const hits = sheet.zipModifiers.filter((m) => zip.startsWith(m.match)).sort((a, b) => b.match.length - a.match.length);
  return hits[0] ? { pct: hits[0].pct, note: hits[0].note } : { pct: 0 };
}

export function buildQuote(input: QuoteInput): Quote {
  const { sheet } = input;
  const ct = input.customerType ?? "homeowner";
  const ctMod = sheet.customerTypeModifiers[ct];
  if (ctMod === "custom") {
    return { kind: "custom", reason: `Customer type "${ct}" requires a custom quote after site review (access, scheduling, restrictions, scope).` };
  }

  const warnings: string[] = [];
  if (!sheet.approved) warnings.push("Price sheet is a DRAFT — internal estimate only. Not customer-ready.");

  const lines: QuoteLine[] = [];
  for (const l of input.lines) {
    const row = sheet.rows.find((r) => r.service === l.service);
    if (!row) { warnings.push(`No price row for "${l.service}" — add it or quote manually.`); continue; }
    if (!(l.quantity > 0)) { warnings.push(`Quantity missing for "${row.label}".`); continue; }
    const raw = row.unit === "flat" ? row.rate : row.rate * l.quantity;
    const subtotal = Math.max(raw, row.minCharge);
    lines.push({
      service: row.service, label: row.label, unit: row.unit, quantity: l.quantity, rate: row.rate,
      subtotal: round2(subtotal), minApplied: subtotal > raw,
      internalCost: round2(row.unit === "flat" || row.unit === "each" ? row.internalCostPerUnit * (row.unit === "each" ? l.quantity : 1) : row.internalCostPerUnit * l.quantity),
      techPay: round2(techPayFor(row, subtotal, l.quantity)),
    });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.subtotal, 0));
  const modifiers: { label: string; pct: number; amount: number }[] = [];

  const zm = zipModifierPct(sheet, input.zip);
  if (zm.pct) modifiers.push({ label: `Location adjustment (${input.zip})`, pct: zm.pct, amount: 0 });
  if (typeof ctMod === "number" && ctMod !== 0) modifiers.push({ label: `Customer type (${ct})`, pct: ctMod, amount: 0 });
  if (input.isHnw && typeof sheet.customerTypeModifiers.hnw === "number" && ct !== "hnw") {
    modifiers.push({ label: "Luxury property handling", pct: sheet.customerTypeModifiers.hnw as number, amount: 0 });
  }
  const sqft = lines.filter((l) => l.unit === "sqft").reduce((s, l) => s + l.quantity, 0);
  if (sqft > sheet.volumeDiscount.thresholdSqft) modifiers.push({ label: `Volume (> ${sheet.volumeDiscount.thresholdSqft} sq ft)`, pct: -sheet.volumeDiscount.pct, amount: 0 });
  if (sheet.seasonalUplift?.active && input.month && sheet.seasonalUplift.months.includes(input.month) && sheet.seasonalUplift.pct) {
    modifiers.push({ label: "Peak-season scheduling", pct: sheet.seasonalUplift.pct, amount: 0 });
  }

  // Modifiers apply additively to the subtotal (predictable, easy to explain).
  for (const m of modifiers) m.amount = round2((subtotal * m.pct) / 100);
  let total = round2(subtotal + modifiers.reduce((s, m) => s + m.amount, 0));
  if (lines.length && total < sheet.projectMinimum) {
    warnings.push(`Project minimum of $${sheet.projectMinimum} applied.`);
    total = sheet.projectMinimum;
  }

  const rule = sheet.depositRules.find((r) => total >= r.min && (r.max === null || total <= r.max));
  const deposit = rule ? { pct: rule.pct, amount: round2((total * rule.pct) / 100), required: rule.required } : { pct: 0, amount: 0, required: false };

  const cost = round2(lines.reduce((s, l) => s + l.internalCost, 0));
  const techPay = round2(lines.reduce((s, l) => s + l.techPay, 0));
  const grossMargin = round2(total - cost - techPay);

  if (lines.length === 0) warnings.push("No billable lines.");

  return {
    kind: "estimate", lines, subtotal, modifiers, total, deposit,
    internal: { cost, techPay, grossMargin, grossMarginPct: total ? round2((grossMargin / total) * 100) : 0 },
    customerReady: sheet.approved && warnings.filter((w) => !w.startsWith("Project minimum")).length === 0,
    warnings,
  };
}

/** Strip internal economics — use for anything leaving the owner/BDR view. */
export function customerView(q: Quote) {
  if (q.kind !== "estimate") return q;
  const { internal: _internal, ...rest } = q;
  return { ...rest, lines: rest.lines.map(({ internalCost: _c, techPay: _t, ...l }) => l) };
}

export function splitCost(total: number, people: number) {
  const n = Math.max(1, Math.min(12, Math.floor(people || 1)));
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const remainder = cents - base * n;
  // First `remainder` people pay one extra cent so shares always sum to the total.
  const shares = Array.from({ length: n }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
  return { people: n, perPerson: shares[0], shares };
}
