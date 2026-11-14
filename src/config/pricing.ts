import type { PriceSheet } from "@/lib/pricing/types";

/**
 * DRAFT internal price sheets.
 *
 * - `approved: false` on both. The quote engine labels output "internal draft" and
 *   the API refuses to mark a quote customer-ready until the owner approves a sheet.
 * - Phase 4: BOTH SHEETS SHIP BLANK (every rate 0 = "not set"). The engine refuses to price a line
 *   whose rate is not set, so no total is ever guessed. The owner enters rates in the private
 *   estimator rate book (/admin/ops → Estimator) per service × region × surface.
 * - No franchise price sheet has been imported or should be.
 * - Admin can override any sheet at runtime (stored in KV) from /admin/pricing.
 */
export const draftPriceSheets: PriceSheet[] = [
  {
    marketId: "boston",
    version: "2026-11-draft-1",
    approved: false,
    rows: [
      { service: "shower_restoration", label: "Shower restoration (standard alcove)", unit: "each", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "per_job", amount: 0 } },
      { service: "grout_cleaning", label: "Tile & grout cleaning", unit: "sqft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "grout_color_seal", label: "Grout colour sealing", unit: "sqft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "clear_seal", label: "Clear sealing", unit: "sqft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "regrout", label: "Regrouting (cut out & replace)", unit: "linear_ft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "caulk", label: "Caulk removal & replacement", unit: "linear_ft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "marble_clean", label: "Marble / stone cleaning & sealing", unit: "sqft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "marble_hone_polish", label: "Marble honing & polishing", unit: "sqft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "countertop_seal", label: "Stone countertop clean & seal", unit: "sqft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "bathroom_refresh", label: "1–2 Day Bathroom Refresh (renter package)", unit: "flat", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "per_job", amount: 0 } },
    ],
    zipModifiers: [
      ],
    customerTypeModifiers: { homeowner: 0, renter: 0, landlord: 0, hnw: 0, commercial: "custom", property_manager: "custom" },
    volumeDiscount: { thresholdSqft: 500, pct: 0 },
    projectMinimum: 0,
    depositRules: [
      { min: 0, max: 999, pct: 0, required: false },
      { min: 1000, max: 1999, pct: 25, required: true },
      { min: 2000, max: null, pct: 50, required: true },
    ],
    commercialDepositPct: 30,
  },
  {
    marketId: "south-florida",
    version: "2026-11-draft-1",
    approved: false,
    rows: [
      { service: "shower_restoration", label: "Shower restoration (standard alcove)", unit: "each", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "per_job", amount: 0 } },
      { service: "grout_cleaning", label: "Tile & grout cleaning", unit: "sqft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "grout_color_seal", label: "Grout colour sealing", unit: "sqft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "clear_seal", label: "Clear sealing", unit: "sqft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "regrout", label: "Regrouting (cut out & replace)", unit: "linear_ft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "caulk", label: "Caulk removal & replacement", unit: "linear_ft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "marble_clean", label: "Marble / stone cleaning & sealing", unit: "sqft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "marble_hone_polish", label: "Marble honing & polishing", unit: "sqft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "countertop_seal", label: "Stone countertop clean & seal", unit: "sqft", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "percent", pct: 0 } },
      { service: "bathroom_refresh", label: "1–2 Day Bathroom Refresh (renter package)", unit: "flat", rate: 0, minCharge: 0, internalCostPerUnit: 0, techPay: { type: "per_job", amount: 0 } },
    ],
    zipModifiers: [],
    customerTypeModifiers: { homeowner: 0, renter: 0, landlord: 0, hnw: 0, commercial: "custom", property_manager: "custom" },
    volumeDiscount: { thresholdSqft: 500, pct: 0 },
    seasonalUplift: { months: [11, 12, 1, 2, 3, 4], pct: 0, active: false },
    projectMinimum: 0,
    depositRules: [
      { min: 0, max: 999, pct: 0, required: false },
      { min: 1000, max: 1999, pct: 25, required: true },
      { min: 2000, max: null, pct: 50, required: true },
    ],
    commercialDepositPct: 30,
  },
];
