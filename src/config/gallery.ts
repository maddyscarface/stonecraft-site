/**
 * Gallery & case studies — REAL, PERMISSIONED content only.
 * An item renders only when `permission.granted` is true and the record names who granted it.
 * Never add stock photos, AI images or another company's job photos here.
 */
export type GalleryItem = {
  id: string;
  market: "boston" | "south-florida";
  town: string;
  service: string;
  before: string;
  after: string;
  alt: string;
  caption?: string;
  permission: { granted: boolean; grantedBy?: string; date?: string; allowsTown?: boolean };
};

export const gallery: GalleryItem[] = [
  // Example shape (keep commented until real):
  // { id: "bos-001", market: "boston", town: "Cambridge", service: "Shower restoration", before: "/gallery/bos-001-before.webp", after: "/gallery/bos-001-after.webp", alt: "Shower grout restoration in Cambridge, MA", permission: { granted: true, grantedBy: "Homeowner (signed release on file)", date: "2026-11-15", allowsTown: true } },
];

export const publishableGallery = () => gallery.filter((g) => g.permission.granted && g.permission.grantedBy);

export type CaseStudy = {
  id: string;
  title: string;
  segment: string;
  published: boolean;
  /** Written permission from the client AND (if subcontracted) the contracting entity. */
  approvals: { client: boolean; contractingEntity: boolean | "n/a"; approvedBy?: string; date?: string };
  /** Performed by StoneCraft's own entity? If performed under another company, it cannot be presented as StoneCraft's work. */
  performedByStoneCraft: boolean;
  anonymised: boolean;
  existingConditions: string;
  facilityRequirements: string;
  permittedHours: string;
  scope: string;
  phasing: string;
  documentation: string;
  outcome: string;
};

/** Template only — see docs/03-funnels.md §Case studies. Nothing publishes until all gates are true. */
export const caseStudies: CaseStudy[] = [
  {
    id: "healthcare-restroom-template",
    title: "Healthcare restroom surface restoration (template)",
    segment: "hospitals",
    published: false,
    approvals: { client: false, contractingEntity: false },
    performedByStoneCraft: false,
    anonymised: true,
    existingConditions: "[Describe grout/caulk/tile condition at inspection]",
    facilityRequirements: "[Infection-control class, PPE, badging, escort rules]",
    permittedHours: "[e.g. 10pm–5am, weekends]",
    scope: "[Restroom count, sq ft, services]",
    phasing: "[How restrooms were closed in sequence to keep access]",
    documentation: "[Before/after photo log, completion sign-off]",
    outcome: "[Measured, client-confirmed result only]",
  },
];

export const publishableCaseStudies = () => caseStudies.filter((c) => c.published && c.approvals.client && c.approvals.contractingEntity !== false && c.performedByStoneCraft);

export const founder = {
  name: "Gary Acquah",
  role: "Founder",
  bio: "StoneCraft was founded to give property owners an honest alternative to unnecessary remodels: restore what can be restored, and say plainly when something needs replacing.",
  /** Shown only when verified — see docs/15-claims-register.md */
  credentials: [
    { label: "Massachusetts General Contractor licence", verified: false },
    { label: "OSHA 30", verified: false },
    { label: "MS, Construction Project Management (WPI)", verified: false },
    { label: "MBA (Cornell)", verified: false },
  ],
};
