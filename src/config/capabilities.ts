/** Single source for the capabilities page and generated PDF (scripts/build-assets.py reads the JSON export). */
export const capabilities = {
  overview: "StoneCraft restores existing tile, grout, caulk and natural stone in occupied commercial and residential properties. We scope by area, schedule work into permitted windows, phase closures so facilities stay operational, and document every area before and after.",
  services: [
    "Restroom floor and wall tile and grout restoration",
    "Grout repair, regrouting and colour/clear sealing",
    "Caulk removal and replacement at wet-area joints",
    "Shower, locker-room and pool/amenity wet-area restoration",
    "Marble and natural stone cleaning, honing, polishing and sealing",
    "Hard-floor restoration for lobbies and corridors",
    "Recurring maintenance programs across buildings and properties",
  ],
  method: [
    "Site assessment request with building, restroom and square-footage counts",
    "Site walk with facilities to confirm access, hours, PPE and work-zone rules",
    "Written scope by area with phasing plan and schedule",
    "Pilot area (optional) to confirm results and production rate",
    "Phased work in permitted windows (nights, weekends, academic breaks)",
    "Before/after photo log and completion report per phase",
  ],
  differentiators: [
    "Restoration-first: extends surface life without replacement where tile is sound",
    "Honest scoping: we identify areas that need replacement rather than covering them up",
    "Documentation suitable for facility records and capital planning",
    "One vendor across multiple buildings and markets (Greater Boston and Southeast Florida)",
  ],
  sectors: ["Hospitals & healthcare", "Universities, colleges & schools", "Hotels & hospitality", "HOAs & condominium associations", "Multifamily & property management", "Commercial office & retail common areas"],
  companyData: [
    ["Legal entity", "VERIFY before distribution"],
    ["UEI / CAGE (if public-sector)", "VERIFY / not yet registered"],
    ["NAICS (suggested)", "561790 Other Services to Buildings and Dwellings; 238340 Tile and Terrazzo Contractors — VERIFY"],
    ["Insurance", "Certificate of insurance on request — VERIFY limits"],
    ["Diversity certifications", "VERIFY (e.g. MBE) — list only if certified"],
  ] as [string, string][],
};
