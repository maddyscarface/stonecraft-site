export type PriceUnit = "sqft" | "linear_ft" | "each" | "flat";

export type PriceRow = {
  service: string;
  label: string;
  unit: PriceUnit;
  /** Customer rate per unit (USD). */
  rate: number;
  minCharge: number;
  /** Internal materials + consumables cost per unit. Never shown to customers or techs. */
  internalCostPerUnit: number;
  /** Tech compensation basis for this line. */
  techPay: { type: "per_job"; amount: number } | { type: "percent"; pct: number } | { type: "per_unit"; amount: number };
};

export type ZipModifier = { match: string; pct: number; note?: string };

export type DepositRule = { min: number; max: number | null; pct: number; required: boolean };

export type PriceSheet = {
  marketId: string;
  version: string;
  /** false → engine output is internal-only and must not be sent to customers. */
  approved: boolean;
  approvedBy?: string;
  rows: PriceRow[];
  zipModifiers: ZipModifier[];
  customerTypeModifiers: Record<string, number | "custom">;
  volumeDiscount: { thresholdSqft: number; pct: number };
  seasonalUplift?: { months: number[]; pct: number; active: boolean };
  projectMinimum: number;
  depositRules: DepositRule[];
  commercialDepositPct: number;
};
