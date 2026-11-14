import { z } from "zod";

/**
 * OWNER-ONLY rate book (Phase 4). Ships BLANK: every rate is null ("not set") for every
 * service × region × surface. Boston and Southeast Florida are separate books. Rates are entered by the owner in
 * /admin/ops → Estimator → Rate book and never leave the admin (no public route reads this module's data).
 */
export const regions = ["boston", "south-florida"] as const;
export type Region = (typeof regions)[number];
export const surfaces = ["ceramic", "porcelain", "marble", "granite_quartzite", "limestone_travertine", "engineered_quartz", "glass_mosaic", "unknown"] as const;
export type Surface = (typeof surfaces)[number];
export const units = ["sqft", "linear_ft", "each", "hour", "flat"] as const;
export type RateUnit = (typeof units)[number];

export const services: { id: string; label: string; workType: "shower" | "floor" | "stone" | "commercial" | "any"; unit: RateUnit }[] = [
  { id: "shower_restoration", label: "Shower restoration", workType: "shower", unit: "each" },
  { id: "regrout", label: "Regrout (cut out & replace)", workType: "any", unit: "linear_ft" },
  { id: "grout_clean", label: "Tile & grout deep clean", workType: "any", unit: "sqft" },
  { id: "grout_color_seal", label: "Grout colour seal", workType: "any", unit: "sqft" },
  { id: "clear_seal", label: "Clear / impregnating seal", workType: "any", unit: "sqft" },
  { id: "caulk", label: "Caulk removal & replacement", workType: "shower", unit: "linear_ft" },
  { id: "tile_replace", label: "Individual tile replacement", workType: "any", unit: "each" },
  { id: "stone_hone_polish", label: "Stone hone & polish", workType: "stone", unit: "sqft" },
  { id: "etch_removal", label: "Etch removal (spot)", workType: "stone", unit: "each" },
  { id: "stain_poultice", label: "Stain poultice (spot)", workType: "stone", unit: "each" },
  { id: "countertop_seal", label: "Countertop clean & seal", workType: "stone", unit: "sqft" },
  { id: "edge_restore", label: "Edge restoration", workType: "stone", unit: "linear_ft" },
  { id: "restroom_restoration", label: "Commercial restroom restoration", workType: "commercial", unit: "each" },
  { id: "commercial_floor", label: "Lobby / corridor floor restoration", workType: "commercial", unit: "sqft" },
  { id: "after_hours", label: "After-hours labour", workType: "commercial", unit: "hour" },
  { id: "site_check_fee", label: "Site check", workType: "any", unit: "flat" },
];

export type RateEntry = { service: string; surface: Surface; unit: RateUnit; rate: number | null; minCharge: number | null; note?: string };
export type RateBook = { region: Region; version: number; updatedAt: string | null; updatedBy: string | null; entries: RateEntry[] };

/** The shipped rate book: all blank. */
export function blankRateBook(region: Region): RateBook {
  return { region, version: 0, updatedAt: null, updatedBy: null, entries: services.flatMap((s) => surfaces.map((surface) => ({ service: s.id, surface, unit: s.unit, rate: null, minCharge: null }))) };
}

const money = z.number().min(0).max(1_000_000).nullable();
export const rateUpdateSchema = z.object({
  region: z.enum(regions),
  expectedVersion: z.number().int().min(0),
  entries: z.array(z.object({ service: z.string().max(40), surface: z.enum(surfaces), rate: money, minCharge: money, note: z.string().max(200).optional() })).min(1).max(200),
});

export function applyRateUpdate(book: RateBook, upd: z.infer<typeof rateUpdateSchema>, by: string): { ok: true; book: RateBook } | { ok: false; status: number; error: string } {
  if (upd.region !== book.region) return { ok: false, status: 422, error: "Region mismatch" };
  if (upd.expectedVersion !== book.version) return { ok: false, status: 409, error: `Rate book changed (now v${book.version}). Reload before saving.` };
  const next: RateBook = { ...book, entries: book.entries.map((e) => ({ ...e })) };
  for (const u of upd.entries) {
    const e = next.entries.find((x) => x.service === u.service && x.surface === u.surface);
    if (!e) return { ok: false, status: 422, error: `Unknown service ${u.service}` };
    e.rate = u.rate; e.minCharge = u.minCharge; e.note = u.note;
  }
  next.version = book.version + 1; next.updatedAt = new Date().toISOString(); next.updatedBy = by;
  return { ok: true, book: next };
}

export const rateFor = (book: RateBook, service: string, surface: Surface) => book.entries.find((e) => e.service === service && e.surface === surface);
