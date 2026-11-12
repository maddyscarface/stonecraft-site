/**
 * Surface & treatment vocabulary for lead capture and quotes (spec §2).
 * Product suitability changes by material, so the form, the CRM fields and the quote all use these ids
 * and keep cleaning, colour seal, grout replacement, polishing and topical finish as separate options.
 */
export const MATERIALS = [
  ["ceramic", "Ceramic (glazed)"],
  ["porcelain", "Porcelain"],
  ["marble", "Marble"],
  ["granite", "Granite"],
  ["travertine", "Travertine"],
  ["other_unknown", "Other / not sure"],
] as const;
export type Material = (typeof MATERIALS)[number][0];

export const COMMERCIAL_MATERIALS = [
  ["ceramic", "Ceramic"], ["porcelain", "Porcelain"], ["quarry", "Quarry tile"], ["terrazzo", "Terrazzo"],
  ["marble", "Marble"], ["granite", "Granite"], ["travertine", "Travertine / limestone"], ["other_unknown", "Other / not sure"],
] as const;

export const AREAS = [
  ["lt25", "Small: under 25 sq ft (e.g. a tub surround)"],
  ["25to75", "25–75 sq ft (shower or small floor)"],
  ["75to200", "75–200 sq ft (bathroom floor + walls)"],
  ["200plus", "200+ sq ft (large floor, multiple rooms)"],
  ["unknown", "Not sure"],
] as const;

export const ISSUES = [
  ["discoloured_grout", "Discoloured or stained grout"],
  ["cracked_grout", "Cracked, crumbling or missing grout"],
  ["failed_caulk", "Peeling, mouldy or failed caulk"],
  ["mildew", "Mould / mildew that keeps coming back"],
  ["soap_film", "Soap film or hard-water build-up"],
  ["etched_dull", "Etched, dull or water-spotted stone"],
  ["scratches", "Scratches or worn traffic paths"],
  ["loose_tile", "Loose, hollow-sounding or cracked tile"],
  ["other", "Something else"],
] as const;

/** The five distinct treatments (never bundled into one "clean & seal" line). */
export const TREATMENTS = [
  ["cleaning", "Deep cleaning", "Removes soil, soap film and residue with products matched to the surface. Nothing is added to the surface."],
  ["color_seal", "Grout colour seal", "A coloured sealant applied to clean, sound grout joints to even out colour and resist staining. For grout, not for tile faces."],
  ["regrout", "Grout replacement (regrouting)", "Failed grout is cut out and replaced. Needed when grout is cracked, missing or too far gone to clean or colour seal."],
  ["recaulk", "Recaulking", "Old caulk removed completely and new silicone applied to clean, dry joints at tubs, shower pans and changes of plane."],
  ["polish_hone", "Honing & polishing", "Mechanical refinishing of natural stone (marble, travertine, limestone, some granite) to remove etching and restore an even matte, satin or polished finish."],
  ["topical_finish", "Topical finish / coating", "A coating applied on top of a surface. Only suitable for some materials and situations. We recommend it case by case, never by default."],
  ["not_sure", "Not sure — recommend for me", ""],
] as const;
export type Treatment = (typeof TREATMENTS)[number][0];

export const FINISHES = [
  ["natural", "Natural / matte"],
  ["satin", "Satin / honed"],
  ["polished", "Polished (high shine)"],
  ["match_existing", "Match what's there now"],
  ["not_sure", "Not sure"],
] as const;
export type Finish = (typeof FINISHES)[number][0];

const GLAZED: Material[] = ["ceramic", "porcelain"];
const STONE: Material[] = ["marble", "travertine", "granite"];

/**
 * Material-specific guidance shown in the form and stored with the lead. Rule (spec §2): never suggest a
 * glossy topical coating as the default for glazed ceramic. Ceramic/porcelain shine comes from the glaze
 * and is restored by cleaning; polishing applies to natural stone.
 */
export function surfaceGuidance(material?: string, finish?: string, treatments: string[] = []): string[] {
  const notes: string[] = [];
  const m = material as Material | undefined;
  if (m && GLAZED.includes(m)) {
    if (finish === "polished") notes.push("Glazed ceramic and porcelain get their shine from the factory glaze. We restore it by deep cleaning. We don't apply glossy coatings to glazed tile by default; they can peel, yellow or become slippery.");
    if (treatments.includes("polish_hone")) notes.push("Honing and polishing are for natural stone. For ceramic or porcelain we'd normally recommend cleaning, grout colour sealing or regrouting instead.");
    if (treatments.includes("topical_finish")) notes.push("A topical coating on glazed tile is a case-by-case recommendation, not a default. We'll tell you after reviewing your photos whether it makes sense.");
  }
  if (m && STONE.includes(m)) {
    if (treatments.includes("color_seal")) notes.push("Colour sealant is for the grout joints only. On natural stone we keep it off the stone face, which may need a penetrating sealer instead.");
    if (m === "marble" || m === "travertine") notes.push("Marble and travertine etch with acids (including many bathroom cleaners). Honing and polishing remove etching; sealing doesn't prevent it.");
  }
  return notes;
}

/** Default recommendation never includes a topical coating for glazed tile. */
export function defaultTreatments(material?: string, issues: string[] = []): Treatment[] {
  const t = new Set<Treatment>(["cleaning"]);
  if (issues.includes("discoloured_grout")) t.add("color_seal");
  if (issues.includes("cracked_grout")) t.add("regrout");
  if (issues.includes("failed_caulk") || issues.includes("mildew")) t.add("recaulk");
  if ((material === "marble" || material === "travertine" || material === "granite") && (issues.includes("etched_dull") || issues.includes("scratches"))) t.add("polish_hone");
  return [...t];
}
