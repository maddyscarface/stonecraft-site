import type { PriceSheet } from "@/lib/pricing/types";

/** TEST FIXTURE ONLY — synthetic numbers used to exercise the legacy quote engine. NOT StoneCraft prices; never imported by src/. */
export const TEST_FIXTURE_SHEET: PriceSheet =
  {
    marketId: "boston",
    version: "test-fixture",
    approved: false,
    rows: [
      { service: "shower_restoration", label: "Shower restoration (standard alcove)", unit: "each", rate: 1200, minCharge: 1200, internalCostPerUnit: 140, techPay: { type: "per_job", amount: 300 } },
      { service: "grout_cleaning", label: "Tile & grout cleaning", unit: "sqft", rate: 4.5, minCharge: 450, internalCostPerUnit: 0.35, techPay: { type: "percent", pct: 25 } },
      { service: "grout_color_seal", label: "Grout colour sealing", unit: "sqft", rate: 4.0, minCharge: 400, internalCostPerUnit: 0.6, techPay: { type: "percent", pct: 25 } },
      { service: "clear_seal", label: "Clear sealing", unit: "sqft", rate: 2.0, minCharge: 250, internalCostPerUnit: 0.25, techPay: { type: "percent", pct: 22 } },
      { service: "regrout", label: "Regrouting (cut out & replace)", unit: "linear_ft", rate: 12, minCharge: 300, internalCostPerUnit: 0.8, techPay: { type: "percent", pct: 28 } },
      { service: "caulk", label: "Caulk removal & replacement", unit: "linear_ft", rate: 10, minCharge: 200, internalCostPerUnit: 0.6, techPay: { type: "percent", pct: 28 } },
      { service: "marble_clean", label: "Marble / stone cleaning & sealing", unit: "sqft", rate: 6.0, minCharge: 450, internalCostPerUnit: 0.6, techPay: { type: "percent", pct: 25 } },
      { service: "marble_hone_polish", label: "Marble honing & polishing", unit: "sqft", rate: 9.5, minCharge: 800, internalCostPerUnit: 1.1, techPay: { type: "percent", pct: 25 } },
      { service: "countertop_seal", label: "Stone countertop clean & seal", unit: "sqft", rate: 8.0, minCharge: 300, internalCostPerUnit: 0.7, techPay: { type: "percent", pct: 22 } },
      { service: "bathroom_refresh", label: "1–2 Day Bathroom Refresh (renter package)", unit: "flat", rate: 1500, minCharge: 1500, internalCostPerUnit: 180, techPay: { type: "per_job", amount: 375 } },
    ],
    zipModifiers: [
      { match: "02116", pct: 10, note: "Back Bay — walk-up access, VERIFY" },
      { match: "02108", pct: 10, note: "Beacon Hill — access, VERIFY" },
      { match: "02199", pct: 10 },
    ],
    customerTypeModifiers: { homeowner: 0, renter: 0, landlord: 0, hnw: 10, commercial: "custom", property_manager: "custom" },
    volumeDiscount: { thresholdSqft: 500, pct: 10 },
    projectMinimum: 450,
    depositRules: [
      { min: 0, max: 999, pct: 0, required: false },
      { min: 1000, max: 1999, pct: 25, required: true },
      { min: 2000, max: null, pct: 50, required: true },
    ],
    commercialDepositPct: 30,
  };
