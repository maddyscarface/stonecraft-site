/**
 * Phase 3 keyword-to-URL map. Queries are topics to validate in Search Console,
 * not claimed search-volume data. Pre-launch Florida routes stay noindex and
 * out of the sitemap until the owner flips MARKET_FL_STATUS with staffing/licence checks.
 */
export type SeoRoute = {
  path: string;
  audience: string;
  queryGroup: string;
  stage: "informational" | "commercial" | "transactional";
  primaryKeyword: string;
  secondaryTopics: string[];
  indexableInProduction: boolean;
};

export const seoInventory: SeoRoute[] = [
  { path: "/", audience: "Homeowners and property managers in Greater Boston", queryGroup: "tile and grout restoration Boston", stage: "commercial", primaryKeyword: "tile and grout restoration Boston", secondaryTopics: ["shower restoration", "photo assessment"], indexableInProduction: true },
  { path: "/free-assessment", audience: "Residential enquirers", queryGroup: "photo assessment", stage: "transactional", primaryKeyword: "tile grout photo assessment", secondaryTopics: ["written scope", "onsite review"], indexableInProduction: true },
  { path: "/commercial-site-assessment", audience: "Facility and property managers", queryGroup: "commercial walkthrough", stage: "transactional", primaryKeyword: "commercial tile grout site assessment", secondaryTopics: ["restroom restoration", "phased closures"], indexableInProduction: true },
  { path: "/services/shower-restoration", audience: "Homeowners and renters", queryGroup: "shower grout repair Boston", stage: "commercial", primaryKeyword: "shower restoration Boston", secondaryTopics: ["recaulking", "grout repair"], indexableInProduction: true },
  { path: "/services/grout-color-sealing", audience: "Homeowners", queryGroup: "grout color sealing Boston", stage: "commercial", primaryKeyword: "grout colour sealing Boston", secondaryTopics: ["grout cleaning vs colour sealing"], indexableInProduction: true },
  { path: "/services/marble-stone-restoration", audience: "Homeowners and property managers", queryGroup: "marble polishing Boston", stage: "commercial", primaryKeyword: "marble restoration Boston", secondaryTopics: ["etching vs staining", "countertop stone restoration"], indexableInProduction: true },
  { path: "/services/commercial-restoration", audience: "Managed facilities", queryGroup: "commercial restroom tile restoration", stage: "commercial", primaryKeyword: "commercial tile and grout restoration", secondaryTopics: ["hospitals", "hospitality", "campuses"], indexableInProduction: true },
  { path: "/commercial", audience: "Commercial buyers", queryGroup: "commercial tile restoration", stage: "commercial", primaryKeyword: "commercial tile and grout restoration", secondaryTopics: ["lobbies", "corridors", "restrooms"], indexableInProduction: true },
  { path: "/commercial/hospitals", audience: "Healthcare facilities", queryGroup: "hospital restroom tile", stage: "commercial", primaryKeyword: "hospital restroom tile restoration", secondaryTopics: ["infection-control coordination"], indexableInProduction: true },
  { path: "/commercial/hotels-hospitality", audience: "Hotels and resorts", queryGroup: "hotel restroom tile", stage: "commercial", primaryKeyword: "hospitality tile and grout restoration", secondaryTopics: ["guest bathrooms", "lobbies"], indexableInProduction: true },
  { path: "/commercial/universities-schools", audience: "Campuses", queryGroup: "campus restroom tile", stage: "commercial", primaryKeyword: "educational campus tile restoration", secondaryTopics: ["residence halls", "academic breaks"], indexableInProduction: true },
  { path: "/boston", audience: "Greater Boston residents and managers", queryGroup: "tile restoration Boston", stage: "commercial", primaryKeyword: "tile and grout restoration Greater Boston", secondaryTopics: ["Cambridge", "Brookline", "Newton"], indexableInProduction: true },
  { path: "/south-florida", audience: "Southeast Florida enquirers", queryGroup: "tile restoration Palm Beach", stage: "commercial", primaryKeyword: "tile restoration Palm Beach", secondaryTopics: ["grout cleaning Broward County"], indexableInProduction: false },
  { path: "/south-florida/boca-raton", audience: "Southeast Florida enquirers", queryGroup: "tile restoration Boca Raton", stage: "commercial", primaryKeyword: "tile restoration Boca Raton", secondaryTopics: ["pre-launch enquiry"], indexableInProduction: false },
  { path: "/resources/grout-cleaning-vs-color-sealing", audience: "Homeowners", queryGroup: "grout cleaning vs colour sealing", stage: "informational", primaryKeyword: "grout cleaning vs color sealing", secondaryTopics: ["clear sealer", "epoxy grout"], indexableInProduction: true },
  { path: "/resources/restore-or-replace-shower-grout", audience: "Homeowners and renters", queryGroup: "restore or replace shower grout", stage: "informational", primaryKeyword: "restore or replace shower grout", secondaryTopics: ["recaulking", "leaks"], indexableInProduction: true },
  { path: "/resources/glazed-tile-and-high-gloss-finishes", audience: "Homeowners and facilities", queryGroup: "glazed tile coatings", stage: "informational", primaryKeyword: "high-gloss finish on glazed tile", secondaryTopics: ["topical coatings"], indexableInProduction: true },
  { path: "/resources/marble-etching-vs-staining", audience: "Homeowners", queryGroup: "marble etching vs staining", stage: "informational", primaryKeyword: "marble etching vs staining", secondaryTopics: ["honing", "sealing"], indexableInProduction: true },
  { path: "/resources/safe-cleaning-after-restoration", audience: "Customers after a job", queryGroup: "cleaning after grout restoration", stage: "informational", primaryKeyword: "safe cleaning after tile restoration", secondaryTopics: ["cure time", "stone-safe cleaners"], indexableInProduction: true },
  { path: "/resources/commercial-restroom-maintenance-after-restoration", audience: "Facility teams", queryGroup: "commercial restroom maintenance", stage: "informational", primaryKeyword: "commercial restroom tile maintenance", secondaryTopics: ["resealing", "compatible cleaners"], indexableInProduction: true },
];
