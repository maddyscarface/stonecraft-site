/**
 * Photo manifest — every image on the site, its source and licence.
 *
 * ALL images below are licensed stock photography from Pexels (https://www.pexels.com/license/):
 * free for commercial use, no attribution required, may not be sold unaltered or used to imply
 * endorsement. They are ILLUSTRATIVE ONLY and must never be captioned or presented as StoneCraft
 * projects, customers or staff. Replace with real, permissioned job photos via src/config/gallery.ts.
 */
export type Photo = { src: string; width: number; height: number; alt: string; source: string; photographer?: string; license: "Pexels License"; stock: true };

export const photos = {
  "bath-marble-bright": { src: "/images/bath-marble-bright.webp", width: 2560, height: 1920, alt: "Bright modern bathroom with marble wall and floor tile", source: "https://www.pexels.com/photo/33529504/", photographer: "Essentia Media", license: "Pexels License", stock: true },
  "shower-marble-glass": { src: "/images/shower-marble-glass.webp", width: 2560, height: 1709, alt: "Marble-clad shower behind a frameless glass screen", source: "https://www.pexels.com/photo/8082223/", photographer: "Max Vakhtbovych", license: "Pexels License", stock: true },
  "bath-marble-gold": { src: "/images/bath-marble-gold.webp", width: 1600, height: 1067, alt: "Marble bathroom with brushed-gold fixtures", source: "https://www.pexels.com/photo/19141076/", photographer: "Patrick Bohn", license: "Pexels License", stock: true },
  "bath-tub-shower": { src: "/images/bath-tub-shower.webp", width: 1600, height: 1066, alt: "Bathroom with soaking tub and glass shower with marble accents", source: "https://www.pexels.com/photo/7601171/", photographer: "Curtis Adams", license: "Pexels License", stock: true },
  "vanity-dark-marble": { src: "/images/vanity-dark-marble.webp", width: 2560, height: 1709, alt: "Dark marble vanity wall with backlit mirror", source: "https://www.pexels.com/photo/6492399/", license: "Pexels License", stock: true },
  "shower-glass-modern": { src: "/images/shower-glass-modern.webp", width: 1600, height: 1066, alt: "Grey stone-look tile shower with glass enclosure", source: "https://www.pexels.com/photo/37338625/", license: "Pexels License", stock: true },
  "texture-marble-white": { src: "/images/texture-marble-white.webp", width: 1600, height: 1066, alt: "Close-up of white marble with soft grey veining", source: "https://www.pexels.com/photo/4709423/", license: "Pexels License", stock: true },
  "texture-marble-veined": { src: "/images/texture-marble-veined.webp", width: 2560, height: 1706, alt: "Polished white marble slab with bold grey veining", source: "https://www.pexels.com/photo/5623225/", license: "Pexels License", stock: true },
  "tile-scrub-cleaning": { src: "/images/tile-scrub-cleaning.webp", width: 1200, height: 1600, alt: "Tile surface being scrubbed with a brush during cleaning", source: "https://www.pexels.com/photo/32908422/", photographer: "Alejandro Robles Duque", license: "Pexels License", stock: true },
  "tile-patterned-closeup": { src: "/images/tile-patterned-closeup.webp", width: 2560, height: 1707, alt: "Close-up of green and white patterned ceramic tile", source: "https://www.pexels.com/photo/9598153/", photographer: "Erik Mclean", license: "Pexels License", stock: true },
  "shower-stone-wall": { src: "/images/shower-stone-wall.webp", width: 900, height: 1600, alt: "Shower with a natural stone feature wall", source: "https://www.pexels.com/photo/28297756/", license: "Pexels License", stock: true },
  "bath-subway-grey": { src: "/images/bath-subway-grey.webp", width: 2560, height: 1918, alt: "Apartment bathroom with grey subway tile walls", source: "https://www.pexels.com/photo/8143708/", license: "Pexels License", stock: true },
  "bath-mosaic": { src: "/images/bath-mosaic.webp", width: 1600, height: 1068, alt: "Bathroom with mosaic and stone-look wall tile", source: "https://www.pexels.com/photo/7147283/", license: "Pexels License", stock: true },
  "restroom-elegant": { src: "/images/restroom-elegant.webp", width: 1200, height: 1600, alt: "Public restroom with stone counters and tiled walls", source: "https://www.pexels.com/photo/27581257/", license: "Pexels License", stock: true },
  "restroom-sinks": { src: "/images/restroom-sinks.webp", width: 1600, height: 1200, alt: "Shared restroom with twin basins under windows", source: "https://www.pexels.com/photo/17958218/", license: "Pexels License", stock: true },
  "hotel-foyer-marble": { src: "/images/hotel-foyer-marble.webp", width: 2560, height: 1707, alt: "Hotel foyer with inlaid marble floor and grand staircase", source: "https://www.pexels.com/photo/14011664/", photographer: "Quang Nguyen Vinh", license: "Pexels License", stock: true },
  "hotel-lobby": { src: "/images/hotel-lobby.webp", width: 2560, height: 1704, alt: "Hotel lobby with polished marble flooring", source: "https://www.pexels.com/photo/19689235/", photographer: "Anthony Rahayel", license: "Pexels License", stock: true },
  "hospital-corridor": { src: "/images/hospital-corridor.webp", width: 2400, height: 3200, alt: "Clean hospital corridor with tiled floor", source: "https://www.pexels.com/photo/33812023/", license: "Pexels License", stock: true },
  "campus-coral-gables": { src: "/images/campus-coral-gables.webp", width: 1600, height: 1066, alt: "University campus walkway in Coral Gables, Florida", source: "https://www.pexels.com/photo/31039027/", license: "Pexels License", stock: true },
  "campus-students": { src: "/images/campus-students.webp", width: 1600, height: 1066, alt: "Students outside a university building", source: "https://www.pexels.com/photo/7683694/", license: "Pexels License", stock: true },
  "lobby-residential": { src: "/images/lobby-residential.webp", width: 1600, height: 1068, alt: "Residential building lobby with stone stair and neutral finishes", source: "https://www.pexels.com/photo/7031907/", license: "Pexels License", stock: true },
  "lobby-atrium": { src: "/images/lobby-atrium.webp", width: 1600, height: 1066, alt: "Bright building atrium lobby with stone floor", source: "https://www.pexels.com/photo/5751698/", license: "Pexels License", stock: true },
  "kitchen-marble-island": { src: "/images/kitchen-marble-island.webp", width: 1600, height: 1066, alt: "Kitchen with marble countertops and island", source: "https://www.pexels.com/photo/37677516/", license: "Pexels License", stock: true },
  "kitchen-island-marble": { src: "/images/kitchen-island-marble.webp", width: 1600, height: 1066, alt: "Kitchen island with marble top", source: "https://www.pexels.com/photo/8031965/", license: "Pexels License", stock: true },
  "boston-back-bay-brownstone": { src: "/images/boston-back-bay-brownstone.webp", width: 2400, height: 3200, alt: "Historic brownstone in Boston's Back Bay", source: "https://www.pexels.com/photo/38921904/", license: "Pexels License", stock: true },
  "boston-brownstone-autumn": { src: "/images/boston-brownstone-autumn.webp", width: 1200, height: 1600, alt: "Brownstone row with autumn trees, Boston", source: "https://www.pexels.com/photo/34535647/", license: "Pexels License", stock: true },
  "florida-coastal-building": { src: "/images/florida-coastal-building.webp", width: 1800, height: 3200, alt: "Modern coastal residential building, Florida", source: "https://www.pexels.com/photo/38714454/", license: "Pexels License", stock: true },
  "florida-palm": { src: "/images/florida-palm.webp", width: 2560, height: 1707, alt: "Palm tree against a blue sky", source: "https://www.pexels.com/photo/5011355/", license: "Pexels License", stock: true },
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;
export const photo = (k: PhotoKey): Photo => photos[k];

/** Art direction: which illustrative photo leads each service / segment / market page. */
export const serviceImage: Record<string, PhotoKey> = {
  "shower-restoration": "shower-marble-glass",
  "tile-grout-restoration": "bath-mosaic",
  "grout-color-sealing": "shower-glass-modern",
  "regrouting-caulking": "bath-tub-shower",
  "marble-stone-restoration": "bath-marble-gold",
  "floor-restoration": "hotel-foyer-marble",
  "countertop-sealing": "kitchen-marble-island",
  "commercial-restoration": "restroom-elegant",
};

export const segmentImage: Record<string, PhotoKey> = {
  homeowners: "bath-marble-bright",
  renters: "bath-subway-grey",
  landlords: "lobby-residential",
  commercial: "hotel-lobby",
  hospitals: "hospital-corridor",
  "universities-schools": "campus-students",
  "hotels-hospitality": "hotel-foyer-marble",
  "hoa-condos": "lobby-atrium",
  "property-management": "lobby-residential",
};

export const marketImage: Record<string, PhotoKey> = {
  boston: "boston-back-bay-brownstone",
  "south-florida": "florida-coastal-building",
};

/**
 * Macro before/after pairs for the comparison slider (spec §1).
 * The AFTER is a licensed Pexels stock photo (cropped). The BEFORE is a digital simulation made from the
 * SAME photo (grime along the grout joints, dulled glaze, soap-film haze, etch marks), so the camera angle
 * matches exactly. They are NOT StoneCraft work and always render with an "Illustrative" badge.
 * Generated by scripts/make-before-after.py. Replace with real, permissioned job pairs in src/config/gallery.ts.
 */
export type BeforeAfterPair = { id: string; label: string; detail: string; before: string; after: string; alt: string; source: string; photographer?: string };
export const beforeAfterPairs: BeforeAfterPair[] = [
  { id: "grout-joint", label: "Grout joint", detail: "Deep clean and colour seal", before: "/images/ba-grout-joint-before.webp", after: "/images/ba-grout-joint-after.webp", alt: "Close-up of porcelain tile grout joints", source: "https://www.pexels.com/photo/40228980/", photographer: "Jakub Grygier" },
  { id: "shower", label: "Shower", detail: "Clean, regrout and recaulk", before: "/images/ba-shower-before.webp", after: "/images/ba-shower-after.webp", alt: "Subway-tile walk-in shower", source: photos["bath-subway-grey"].source },
  { id: "polished-stone", label: "Polished stone", detail: "Hone, polish and seal marble", before: "/images/ba-polished-stone-before.webp", after: "/images/ba-polished-stone-after.webp", alt: "Polished white marble surface", source: photos["texture-marble-white"].source },
  { id: "porcelain-floor", label: "Porcelain floor", detail: "Restore high-traffic floor tile", before: "/images/ba-porcelain-floor-before.webp", after: "/images/ba-porcelain-floor-after.webp", alt: "Large-format porcelain floor tile in a corridor", source: photos["hospital-corridor"].source },
  { id: "commercial-hallway", label: "Commercial hallway", detail: "Night-shift floor restoration", before: "/images/ba-commercial-hallway-before.webp", after: "/images/ba-commercial-hallway-after.webp", alt: "Hotel corridor with patterned stone floor", source: photos["hotel-lobby"].source },
];
