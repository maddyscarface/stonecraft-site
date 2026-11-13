export type FAQ = { q: string; a: string };

export type Service = {
  slug: string;
  name: string;
  short: string;
  h1: string;
  intro: string;
  included: string[];
  goodFit: string[];
  /** Honest limits — when restoration is NOT the right answer. */
  notFit: string[];
  typicalDuration: string;
  priceRangeKey?: string;
  faq: FAQ[];
  seoTitle: string;
  metaDescription: string;
  category: "residential" | "commercial" | "both";
};

const commonLimits = [
  "Tile that is loose, hollow-sounding across large areas, or cracked through",
  "Shower walls that flex or show water damage behind the tile",
  "Active leaks — these need a plumber first",
];

export const services: Service[] = [
  {
    slug: "shower-restoration",
    name: "Shower Restoration",
    short: "Deep clean, grout repair, recaulk and seal the full shower so it looks and performs like it should.",
    h1: "Shower Restoration",
    intro: "Most showers that look worn out aren't failing—they're coated in soap scum, mineral film and old sealant, with caulk that has cracked or mildewed. A full restoration addresses each layer: cleaning, grout repair where needed, new caulk at the change-of-plane joints, and sealing.",
    included: ["Inspection for loose tile, soft walls and moisture", "Deep clean of tile and grout", "Spot regrouting where grout is missing or cracked", "Removal and replacement of failed caulk", "Grout colour sealing or clear sealing", "Care instructions for keeping it clean"],
    goodFit: ["Discoloured or dark grout", "Soap scum and mineral film that regular cleaning won't remove", "Cracked, peeling or mildewed caulk", "A shower that is structurally sound but looks tired"],
    notFit: commonLimits,
    typicalDuration: "Most single showers take one working day. Some need a second visit for curing or additional repair—we'll tell you in the quote.",
    priceRangeKey: "shower",
    faq: [
      { q: "Can I use the shower the same day?", a: "It depends on the products used. Caulk and some sealers need curing time; most showers are usable within 24 hours. Your quote will state the cure time." },
      { q: "Will the grout look new?", a: "Colour sealing gives grout a uniform colour and a protective coating. Results depend on the grout's condition, which is why we review photos first." },
      { q: "What if you find a problem behind the tile?", a: "We stop and show you. If the wall needs repair or replacement, we'll tell you plainly rather than covering it up." },
    ],
    seoTitle: "Shower Restoration & Recaulking | StoneCraft",
    metaDescription: "Shower grout cleaning, repair, sealing and recaulking with a photo-first assessment in eligible service areas.",
    category: "both",
  },
  {
    slug: "tile-grout-restoration",
    name: "Tile & Grout Restoration",
    short: "Extraction-level cleaning of tile floors and walls to remove embedded dirt that mopping can't reach.",
    h1: "Tile & Grout Restoration",
    intro: "Grout is porous. Over time it absorbs dirt, cleaning residue and spills until the lines look permanently dark. Professional cleaning with agitation and extraction removes what's embedded, and sealing helps keep it from coming back.",
    included: ["Pre-inspection and test area", "Surface-appropriate cleaner and agitation", "Hot-water extraction or wet-vac recovery", "Neutralising rinse", "Optional clear seal or colour seal"],
    goodFit: ["Kitchen, bathroom, entry and mudroom floors", "Grout that has darkened over years of mopping", "Floors before a sale, move-in or lease turn"],
    notFit: ["Grout that is crumbling or missing (needs regrouting)", ...commonLimits.slice(0, 1)],
    typicalDuration: "Most residential floors are completed in a few hours; sealing adds dry time.",
    priceRangeKey: "floor",
    faq: [
      { q: "Is this just steam cleaning?", a: "No. We use cleaners matched to the tile and grout type, mechanical agitation and extraction to recover the dirty water, then rinse and neutralise." },
      { q: "How long does it stay clean?", a: "Sealing slows re-soiling considerably. Routine cleaning with a pH-neutral cleaner helps it last; we'll give you care guidance." },
    ],
    seoTitle: "Tile & Grout Cleaning and Restoration | StoneCraft",
    metaDescription: "Deep tile and grout cleaning with extraction and sealing for kitchens, bathrooms and entries. Send photos for a free assessment.",
    category: "both",
  },
  {
    slug: "grout-color-sealing",
    name: "Grout Colour Sealing",
    short: "A coloured, protective sealant applied to clean grout for a uniform look and stain resistance.",
    h1: "Grout Colour Sealing",
    intro: "Even after deep cleaning, grout can be blotchy from years of uneven wear. Colour sealing coats each grout line with a pigmented sealant so the floor or wall reads as one consistent colour—and the coating resists future staining.",
    included: ["Deep clean and dry time", "Colour matching or a new colour choice", "Line-by-line application", "Buffing to remove haze from tile faces", "Cure-time and care instructions"],
    goodFit: ["Blotchy or uneven grout", "Changing grout colour without regrouting", "High-traffic floors that stain easily"],
    notFit: ["Epoxy grout (colour sealant won't bond reliably)", "Grout that is cracked or missing", "Some natural stone with open pores—assessed case by case"],
    typicalDuration: "Usually completed the same day as cleaning; foot traffic may need to wait several hours.",
    priceRangeKey: "colorseal",
    faq: [
      { q: "Can I change my grout colour?", a: "Usually, yes—especially from lighter to darker or to a neutral. We'll show colour options during the quote." },
      { q: "Does it work on epoxy grout?", a: "Generally no. If photos or inspection suggest epoxy grout, we'll recommend a different approach." },
    ],
    seoTitle: "Grout Colour Sealing — Uniform, Stain-Resistant Grout | StoneCraft",
    metaDescription: "Restore uneven or stained grout to one consistent colour with professional grout colour sealing. Free photo assessment.",
    category: "both",
  },
  {
    slug: "regrouting-caulking",
    name: "Regrouting & Caulking",
    short: "Replace failed caulk and cracked or missing grout before water gets behind the tile.",
    h1: "Regrouting & Caulking",
    intro: "Caulk at corners and where the tub or tray meets the wall is the first line of defence against water. When it cracks, peels or grows mildew, it needs to come out completely and be replaced. Cracked or missing grout lines are cut out and regrouted.",
    included: ["Full removal of old caulk (not caulking over it)", "Joint cleaning and dry testing", "New silicone or hybrid caulk as appropriate", "Cutting out and replacing failed grout lines", "Colour matching to existing grout where possible"],
    goodFit: ["Peeling or mildewed caulk", "Gaps at tub and shower joints", "Cracked or missing grout lines"],
    notFit: ["Joints that stay wet—these indicate a leak that must be found first", ...commonLimits.slice(0, 2)],
    typicalDuration: "Often a few hours. Caulk typically needs up to 24 hours to cure before water exposure.",
    priceRangeKey: "caulk",
    faq: [
      { q: "Why does my caulk keep getting mouldy?", a: "Usually because new caulk was applied over old caulk or onto a damp joint. We remove it fully and dry-test before applying." },
    ],
    seoTitle: "Shower Regrouting & Caulk Replacement | StoneCraft",
    metaDescription: "Remove failed caulk, replace cracked grout and protect your shower from water damage. Free photo assessment.",
    category: "both",
  },
  {
    slug: "marble-stone-restoration",
    name: "Marble & Natural Stone Restoration",
    short: "Clean, hone, polish and seal marble, travertine, limestone and granite with stone-safe methods.",
    h1: "Marble & Natural Stone Restoration",
    intro: "Natural stone reacts to acids. Everyday cleaners, citrus and some bathroom products etch marble and limestone, leaving dull rings and paths. Honing and polishing can remove etching and restore the finish; sealing reduces staining.",
    included: ["Stone identification and test area", "Stone-safe cleaning (never acidic)", "Honing to remove etching and light scratches", "Polishing to the finish you want", "Impregnating sealer where appropriate"],
    goodFit: ["Dull or etched marble floors and vanities", "Travertine with dirty or open holes", "Stone that has lost its shine"],
    notFit: ["Deep cracks or broken stone", "Stone with severe staining from inside the slab—assessed case by case"],
    typicalDuration: "Depends on area and condition; floors may take a full day or more.",
    priceRangeKey: "marble",
    faq: [
      { q: "Can etching be removed?", a: "Light to moderate etching usually can, through honing and polishing. Deep damage may improve without disappearing entirely—we'll set expectations from photos and a test area." },
      { q: "Is marble restoration safe for my home?", a: "We use stone-safe products and contain slurry and water. We'll protect adjacent surfaces." },
    ],
    seoTitle: "Marble & Stone Restoration | StoneCraft",
    metaDescription: "Explore marble, countertop and natural stone restoration for homes and properties. Request a photo assessment.",
    category: "both",
  },
  {
    slug: "floor-restoration",
    name: "Tile Floor Restoration",
    short: "Restore heavily used tile floors in homes, lobbies, corridors and restrooms.",
    h1: "Tile Floor Restoration",
    intro: "High-traffic tile floors collect embedded soil, old finish and stains in grout lines. Restoration combines deep cleaning, stripping of old coatings where present, grout repair and sealing to bring a floor back into a maintainable condition.",
    included: ["Assessment of tile, grout and any existing coatings", "Coating strip where needed", "Deep clean and extraction", "Grout repair", "Sealing and maintenance plan"],
    goodFit: ["Kitchens, entries, lobbies and corridors", "Restroom floors", "Floors with build-up from old wax or coatings"],
    notFit: ["Floors with widespread loose or cracked tile"],
    typicalDuration: "Scoped per area. Commercial floors can be phased by zone or done after hours.",
    priceRangeKey: "floor",
    faq: [{ q: "Can you work after hours?", a: "For commercial properties, yes—subject to scheduling. We plan work zones around your operations." }],
    seoTitle: "Tile Floor Restoration for Homes & Facilities | StoneCraft",
    metaDescription: "Deep cleaning, coating removal, grout repair and sealing for high-traffic tile floors. Residential and commercial.",
    category: "both",
  },
  {
    slug: "countertop-sealing",
    name: "Countertop Sealing",
    short: "Clean and reseal granite, marble and other natural stone countertops.",
    h1: "Stone Countertop Sealing",
    intro: "Natural stone countertops are sealed when installed, but sealers wear down. If water darkens the stone instead of beading, it's absorbing—and oils, wine and coffee can stain it. Cleaning and resealing restores protection.",
    included: ["Water test to confirm absorption", "Deep clean and residue removal", "Impregnating sealer application", "Care guidance"],
    goodFit: ["Granite, marble, quartzite and soapstone that darken when wet", "Countertops before a sale or move-in"],
    notFit: ["Quartz (engineered stone) generally doesn't need sealing—we'll say so"],
    typicalDuration: "Typically a few hours including cure time.",
    priceRangeKey: "countertop",
    faq: [{ q: "How often should stone be resealed?", a: "It varies by stone and use. A simple water-drop test tells you when it's time." }],
    seoTitle: "Granite & Marble Countertop Sealing | StoneCraft",
    metaDescription: "Protect natural stone countertops from stains with professional cleaning and resealing.",
    category: "residential",
  },
  {
    slug: "commercial-restoration",
    name: "Commercial Restoration Programs",
    short: "Scheduled restroom, floor and hard-surface restoration for facilities, with documented scopes.",
    h1: "Commercial Tile, Grout & Stone Restoration",
    intro: "Facilities need restoration that fits around patients, students, guests and residents. We scope work by area, schedule it into permitted windows, phase restroom access, and document conditions before and after so facility teams have a record.",
    included: ["Site walk and written scope by area", "Work-window and access planning", "Phased restroom or zone closures", "Before/after photo documentation", "Completion report and maintenance recommendations", "Recurring program options"],
    goodFit: ["Restrooms, locker rooms and shower areas", "Lobbies, corridors and common areas", "Multi-building or multi-property portfolios"],
    notFit: ["Projects requiring tile replacement at scale (we'll refer or partner)", "Work requiring licensed trades we don't hold"],
    typicalDuration: "Scoped per site; work can be phased across nights or weekends.",
    faq: [
      { q: "Do you provide a certificate of insurance?", a: "We provide a COI naming your organisation on request as part of vendor onboarding. (VERIFY coverage limits before quoting.)" },
      { q: "Can you work within infection-control or facility rules?", a: "We follow the facility's access, PPE and work-zone requirements and build them into the scope. Specific healthcare protocols are confirmed with your team during the site walk." },
    ],
    seoTitle: "Commercial Tile & Grout Restoration | StoneCraft",
    metaDescription: "Commercial tile, grout and stone restoration for managed properties. Request a scoped walkthrough and service plan.",
    category: "commercial",
  },
];

export const findService = (slug: string) => services.find((s) => s.slug === slug);

/**
 * Owner-approved public price ranges (Boston only — from the StoneCraft Boston spec).
 * These are guidance, not quotes. Florida shows "priced after assessment" until approved.
 */
/**
 * Build 04 §2: preliminary ranges are shown only when the owner has reviewed them. These ranges
 * come from the owner's Boston spec; set to false to hide every public range site-wide (all pages
 * then show "priced after your photo assessment"). [OWNER TO RE-CONFIRM for 2026.]
 */
export const PRICE_RANGES_OWNER_REVIEWED = true;
export const publicPriceRanges: Record<string, { label: string; range: string }> = {
  shower: { label: "Shower restoration", range: "$1,200 – $2,500" },
  floor: { label: "Tile & grout floor", range: "$600 – $1,800" },
  marble: { label: "Marble restoration", range: "$800 – $2,200" },
  colorseal: { label: "Grout colour sealing", range: "$400 – $900" },
};
