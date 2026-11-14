/**
 * Tenant/brand identity for this deployment. This repo serves exactly ONE brand. Every ops record carries
 * `brand`, and every admin read/write checks it against BOTH the deployment brand and the staff member's
 * brand grants (deny by default). A record whose brand differs is reported as 404 — never "forbidden" —
 * so cross-brand ids are not discoverable by URL guessing.
 */
export const BRAND_ID = "stonecraft" as const;
export const BRAND_NAME = "StoneCraft";
export type BrandId = "buildghana" | "deckcraft" | "stonecraft" | "portfolioworks";
export const KNOWN_BRANDS: BrandId[] = ["buildghana", "deckcraft", "stonecraft", "portfolioworks"];

export const isThisBrand = (b: unknown): boolean => b === BRAND_ID;
