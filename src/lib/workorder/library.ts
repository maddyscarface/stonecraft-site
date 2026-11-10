/**
 * DEFAULT work-order step library.
 *
 * ⚠ These steps are a generic starting framework written for StoneCraft. They are NOT
 * derived from any franchisor training manual, and they are NOT validated procedures.
 * Before field use, a qualified StoneCraft lead technician must:
 *   1. replace bracketed product placeholders with StoneCraft's chosen products,
 *   2. check each step against the manufacturer's technical data sheets and SDS,
 *   3. set `validatedBy` / `validatedAt` in the admin library.
 * The generator refuses to mark a brief field-ready while `validated` is false.
 */

export type Section = { id: string; title: string; steps: string[] };

export type ServiceSop = {
  service: string;
  label: string;
  sections: Section[];
  materials: { item: string; qtyRule?: string }[];
  photoRequirements: string[];
  qc: string[];
  exclusions: string[];
};

export const LIBRARY_META = { version: "2026-11-draft", validated: false as boolean, validatedBy: "", validatedAt: "" };

export const OPENING: Section = {
  id: "opening", title: "ARRIVAL & OPENING",
  steps: [
    "Review the brief: scope, areas, colours, measurements and customer restrictions.",
    "Confirm access notes (parking, elevator, building rules, work window) before leaving for the job.",
    "Arrive on time. If running late, call the office and the customer before the start time.",
    "Walk the scope with the customer. Confirm anything that differs from the brief before starting.",
    "Protect floors, fixtures, drains and adjacent surfaces.",
    "Take BEFORE photos (wide shot + close-up of each problem area). Upload before starting work.",
  ],
};

export const CLOSING: Section = {
  id: "closing", title: "CLOSE-OUT",
  steps: [
    "Remove protection, clean work area and dispose of waste per site rules.",
    "Take AFTER photos matching each BEFORE angle. Upload before marking complete.",
    "Walk the result with the customer (or site contact). Note any concern in the job record.",
    "Leave written care and cure-time instructions.",
    "Mark complete in the app. Report any change in scope or issue to the office.",
  ],
};

export const SOPS: ServiceSop[] = [
  {
    service: "shower_restoration", label: "Shower restoration",
    sections: [
      { id: "inspect", title: "INSPECTION", steps: ["Check for existing sealers or coatings (water-drop test).", "Check grout for soap-scum film.", "Tap tiles for hollow areas; mark and photograph.", "Press on walls: excessive movement = stop and call the office.", "Check change-of-plane joints for moisture."] },
      { id: "dry_clean", title: "DRY CLEAN", steps: ["Scrape lower walls and floor to gauge build-up depth.", "Remove heavy deposits mechanically with [approved pad/tool]. Vacuum debris."] },
      { id: "wet_clean", title: "WET CLEAN", steps: ["Apply [pH-neutral tile cleaner] in sections; keep wet for the dwell time on the label.", "Agitate grout lines with a narrow brush; rinse and extract.", "Dry surfaces before any caulk or sealer step."] },
      { id: "caulk", title: "CAULK", steps: ["Remove all old caulk completely; clean residue.", "Dry-test joints. If moisture persists after drying, stop and call the office.", "Apply [approved caulk] to change-of-plane joints; tool and clean."] },
      { id: "seal", title: "SEAL", steps: ["Apply [approved grout sealer / colour sealant] per manufacturer instructions.", "Remove haze from tile faces within the product's working time.", "Record cure time on the job record for customer instructions."] },
    ],
    materials: [{ item: "[pH-neutral tile cleaner]" }, { item: "[approved caulk] — colour per brief", qtyRule: "1 tube per ~25 linear ft" }, { item: "[grout sealer / colour sealant]", qtyRule: "per area + 15% waste" }, { item: "Razor scrapers (fresh blades)" }, { item: "Narrow grout brushes" }, { item: "Microfibre / terry cloths" }, { item: "Air mover" }],
    photoRequirements: ["Full shower wide shot", "Each wall", "Floor/tray", "Every caulk joint", "Any hollow or cracked tile"],
    qc: ["No haze on tile faces", "Caulk lines continuous, tooled and clean", "Grout colour uniform", "Drain and fixtures clean", "Cure time communicated"],
    exclusions: ["Tile replacement", "Plumbing or fixture repair", "Wall substrate repair", "Glass door repair"],
  },
  {
    service: "grout_cleaning", label: "Tile & grout cleaning",
    sections: [
      { id: "prep", title: "FLOOR PREP", steps: ["Identify tile and grout type; test cleaner in an inconspicuous spot.", "Dry sweep / vacuum."] },
      { id: "clean", title: "CLEAN & EXTRACT", steps: ["Apply [surface-appropriate cleaner]; keep wet for label dwell time.", "Agitate with [scrubber].", "Extract and rinse; show customer recovered water if appropriate.", "Repeat on heavily soiled areas (max per product guidance)."] },
      { id: "dry", title: "DRY", steps: ["Air-move until dry before sealing."] },
    ],
    materials: [{ item: "[surface-appropriate cleaner]" }, { item: "[scrubber + pads]" }, { item: "Extractor / wet-vac" }, { item: "Air mover" }],
    photoRequirements: ["Wide shot of each room", "Close-ups of worst grout lines"],
    qc: ["Even appearance across floor", "No residue", "Baseboards and thresholds clean"],
    exclusions: ["Regrouting (separate line)", "Tile replacement"],
  },
  {
    service: "grout_color_seal", label: "Grout colour sealing",
    sections: [
      { id: "verify", title: "VERIFY", steps: ["Confirm grout is cementitious (not epoxy).", "Confirm colour selection with the customer against a sample.", "Grout must be clean and dry."] },
      { id: "apply", title: "APPLICATION", steps: ["Apply [colour sealant] line by line in one direction.", "Remove excess from tile faces per product working time.", "Wait the manufacturer's minimum before buffing; humid conditions need longer."] },
      { id: "buff", title: "BUFF", steps: ["Buff tile faces to remove haze; inspect from standing and low angles.", "Re-buff any hazy areas."] },
    ],
    materials: [{ item: "[colour sealant] — colour per brief", qtyRule: "per sq ft + 15% waste" }, { item: "Applicator bottle / brush" }, { item: "Buffing pads" }],
    photoRequirements: ["Colour sample against existing grout", "Before / after per room"],
    qc: ["Uniform colour", "No sealant on tile faces", "Foot-traffic time communicated"],
    exclusions: ["Epoxy grout", "Cracked or missing grout (requires regrouting first)"],
  },
  {
    service: "clear_seal", label: "Clear sealing",
    sections: [{ id: "apply", title: "APPLICATION", steps: ["Confirm surface is clean and fully dry.", "Apply [penetrating sealer] per label coverage rate.", "Remove excess within working time."] }],
    materials: [{ item: "[penetrating sealer]" }, { item: "Applicator" }, { item: "Cloths" }],
    photoRequirements: ["Water-drop test before and after"],
    qc: ["Water beads after cure (test spot)"], exclusions: [],
  },
  {
    service: "regrout", label: "Regrouting",
    sections: [{ id: "regrout", title: "REGROUT", steps: ["Mark lines to be replaced; confirm with customer.", "Remove failed grout to adequate depth with [grout removal tool], protecting tile edges.", "Vacuum and dampen joints per grout instructions.", "Install [grout] — colour per brief; tool joints; clean haze.", "Record cure time."] }],
    materials: [{ item: "[grout] — colour per brief" }, { item: "[grout removal tool]" }, { item: "Grout float / sponge" }, { item: "Dust containment + vacuum" }],
    photoRequirements: ["Lines before removal", "After install"],
    qc: ["Joints full and consistent", "No chipped tile edges", "Colour matches sample"],
    exclusions: ["Tile replacement"],
  },
  {
    service: "caulk", label: "Caulk replacement",
    sections: [{ id: "caulk", title: "CAULK", steps: ["Remove all existing caulk and residue.", "Clean and dry joint; dry-test.", "Apply [approved caulk]; tool; clean edges.", "Record cure time."] }],
    materials: [{ item: "[approved caulk]", qtyRule: "1 tube per ~25 linear ft" }, { item: "Caulk removal tool" }, { item: "Solvent wipes per product" }],
    photoRequirements: ["Each joint before and after"],
    qc: ["Continuous bead", "No smears on tile or fixtures"], exclusions: ["Plumbing leaks"],
  },
  {
    service: "marble_clean", label: "Marble / stone clean & seal",
    sections: [{ id: "stone", title: "STONE CARE", steps: ["Identify stone type; test in an inconspicuous area.", "Clean with [stone-safe, non-acidic cleaner] only.", "Rinse, dry, apply [stone impregnating sealer] if specified."] }],
    materials: [{ item: "[stone-safe cleaner]" }, { item: "[stone impregnating sealer]" }],
    photoRequirements: ["Etching / staining close-ups under raking light"],
    qc: ["No new etching", "Even finish"], exclusions: ["Crack and chip repair unless quoted"],
  },
  {
    service: "marble_hone_polish", label: "Marble honing & polishing",
    sections: [{ id: "hone", title: "HONE & POLISH", steps: ["Confirm target finish (honed / satin / polished) with customer.", "Protect walls, cabinets and drains from slurry.", "Hone with [diamond pad sequence] to remove etching.", "Polish to target finish with [polishing system].", "Rinse, neutralise and dry; seal if specified."] }],
    materials: [{ item: "[diamond pad sequence]" }, { item: "[polishing system]" }, { item: "Slurry containment + wet-vac" }],
    photoRequirements: ["Raking-light before / after", "Test area result"],
    qc: ["Consistent finish across area", "Slurry fully removed", "Edges and corners match field"],
    exclusions: ["Structural crack repair"],
  },
  {
    service: "countertop_seal", label: "Countertop seal",
    sections: [{ id: "counter", title: "COUNTERTOP", steps: ["Water-drop test to confirm absorption (skip sealing for engineered quartz).", "Clean with [stone-safe cleaner]; dry.", "Apply [stone impregnating sealer]; remove excess."] }],
    materials: [{ item: "[stone-safe cleaner]" }, { item: "[stone impregnating sealer]" }],
    photoRequirements: ["Water-drop test before / after"], qc: ["Water beads after cure"], exclusions: ["Quartz/engineered surfaces (no sealing)"],
  },
  {
    service: "bathroom_refresh", label: "1–2 Day Bathroom Refresh",
    sections: [{ id: "refresh", title: "REFRESH PACKAGE", steps: ["Confirm written landlord approval is on file (renter jobs). No approval = do not start; call the office.", "Run shower restoration and floor grout cleaning sections as scoped.", "Replace caulk at tub/shower and vanity joints as scoped."] }],
    materials: [], photoRequirements: ["Landlord approval document photo (renter jobs)"], qc: ["All scoped areas complete"], exclusions: ["Anything not in the approved scope"],
  },
];

export type Condition = {
  id: string;
  label: string;
  keywords: string[];
  insert?: { beforeSection: string; step: string };
  warning?: string;
  ppe?: string;
  blocksProceeding?: boolean;
  /** Requires a human hazard review before field use. */
  hazardReview?: boolean;
};

export const CONDITIONS: Condition[] = [
  { id: "heavy_soap_scum", label: "Heavy soap scum", keywords: ["soap scum", "film", "scum"], insert: { beforeSection: "wet_clean", step: "SOAP SCUM: apply [film remover suited to the tile type] and keep wet for the label dwell time. Sealer will not bond over film." } },
  { id: "hard_water", label: "Mineral / hard-water deposits", keywords: ["hard water", "calcium", "mineral", "limescale"], warning: "Mineral deposits expected. Use only acid-based removers that are safe for the surface; NEVER on natural stone." },
  { id: "wax_coating", label: "Wax or coating suspected", keywords: ["wax", "coating", "sealer", "shiny"], insert: { beforeSection: "apply", step: "COATING CHECK: water-drop test. If water beads, strip with [approved stripper] before colour sealing." } },
  { id: "epoxy_grout", label: "Epoxy grout", keywords: ["epoxy grout"], warning: "EPOXY GROUT: colour sealant will not bond reliably. If confirmed on site, STOP and call the office.", blocksProceeding: true },
  { id: "natural_stone", label: "Natural stone present", keywords: ["marble", "travertine", "limestone", "natural stone", "onyx"], warning: "NATURAL STONE: stone-safe, non-acidic products ONLY. Acids etch permanently." },
  { id: "mold", label: "Mould / mildew present", keywords: ["mold", "mould", "mildew"], insert: { beforeSection: "wet_clean", step: "MILDEW: treat with [approved mildew remover] per label. Call the office first if growth is extensive, behind tile, or on porous materials." }, ppe: "Respirator and eye protection per product SDS.", hazardReview: true, warning: "Visible growth beyond surface mildew is outside scope. Do not describe the work as mould remediation." },
  { id: "loose_tile", label: "Loose / hollow tile", keywords: ["loose tile", "hollow", "drummy"], warning: "Hollow or loose tile noted — document, do not regrout over it, call the office." },
  { id: "pre_1980", label: "Pre-1980 building", keywords: ["pre-1980", "1950s", "1960s", "1970s", "vintage", "original tile"], warning: "Older building: do not sand, grind or remove materials that could contain asbestos (some older mastics, adhesives) or lead-painted trim without an assessment. Call the office.", hazardReview: true },
  { id: "healthcare", label: "Healthcare facility", keywords: ["hospital", "clinic", "patient", "healthcare"], warning: "Healthcare site: follow the facility's infection-control, work-zone and PPE requirements as written in the scope. Check in with the site contact before starting.", hazardReview: true },
];
