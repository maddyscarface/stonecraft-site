/**
 * City data for local SEO pages and ZIP → zone routing.
 *
 * Rules (see docs/11-seo-aeo.md):
 *  - Only `tier: "core"` cities get a landing page. Supporting cities are listed, not paged,
 *    to avoid thin duplicate content.
 *  - Intros describe housing stock and typical surface issues. They never claim jobs,
 *    offices, crews or results in that city. Add real local proof only after it exists
 *    (permissioned photos, real reviews) via `localProof`.
 *  - ZIP lists are best-effort and must be checked against USPS before launch (VERIFY).
 */

export type MarketId = "boston" | "south-florida";

export type City = {
  slug: string;
  name: string;
  market: MarketId;
  state: "MA" | "FL";
  tier: "core" | "supporting";
  zips: string[];
  lat: number;
  lng: number;
  intro: string;
  housing: string;
  commonIssues: string[];
  neighborhoods?: string[];
  /** Real, permissioned local proof only. Empty until it exists. */
  localProof?: string[];
};

export const cities: City[] = [
  // ───────────── Massachusetts — core ─────────────
  {
    slug: "boston", name: "Boston", market: "boston", state: "MA", tier: "core",
    zips: ["02109", "02110", "02111", "02113", "02203", "02222"], lat: 42.3601, lng: -71.0589,
    intro: "Downtown Boston, the North End and the Financial District mix converted commercial buildings, mid-century towers and new high-rise condos. Bathrooms range from original hex tile to large-format porcelain, and many are in buildings with strict work-hour and elevator rules.",
    housing: "Condos and apartments in converted and high-rise buildings; building-management approval is often required.",
    commonIssues: ["Darkened grout in heavily used showers", "Failed caulk at tub and shower joints", "Dull or etched marble vanities"],
    neighborhoods: ["North End", "Downtown", "Financial District", "West End"],
  },
  {
    slug: "back-bay", name: "Back Bay", market: "boston", state: "MA", tier: "core",
    zips: ["02116", "02199"], lat: 42.3503, lng: -71.081,
    intro: "Back Bay's Victorian brownstones were largely subdivided into condos and rentals, so bathrooms are often compact, upper-floor and finished in marble or small mosaic tile. Restoration avoids the access, noise and association approvals a full remodel would require.",
    housing: "Brownstone condos and rentals, frequently walk-up, with marble and mosaic finishes.",
    commonIssues: ["Etched or hazy marble floors and thresholds", "Discoloured mosaic grout", "Cracked caulk where tub meets tile"],
    neighborhoods: ["Commonwealth Ave", "Beacon St", "Marlborough St", "Newbury St"],
  },
  {
    slug: "south-end", name: "South End", market: "boston", state: "MA", tier: "core",
    zips: ["02118"], lat: 42.3388, lng: -71.0765,
    intro: "The South End's bow-front row houses hold a mix of restored originals and renovated condos with stone vanities and tiled showers. Many units changed hands in the last two decades, so surfaces installed during those renovations are now reaching the age where grout and sealant fail.",
    housing: "Row-house condos and rentals; renovated bathrooms from the 2000s and 2010s.",
    commonIssues: ["Unsealed natural stone showing water marks", "Grout staining in large-format tile showers", "Worn sealant on stone countertops"],
  },
  {
    slug: "seaport", name: "Seaport", market: "boston", state: "MA", tier: "core",
    zips: ["02210"], lat: 42.3519, lng: -71.0446,
    intro: "Seaport and the Fort Point area are dominated by newer luxury high-rises and converted warehouse lofts. Large-format porcelain, glass-walled showers and stone vanities are typical, and building management usually sets work windows and insurance requirements.",
    housing: "New-construction high-rise condos and rentals; managed buildings.",
    commonIssues: ["Soap-scum build-up on large-format shower tile", "Discoloured light grout", "Caulk failure at glass and tile joints"],
  },
  {
    slug: "beacon-hill", name: "Beacon Hill", market: "boston", state: "MA", tier: "core",
    zips: ["02108", "02114"], lat: 42.3588, lng: -71.0707,
    intro: "Beacon Hill's 19th-century row houses and narrow streets make large renovation projects slow and disruptive. Original and period-style tile, marble and small bathrooms are common, which suits careful restoration over replacement.",
    housing: "Historic row houses, condos and small rentals with period finishes.",
    commonIssues: ["Aged hex and penny-tile grout", "Hazy marble", "Old caulk and grout around clawfoot and alcove tubs"],
  },
  {
    slug: "south-boston", name: "South Boston", market: "boston", state: "MA", tier: "core",
    zips: ["02127"], lat: 42.3381, lng: -71.0476,
    intro: "South Boston blends triple-deckers, newer condo buildings and a large rental market. Bathrooms renovated during the neighbourhood's building boom often have builder-grade tile whose grout has darkened with use.",
    housing: "Triple-decker and new-build condos; high rental turnover.",
    commonIssues: ["Dark, stained floor grout", "Mildew in caulk lines", "Rental bathrooms needing a refresh between tenants"],
  },
  {
    slug: "charlestown", name: "Charlestown", market: "boston", state: "MA", tier: "core",
    zips: ["02129"], lat: 42.3782, lng: -71.0602,
    intro: "Charlestown has historic row houses near Monument Square and newer condo developments at the Navy Yard. Owners tend to keep original character where they can, so restoring existing tile and stone is often preferred to tearing it out.",
    housing: "Historic row houses and Navy Yard condos.",
    commonIssues: ["Etched marble", "Grout discolouration on kitchen and bath floors", "Failed shower caulk"],
  },
  {
    slug: "cambridge", name: "Cambridge", market: "boston", state: "MA", tier: "core",
    zips: ["02138", "02139", "02140", "02141", "02142"], lat: 42.3736, lng: -71.1097,
    intro: "Cambridge combines Victorian and triple-decker housing with one of the region's largest rental markets, driven partly by its universities. Many bathrooms are older, shared and well used—good candidates for grout restoration and resealing rather than a remodel.",
    housing: "Victorians, triple-deckers and multi-unit rentals; many shared apartments.",
    commonIssues: ["Dark grout in shared bathrooms", "Mildewed caulk", "Worn tile floors in older units"],
    neighborhoods: ["Harvard Square", "Central Square", "Porter Square", "Inman Square", "Kendall"],
  },
  {
    slug: "somerville", name: "Somerville", market: "boston", state: "MA", tier: "core",
    zips: ["02143", "02144", "02145"], lat: 42.3876, lng: -71.0995,
    intro: "Somerville's dense stock of two- and three-family homes houses many roommates and long-term renters. Bathrooms are frequently original or lightly updated, and refreshing them without demolition is often the only realistic option during a lease.",
    housing: "Two- and three-family homes; large roommate rental market.",
    commonIssues: ["Stained grout in older tile", "Caulk failure at tubs", "Rental-turn bathroom refreshes"],
    neighborhoods: ["Davis Square", "Union Square", "Teele Square", "Ball Square"],
  },
  {
    slug: "brookline", name: "Brookline", market: "boston", state: "MA", tier: "core",
    zips: ["02445", "02446", "02447"], lat: 42.3318, lng: -71.1212,
    intro: "Brookline ranges from Coolidge Corner apartment blocks to large single-family homes in Fisher Hill and Chestnut Hill. Marble, travertine and original tile are common, and owners often want to preserve them.",
    housing: "Pre-war apartment buildings, condos and single-family homes.",
    commonIssues: ["Dull or etched marble", "Discoloured grout in pre-war tile", "Stone countertops needing resealing"],
    neighborhoods: ["Coolidge Corner", "Brookline Village", "Washington Square", "Chestnut Hill"],
  },
  {
    slug: "newton", name: "Newton", market: "boston", state: "MA", tier: "core",
    zips: ["02458", "02459", "02460", "02461", "02462", "02464", "02465", "02466", "02467", "02468"], lat: 42.337, lng: -71.2092,
    intro: "Newton's villages are mostly single-family colonials, Victorians and mid-century homes, many with bathrooms and kitchens updated a decade or two ago. Restoration is a common step before listing a home or instead of a full bathroom remodel.",
    housing: "Single-family homes across 13 villages; frequent pre-listing preparation.",
    commonIssues: ["Grout darkening in master showers", "Hazy marble and travertine", "Kitchen floor grout staining"],
    neighborhoods: ["Newton Centre", "Newtonville", "West Newton", "Newton Highlands", "Chestnut Hill", "Auburndale"],
  },
  {
    slug: "wellesley", name: "Wellesley", market: "boston", state: "MA", tier: "core",
    zips: ["02481", "02482"], lat: 42.2965, lng: -71.2924,
    intro: "Wellesley's larger single-family homes often feature natural stone—marble baths, travertine floors and granite or quartzite kitchens. Those surfaces need stone-safe products and periodic sealing to keep their finish.",
    housing: "Large single-family homes with natural stone finishes.",
    commonIssues: ["Etching on marble vanities and floors", "Travertine with open or dirty holes", "Countertop sealant worn through"],
  },
  {
    slug: "needham", name: "Needham", market: "boston", state: "MA", tier: "core",
    zips: ["02492", "02494"], lat: 42.2809, lng: -71.2378,
    intro: "Needham's family homes see heavy daily use in kitchens, mudrooms and kids' bathrooms. Grout in entryways and kitchens takes the brunt of winter salt and sand tracked in from outside.",
    housing: "Single-family homes; busy family kitchens and mudrooms.",
    commonIssues: ["Salt- and sand-stained entry and mudroom grout", "Kids' bathroom grout and caulk", "Kitchen floor grout"],
  },
  {
    slug: "waltham", name: "Waltham", market: "boston", state: "MA", tier: "core",
    zips: ["02451", "02452", "02453", "02454"], lat: 42.3765, lng: -71.2356,
    intro: "Waltham mixes older two-family homes, newer apartment communities and a large student and young-professional rental market. Landlords and renters both look for quick bathroom refreshes between leases.",
    housing: "Two-families, apartment complexes and condos.",
    commonIssues: ["Rental-turn grout and caulk", "Stained tub surrounds", "Builder-grade tile floors"],
  },
  {
    slug: "watertown", name: "Watertown", market: "boston", state: "MA", tier: "core",
    zips: ["02472"], lat: 42.3709, lng: -71.1828,
    intro: "Watertown's two-family homes and newer apartment buildings near the river house a mix of owners and renters. Many bathrooms have original or 1990s tile that can be brought back with cleaning, colour sealing and new caulk.",
    housing: "Two-family homes and newer apartment buildings.",
    commonIssues: ["Discoloured grout", "Caulk mildew", "Worn floor tile in rentals"],
  },
  {
    slug: "belmont", name: "Belmont", market: "boston", state: "MA", tier: "core",
    zips: ["02478"], lat: 42.3959, lng: -71.1787,
    intro: "Belmont has well-kept colonials and two-family homes, many with original tiled bathrooms from the early and mid-20th century. Owners frequently want to keep that tile and restore it rather than replace it.",
    housing: "Colonials and two-family homes with original tile.",
    commonIssues: ["Aged grout in vintage tile", "Old caulk around tubs", "Hazy marble thresholds"],
  },
  {
    slug: "arlington", name: "Arlington", market: "boston", state: "MA", tier: "core",
    zips: ["02474", "02476"], lat: 42.4154, lng: -71.1565,
    intro: "Arlington's housing is largely two-family and single-family homes along the Mass Ave corridor and surrounding hills. Bathrooms are often modest in size and well used, which suits a one- or two-day refresh.",
    housing: "Single- and two-family homes; owner-occupied and rental.",
    commonIssues: ["Dark grout", "Failed shower caulk", "Floor grout in kitchens"],
  },
  {
    slug: "lexington", name: "Lexington", market: "boston", state: "MA", tier: "core",
    zips: ["02420", "02421"], lat: 42.4473, lng: -71.2245,
    intro: "Lexington's mid-century and newer single-family homes often have stone kitchens and tiled primary baths installed during later renovations. Periodic sealing and grout restoration keep those finishes looking current.",
    housing: "Mid-century and newer single-family homes.",
    commonIssues: ["Countertop sealing", "Grout discolouration", "Etched marble"],
  },
  {
    slug: "natick", name: "Natick", market: "boston", state: "MA", tier: "core",
    zips: ["01760"], lat: 42.2835, lng: -71.3495,
    intro: "Natick includes established neighbourhoods, newer subdivisions and condo communities. Builder-grade tile and grout from the 1990s and 2000s is common and often responds well to deep cleaning and colour sealing.",
    housing: "Single-family homes, subdivisions and condo communities.",
    commonIssues: ["Builder-grade grout staining", "Shower caulk", "Mudroom and entry grout"],
  },
  {
    slug: "framingham", name: "Framingham", market: "boston", state: "MA", tier: "core",
    zips: ["01701", "01702"], lat: 42.2793, lng: -71.4162,
    intro: "Framingham has a broad mix of single-family homes, multi-family rentals and apartment complexes. Landlords with several units look for consistent, repeatable bathroom refreshes at turnover.",
    housing: "Single-family, multi-family and apartment complexes.",
    commonIssues: ["Unit-turn bathroom refreshes", "Stained floor grout", "Caulk replacement"],
  },

  // ───────────── Florida — core ─────────────
  {
    slug: "west-palm-beach", name: "West Palm Beach", market: "south-florida", state: "FL", tier: "core",
    zips: ["33401", "33405", "33407", "33409", "33411", "33412", "33413", "33415", "33417"], lat: 26.7153, lng: -80.0534,
    intro: "West Palm Beach ranges from historic neighbourhoods like El Cid and Flamingo Park to downtown condo towers. South Florida's hard water and humidity mean mineral build-up and mildew are common in showers and on tile floors.",
    housing: "Historic single-family homes, downtown condos and rentals.",
    commonIssues: ["Mineral deposits on shower tile and glass joints", "Mildew in grout and caulk", "Large-format floor tile grout"],
  },
  {
    slug: "palm-beach", name: "Palm Beach", market: "south-florida", state: "FL", tier: "core",
    zips: ["33480"], lat: 26.7056, lng: -80.0364,
    intro: "Homes and condominiums on Palm Beach often feature marble, limestone and other natural stone that needs stone-safe care. Many owners are seasonal, so work is often scheduled around arrival dates or completed while the residence is unoccupied.",
    housing: "Estates and condominiums with extensive natural stone; many seasonal residents.",
    commonIssues: ["Etched and dull marble", "Limestone and coral-stone staining", "Sealant renewal before the season"],
  },
  {
    slug: "palm-beach-gardens", name: "Palm Beach Gardens", market: "south-florida", state: "FL", tier: "core",
    zips: ["33410", "33418"], lat: 26.8234, lng: -80.1387,
    intro: "Palm Beach Gardens is dominated by planned and gated communities with HOA standards and large-format tile throughout. Floors and showers take daily wear, and many communities require vendor insurance before work.",
    housing: "Gated and planned communities; single-family homes and villas.",
    commonIssues: ["Large-format floor tile grout", "Shower mineral build-up", "Travertine pool-area and lanai stone"],
  },
  {
    slug: "boca-raton", name: "Boca Raton", market: "south-florida", state: "FL", tier: "core",
    zips: ["33427", "33428", "33431", "33432", "33433", "33434", "33486", "33496", "33498"], lat: 26.3683, lng: -80.1289,
    intro: "Boca Raton has a high concentration of condominiums and country-club communities, many with marble or travertine and tile from the 1990s and 2000s. Restoring existing stone and grout is often simpler than a remodel that requires association approvals.",
    housing: "Condominiums, country-club communities and single-family homes.",
    commonIssues: ["Dull marble floors", "Travertine fill and sealing", "Mineral-stained shower grout"],
  },
  {
    slug: "delray-beach", name: "Delray Beach", market: "south-florida", state: "FL", tier: "core",
    zips: ["33444", "33445", "33446", "33483", "33484"], lat: 26.4615, lng: -80.0728,
    intro: "Delray Beach combines older coastal cottages, downtown townhomes and large 55+ and HOA communities to the west. Salt air near the coast and humidity inland both take a toll on grout and caulk.",
    housing: "Coastal homes, townhomes and HOA communities.",
    commonIssues: ["Mildew in caulk", "Stained floor grout", "Salt-air wear on exterior-adjacent tile"],
  },
  {
    slug: "fort-lauderdale", name: "Fort Lauderdale", market: "south-florida", state: "FL", tier: "core",
    zips: ["33301", "33304", "33305", "33306", "33308", "33309", "33311", "33312", "33315", "33316"], lat: 26.1224, lng: -80.1373,
    intro: "Fort Lauderdale has waterfront homes along the canals, beachside condos and a large hospitality sector. Condo associations and hotels need hard-surface work scheduled around residents, guests and building rules.",
    housing: "Waterfront homes, beach condos, hotels and multifamily buildings.",
    commonIssues: ["Condo shower and floor grout", "Marble in lobbies and baths", "Mineral deposits from hard water"],
  },

  // ───────────── Florida — supporting (listed, not paged) ─────────────
  { slug: "boynton-beach", name: "Boynton Beach", market: "south-florida", state: "FL", tier: "supporting", zips: ["33426", "33435", "33436", "33437"], lat: 26.5318, lng: -80.0905, intro: "", housing: "", commonIssues: [] },
  { slug: "highland-beach", name: "Highland Beach", market: "south-florida", state: "FL", tier: "supporting", zips: ["33487"], lat: 26.3995, lng: -80.0656, intro: "", housing: "", commonIssues: [] },
  { slug: "pompano-beach", name: "Pompano Beach", market: "south-florida", state: "FL", tier: "supporting", zips: ["33060", "33062", "33064", "33069"], lat: 26.2379, lng: -80.1248, intro: "", housing: "", commonIssues: [] },
  { slug: "deerfield-beach", name: "Deerfield Beach", market: "south-florida", state: "FL", tier: "supporting", zips: ["33441", "33442"], lat: 26.3184, lng: -80.0998, intro: "", housing: "", commonIssues: [] },
  { slug: "weston", name: "Weston", market: "south-florida", state: "FL", tier: "supporting", zips: ["33326", "33327", "33331", "33332"], lat: 26.1004, lng: -80.3998, intro: "", housing: "", commonIssues: [] },
  { slug: "plantation", name: "Plantation", market: "south-florida", state: "FL", tier: "supporting", zips: ["33317", "33322", "33324", "33388"], lat: 26.1276, lng: -80.2331, intro: "", housing: "", commonIssues: [] },
  { slug: "coral-springs", name: "Coral Springs", market: "south-florida", state: "FL", tier: "supporting", zips: ["33065", "33067", "33071", "33076"], lat: 26.2712, lng: -80.2706, intro: "", housing: "", commonIssues: [] },
];

export const coreCities = (market?: MarketId) =>
  cities.filter((c) => c.tier === "core" && (!market || c.market === market));

export const citiesFor = (market: MarketId) => cities.filter((c) => c.market === market);

export const findCity = (market: MarketId, slug: string) =>
  cities.find((c) => c.market === market && c.slug === slug);

export const cityByZip = (zip: string) => cities.find((c) => c.zips.includes(zip.slice(0, 5)));
