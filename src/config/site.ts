/**
 * StoneCraft — global site configuration.
 *
 * Every value marked `VERIFY` is an owner decision or an unverified fact.
 * Trust claims render on the site ONLY when `verified: true`. Nothing here
 * should be switched on until the underlying fact is documented.
 * See docs/15-claims-register.md.
 */

export const site = {
  brand: "StoneCraft",
  legalEntity: "StoneCraft (operating entity: VERIFY — e.g. Flex Investments LLC d/b/a StoneCraft)",
  primaryDomain: process.env.NEXT_PUBLIC_SITE_URL ?? "https://stonecraftboston.com",
  positioning: "Your Tile. Your Grout. Your Stone. Restored.",
  supporting:
    "Professional restoration of bathrooms, tile, grout, marble and natural stone—helping homeowners, renters and commercial properties renew existing surfaces without unnecessary replacement.",
  commercialPositioning: "Restore Your Surfaces. Reduce Disruption. Protect Your Property.",
  independenceStatement: "Independently owned and operated. Not a franchise.",
  /** Response promise shown on forms. Change only after the response time has been measured for 30 days. */
  responsePromise: "We review every submission and reply the same business day.",
  social: {
    instagram: "https://instagram.com/stonecraftboston", // VERIFY handle exists
    tiktok: "",
    facebook: "",
  },
  /** Leave empty until a real Google Business Profile review link exists. */
  googleReviewUrl: "",
} as const;

export type TrustClaim = {
  id: string;
  label: string;
  detail: string;
  verified: boolean;
  evidence?: string;
};

/**
 * Trust factors. Process statements (true by design) are verified: true.
 * Credential statements stay false until documents are on file.
 */
export const trustClaims: TrustClaim[] = [
  { id: "photo-first", label: "Free photo assessment", detail: "Send photos first. No obligation, no visit needed to start.", verified: true, evidence: "Process design" },
  { id: "written-scope", label: "Written scope before work", detail: "You approve a written scope and price before anything is booked.", verified: true, evidence: "Process design" },
  { id: "independent", label: "Independently owned", detail: "Not a franchise. Local decision-making.", verified: true, evidence: "Ownership structure — VERIFY entity" },
  { id: "restore-first", label: "Restoration-first advice", detail: "If a surface can't be restored, we say so before you spend anything.", verified: true, evidence: "Process design" },
  { id: "insured", label: "Insured", detail: "General liability coverage. Certificate available on request.", verified: false, evidence: "VERIFY: COI on file for operating entity" },
  { id: "ma-hic", label: "Massachusetts registered", detail: "Home Improvement Contractor registration.", verified: false, evidence: "VERIFY: whether HIC registration applies to the StoneCraft entity and scope; add number" },
  { id: "fl-license", label: "Florida licensed where required", detail: "Local business tax receipts on file.", verified: false, evidence: "VERIFY: FL entity, county/city BTR; confirm whether trade licensure applies" },
  { id: "reviews", label: "Google reviews", detail: "", verified: false, evidence: "Add only real rating + count from GBP" },
];

export const verifiedTrust = () => trustClaims.filter((c) => c.verified);

/** Owner-controlled feature flags. */
export const flags = {
  /** Show any review content. Keep false until real, attributable reviews exist. */
  showReviews: false,
  /** Show gallery items. Items themselves must have `permission: true`. */
  showGallery: true,
  /** Show the published case studies section. */
  showCaseStudies: false,
  /** Room-scan beta (internal/admin only). */
  roomScanBeta: process.env.ROOM_SCAN_ENABLED === "true",
};

export const nav = [
  { label: "Residential", href: "/residential", children: [
    { label: "Homeowners", href: "/residential" },
    { label: "Renters", href: "/renters" },
    { label: "Landlords", href: "/landlords" },
    { label: "Bathroom Refresh", href: "/bathroom-refresh" },
  ]},
  { label: "Commercial", href: "/commercial", children: [
    { label: "Hospitals & Healthcare", href: "/commercial/hospitals" },
    { label: "Universities & Schools", href: "/commercial/universities-schools" },
    { label: "Hotels & Hospitality", href: "/commercial/hotels-hospitality" },
    { label: "HOAs & Condos", href: "/commercial/hoa-condos" },
    { label: "Property Management", href: "/commercial/property-management" },
  ]},
  { label: "Services", href: "/services/shower-restoration", children: [] as { label: string; href: string }[] },
  { label: "Gallery", href: "/gallery" },
  { label: "Process", href: "/process" },
  { label: "Service Areas", href: "/service-areas" },
  { label: "Resources", href: "/resources" },
];
