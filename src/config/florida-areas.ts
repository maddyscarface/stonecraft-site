import type { City } from "./cities";

/**
 * Southeast Florida service-area config (Phase 4, FL owner-confirmed LIVE).
 *
 * ONE editable list drives the county pages, the major-city pages, ZIP → county routing, the sitemap,
 * schema areaServed and llms.txt. To add / remove a city, edit FL_AREA_CITIES only.
 *
 * OWNER DECISION PENDING: the owner has not yet confirmed the exact cities served. Every entry below is
 * `ownerConfirmed: false` (shown as "Pending owner confirmation" in /admin/ops → Service areas). Set
 * `page: false` to keep a city as listed-only (no landing page), or delete the entry to stop routing it.
 * ZIP lists are best-effort and must be checked against USPS before ad spend (VERIFY).
 *
 * Copy rules: describe housing stock and typical surface issues only. No licence, staffing, office,
 * crew, job-count or result claims. No address or Google Business Profile is invented.
 */
export type FlCountyId = "palm-beach" | "broward";

export type FlCounty = {
  id: FlCountyId;
  /** URL slug under /south-florida/ */
  slug: string;
  name: string;
  zoneIds: string[];
  intro: string;
  housing: string;
  commonIssues: string[];
  /** ZIP3 prefixes used as a fallback when a ZIP isn't in any city list (editable). */
  zip3: string[];
};

export const FL_COUNTIES: FlCounty[] = [
  {
    id: "palm-beach", slug: "palm-beach-county", name: "Palm Beach County", zoneIds: ["fl-pb-north", "fl-pb-south"],
    intro: "Palm Beach County runs from Jupiter and Palm Beach Gardens through West Palm Beach and the island of Palm Beach to Lake Worth Beach, Boynton Beach, Delray Beach and Boca Raton. Coastal condominiums, country-club communities and seasonal residences mean a lot of marble, travertine and large-format tile that has to be restored around association rules and owners' travel dates.",
    housing: "Coastal and seasonal condominiums, gated and country-club communities, historic single-family neighbourhoods and rentals.",
    commonIssues: ["Mineral build-up and mildew in showers", "Dull or etched marble and travertine", "Stained large-format floor grout", "Failed caulk at tubs, showers and windows"],
    zip3: ["334"],
  },
  {
    id: "broward", slug: "broward-county", name: "Broward County", zoneIds: ["fl-broward"],
    intro: "Broward County covers Fort Lauderdale's waterfront and beach condominiums, Hollywood and Pompano Beach on the coast, and planned western communities such as Weston, Plantation, Davie and Coral Springs. Hotels, condo associations and managed buildings need hard-surface work scheduled around residents, guests and building rules.",
    housing: "Beach and waterfront condominiums, planned single-family communities, multifamily and hospitality properties.",
    commonIssues: ["Condo shower and floor grout", "Marble in baths and lobbies", "Hard-water deposits on tile and glass joints", "Common-area restroom and corridor floors"],
    zip3: ["330", "333"],
  },
];

export type FlAreaCity = Omit<City, "market" | "state" | "tier"> & {
  county: FlCountyId;
  /** true → gets a /south-florida/<slug> landing page; false → listed on the county page only. */
  page: boolean;
  /** Owner has confirmed this city is operationally served. All false until the owner signs off. */
  ownerConfirmed: boolean;
  /** Internal note shown in admin only (never rendered publicly). */
  adminNote?: string;
};

export const FL_AREA_CITIES: FlAreaCity[] = [
  // ── Palm Beach County ──
  { slug: "west-palm-beach", name: "West Palm Beach", county: "palm-beach", page: true, ownerConfirmed: false,
    zips: ["33401", "33405", "33407", "33409", "33411", "33412", "33413", "33415", "33417"], lat: 26.7153, lng: -80.0534,
    intro: "West Palm Beach ranges from historic neighbourhoods like El Cid and Flamingo Park to downtown condo towers. South Florida's hard water and humidity mean mineral build-up and mildew are common in showers and on tile floors.",
    housing: "Historic single-family homes, downtown condos and rentals.",
    commonIssues: ["Mineral deposits on shower tile and glass joints", "Mildew in grout and caulk", "Large-format floor tile grout"] },
  { slug: "palm-beach", name: "Palm Beach", county: "palm-beach", page: true, ownerConfirmed: false,
    zips: ["33480"], lat: 26.7056, lng: -80.0364,
    intro: "Homes and condominiums on Palm Beach often feature marble, limestone and other natural stone that needs stone-safe care. Many owners are seasonal, so work is often scheduled around arrival dates or completed while the residence is unoccupied.",
    housing: "Estates and condominiums with extensive natural stone; many seasonal residents.",
    commonIssues: ["Etched and dull marble", "Limestone and coral-stone staining", "Sealant renewal before the season"] },
  { slug: "palm-beach-gardens", name: "Palm Beach Gardens", county: "palm-beach", page: true, ownerConfirmed: false,
    zips: ["33410", "33418"], lat: 26.8234, lng: -80.1387,
    intro: "Palm Beach Gardens is dominated by planned and gated communities with HOA standards and large-format tile throughout. Floors and showers take daily wear, and many communities require vendor insurance before work.",
    housing: "Gated and planned communities; single-family homes and villas.",
    commonIssues: ["Large-format floor tile grout", "Shower mineral build-up", "Travertine lanai and pool-area stone"] },
  { slug: "jupiter", name: "Jupiter", county: "palm-beach", page: true, ownerConfirmed: false, adminNote: "Spec: include only if operationally served. Set page:false or remove if not.",
    zips: ["33458", "33468", "33469", "33477", "33478"], lat: 26.9342, lng: -80.0942,
    intro: "Jupiter mixes waterfront and Intracoastal homes, golf communities and newer townhome developments. Salt air, humidity and outdoor living areas put extra strain on grout, caulk and natural stone.",
    housing: "Waterfront single-family homes, golf and gated communities, townhomes.",
    commonIssues: ["Mildew in shower caulk", "Travertine and shell-stone wear", "Floor grout discolouration"] },
  { slug: "lake-worth-beach", name: "Lake Worth Beach", county: "palm-beach", page: true, ownerConfirmed: false,
    zips: ["33460", "33461", "33462"], lat: 26.6168, lng: -80.0684,
    intro: "Lake Worth Beach has a large stock of older cottages, bungalows and small multifamily buildings alongside newer infill. Original and early-replacement bathrooms often have tired grout and caulk that respond well to restoration.",
    housing: "Older cottages and bungalows, small multifamily buildings and rentals.",
    commonIssues: ["Unit-turn bathroom refreshes", "Discoloured small-format tile grout", "Failed tub and shower caulk"] },
  { slug: "boynton-beach", name: "Boynton Beach", county: "palm-beach", page: true, ownerConfirmed: false,
    zips: ["33426", "33435", "33436", "33437"], lat: 26.5318, lng: -80.0905,
    intro: "Boynton Beach combines coastal condominiums near the Intracoastal with extensive 55+ and HOA communities to the west. Tile floors throughout and heavily used showers are typical, and associations often set vendor rules.",
    housing: "Coastal condos, 55+ and HOA communities, single-family homes.",
    commonIssues: ["Stained floor grout", "Shower mineral build-up", "Caulk replacement at tubs and showers"] },
  { slug: "delray-beach", name: "Delray Beach", county: "palm-beach", page: true, ownerConfirmed: false,
    zips: ["33444", "33445", "33446", "33483", "33484"], lat: 26.4615, lng: -80.0728,
    intro: "Delray Beach combines older coastal cottages, downtown townhomes and large 55+ and HOA communities to the west. Salt air near the coast and humidity inland both take a toll on grout and caulk.",
    housing: "Coastal homes, townhomes and HOA communities.",
    commonIssues: ["Mildew in caulk", "Stained floor grout", "Salt-air wear on exterior-adjacent tile"] },
  { slug: "boca-raton", name: "Boca Raton", county: "palm-beach", page: true, ownerConfirmed: false,
    zips: ["33427", "33428", "33431", "33432", "33433", "33434", "33486", "33496", "33498"], lat: 26.3683, lng: -80.1289,
    intro: "Boca Raton has a high concentration of condominiums and country-club communities, many with marble or travertine and tile from the 1990s and 2000s. Restoring existing stone and grout is often simpler than a remodel that requires association approvals.",
    housing: "Condominiums, country-club communities and single-family homes.",
    commonIssues: ["Dull marble floors", "Travertine fill and sealing", "Mineral-stained shower grout"] },
  { slug: "highland-beach", name: "Highland Beach", county: "palm-beach", page: false, ownerConfirmed: false,
    zips: ["33487"], lat: 26.3995, lng: -80.0656, intro: "", housing: "", commonIssues: [] },

  // ── Broward County ──
  { slug: "fort-lauderdale", name: "Fort Lauderdale", county: "broward", page: true, ownerConfirmed: false,
    zips: ["33301", "33304", "33305", "33306", "33308", "33309", "33311", "33312", "33315", "33316"], lat: 26.1224, lng: -80.1373,
    intro: "Fort Lauderdale has waterfront homes along the canals, beachside condos and a large hospitality sector. Condo associations and hotels need hard-surface work scheduled around residents, guests and building rules.",
    housing: "Waterfront homes, beach condos, hotels and multifamily buildings.",
    commonIssues: ["Condo shower and floor grout", "Marble in lobbies and baths", "Mineral deposits from hard water"] },
  { slug: "pompano-beach", name: "Pompano Beach", county: "broward", page: true, ownerConfirmed: false,
    zips: ["33060", "33062", "33064", "33069"], lat: 26.2379, lng: -80.1248,
    intro: "Pompano Beach has beachfront condominium towers, older canal-front homes and a growing number of renovated rentals. Coastal humidity and heavy seasonal use show up first in shower grout and caulk.",
    housing: "Beachfront condos, canal-front homes and rentals.",
    commonIssues: ["Mildew in shower grout and caulk", "Dull tile and marble floors", "Rental turnover refreshes"] },
  { slug: "deerfield-beach", name: "Deerfield Beach", county: "broward", page: true, ownerConfirmed: false,
    zips: ["33441", "33442"], lat: 26.3184, lng: -80.0998,
    intro: "Deerfield Beach includes beachside condominiums and large 55+ communities with tile throughout. Associations frequently need work scheduled around residents and building rules.",
    housing: "Beach condominiums and 55+ communities.",
    commonIssues: ["Floor grout staining", "Shower caulk failure", "Marble vanity etching"] },
  { slug: "hollywood", name: "Hollywood", county: "broward", page: true, ownerConfirmed: false,
    zips: ["33019", "33020", "33021", "33023", "33024"], lat: 26.0112, lng: -80.1495,
    intro: "Hollywood stretches from beach condominiums and the Broadwalk to established inland neighbourhoods with mid-century homes. Older bathrooms and tiled floors are common, and many buildings have association rules for contractors.",
    housing: "Beach condos, mid-century single-family homes and rentals.",
    commonIssues: ["Mid-century tile and grout restoration", "Hard-water deposits in showers", "Caulk replacement"] },
  { slug: "plantation", name: "Plantation", county: "broward", page: true, ownerConfirmed: false,
    zips: ["33317", "33322", "33324"], lat: 26.1276, lng: -80.2331,
    intro: "Plantation is largely established single-family neighbourhoods and townhome communities, with tile floors and original or once-renovated bathrooms that are now due for grout and caulk work.",
    housing: "Single-family homes and townhome communities.",
    commonIssues: ["Discoloured floor grout", "Shower grout and caulk", "Travertine sealing"] },
  { slug: "weston", name: "Weston", county: "broward", page: true, ownerConfirmed: false,
    zips: ["33326", "33327", "33331", "33332"], lat: 26.1004, lng: -80.3998,
    intro: "Weston is a planned community of HOA neighbourhoods with large-format tile, stone countertops and spacious showers. Associations often expect vendor insurance and set working hours.",
    housing: "Planned HOA communities and single-family homes.",
    commonIssues: ["Large-format floor grout", "Stone countertop sealing", "Shower mineral build-up"] },
  { slug: "davie", name: "Davie", county: "broward", page: true, ownerConfirmed: false,
    zips: ["33314", "33325", "33328", "33330"], lat: 26.0629, lng: -80.2331,
    intro: "Davie mixes ranch-style properties, newer gated communities and student and rental housing near the college campuses. Rental turnover and busy family bathrooms drive most surface work.",
    housing: "Single-family homes, gated communities and rentals.",
    commonIssues: ["Rental unit-turn refreshes", "Stained shower grout", "Caulk replacement"] },
  { slug: "coral-springs", name: "Coral Springs", county: "broward", page: true, ownerConfirmed: false,
    zips: ["33065", "33067", "33071", "33076"], lat: 26.2712, lng: -80.2706,
    intro: "Coral Springs is a planned city of family neighbourhoods and HOA communities, with tiled floors and showers that see heavy daily use.",
    housing: "Planned single-family neighbourhoods and HOA communities.",
    commonIssues: ["Floor grout discolouration", "Shower grout and caulk", "Marble vanity care"] },
];

export const flCounty = (id: string) => FL_COUNTIES.find((c) => c.id === id || c.slug === id);
export const flCountyOfCity = (slug: string) => {
  const c = FL_AREA_CITIES.find((x) => x.slug === slug);
  return c ? flCounty(c.county) : undefined;
};
/** ZIP → county: exact city ZIP first, then the county ZIP3 fallback. null = not in either county. */
export function flCountyForZip(zip: string): FlCountyId | null {
  const z = (zip || "").slice(0, 5);
  if (!/^\d{5}$/.test(z)) return null;
  const city = FL_AREA_CITIES.find((c) => c.zips.includes(z));
  if (city) return city.county;
  const c = FL_COUNTIES.find((k) => k.zip3.includes(z.slice(0, 3)));
  return c ? c.id : null;
}
