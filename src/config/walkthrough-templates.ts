/**
 * Guided mobile walkthrough templates (Phase 4). PUBLIC-SAFE: this file ships to the browser, so it contains
 * instructions, capture rules and questions only — never prices, rates or estimator logic.
 *
 * NOTE: the Mobile_Walkthrough spec MD referenced by the brief was not supplied. These templates follow
 * 03_STONECRAFT_PHASE4 (shower pan + each wall + grout/caulk close-ups; floors by room, tile type and joint
 * condition; stone islands/countertops by run, edges, etch/stain; commercial restrooms/lobbies/corridors with
 * closure constraints). Adjust copy here once the owner supplies the detailed walkthrough spec.
 */
export type WorkType = "shower" | "floor" | "stone" | "commercial";
export const workTypes: WorkType[] = ["shower", "floor", "stone", "commercial"];

export type EscalationFlag = "leak" | "loose_tile" | "substrate" | "stone_uncertain" | "safety_sensitive" | "mold";
export const escalationLabel: Record<EscalationFlag, string> = {
  leak: "Possible leak or water damage",
  loose_tile: "Loose, cracked or hollow tile",
  substrate: "Soft wall / substrate concern",
  stone_uncertain: "Stone type or damage uncertain",
  safety_sensitive: "Safety-sensitive work (healthcare, in-use wet areas, slip complaints)",
  mold: "Possible mould behind surfaces",
};

export type MeasureField = { id: string; label: string; kind: "length" | "area" | "count"; hint?: string; required?: boolean };
export type Choice = { id: string; label: string };
export type Question = {
  id: string; label: string; type: "yesno" | "yesnounsure" | "choice" | "multi" | "text"; options?: Choice[]; required?: boolean; hint?: string;
  /** Answer ids that raise an escalation flag (pure rule, evaluated server-side). */
  escalate?: { when: string[]; flag: EscalationFlag };
};
export type CaptureSpec = { photosMin: number; photosMax: number; video: "none" | "optional" | "recommended"; tips: string[] };
export type StepDef = {
  id: string; title: string; instructions: string; capture: CaptureSpec; measurements: MeasureField[]; questions: Question[];
  /** Repeatable step (each wall / room / run / area). */
  repeat?: { label: string; min: number; max: number };
};
export type WalkthroughTemplate = { id: WorkType; title: string; short: string; intro: string; steps: StepDef[] };

const YNU: Choice[] = [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }, { id: "unsure", label: "Not sure" }];
const closeUp = "Hold the phone 15–20 cm (6–8 in) away, in good light, with no flash glare.";
const wide = "Stand back so the whole area is in frame. Turn on the lights.";

export const walkthroughTemplates: Record<WorkType, WalkthroughTemplate> = {
  shower: {
    id: "shower", title: "Shower walkthrough", short: "Shower or tub-shower",
    intro: "About 8–10 minutes. We'll ask for the shower pan, each wall, and close-ups of grout and caulk. Measurements are optional but help us quote remotely.",
    steps: [
      { id: "overview", title: "Whole shower", instructions: "Take one wide photo of the whole shower. A slow 10–20 second video pan is even better.", capture: { photosMin: 1, photosMax: 3, video: "optional", tips: [wide] }, measurements: [],
        questions: [
          { id: "shower_type", label: "What kind of shower is it?", type: "choice", required: true, options: [{ id: "tub_shower", label: "Tub-shower" }, { id: "walk_in", label: "Walk-in / stall" }, { id: "steam", label: "Steam shower" }, { id: "other", label: "Other" }] },
          { id: "glass", label: "Is there a glass door or panel?", type: "yesno", options: YNU.slice(0, 2) },
        ] },
      { id: "pan", title: "Shower pan / floor", instructions: "Photograph the shower floor (or tub surround floor) from above, then one close-up of the drain area.", capture: { photosMin: 1, photosMax: 4, video: "none", tips: [wide, closeUp] },
        measurements: [{ id: "pan_width", label: "Pan width", kind: "length" }, { id: "pan_depth", label: "Pan depth", kind: "length" }, { id: "curb_length", label: "Curb / threshold length", kind: "length" }],
        questions: [{ id: "pan_cracks", label: "Any cracked or loose tiles on the floor?", type: "yesnounsure", options: YNU, escalate: { when: ["yes"], flag: "loose_tile" } }] },
      { id: "wall", title: "Wall", instructions: "Photograph this wall straight on, floor to ceiling (or to the top of the tile). Add the next wall when you're done.", repeat: { label: "wall", min: 1, max: 4 },
        capture: { photosMin: 1, photosMax: 3, video: "none", tips: [wide] },
        measurements: [{ id: "wall_width", label: "Tiled width", kind: "length" }, { id: "wall_height", label: "Tiled height", kind: "length" }],
        questions: [{ id: "wall_hollow", label: "Any tiles loose, cracked or sounding hollow when tapped?", type: "yesnounsure", options: YNU, escalate: { when: ["yes"], flag: "loose_tile" } },
          { id: "wall_soft", label: "Does the wall feel soft or flex when pressed?", type: "yesnounsure", options: YNU, escalate: { when: ["yes"], flag: "substrate" } }] },
      { id: "grout", title: "Grout close-ups", instructions: "Take 2–6 close-ups of the worst grout lines: corners, near the floor and where water hits most.", capture: { photosMin: 2, photosMax: 6, video: "none", tips: [closeUp] }, measurements: [],
        questions: [
          { id: "grout_type", label: "Do you know the grout type?", type: "choice", options: [{ id: "cement", label: "Cement grout" }, { id: "epoxy", label: "Epoxy grout" }, { id: "unknown", label: "Not sure" }] },
          { id: "grout_condition", label: "What do you see? (choose any)", type: "multi", options: [{ id: "stained", label: "Stained / dark" }, { id: "mildew", label: "Mildew" }, { id: "cracked", label: "Cracked" }, { id: "missing", label: "Missing / crumbling" }] },
        ] },
      { id: "caulk", title: "Caulk close-ups", instructions: "Close-ups of caulk at the inside corners, where the tub or pan meets the wall, and around any glass.", capture: { photosMin: 1, photosMax: 4, video: "none", tips: [closeUp] },
        measurements: [{ id: "caulk_length", label: "Total caulk length (if known)", kind: "length" }], questions: [{ id: "caulk_mold", label: "Black spots behind or under the caulk?", type: "yesnounsure", options: YNU, escalate: { when: ["yes"], flag: "mold" } }] },
      { id: "water", title: "Leaks & water damage", instructions: "Tell us about any signs of water getting where it shouldn't. Photos of stains or damage help.", capture: { photosMin: 0, photosMax: 3, video: "none", tips: [] }, measurements: [],
        questions: [{ id: "leak_signs", label: "Water stains on the ceiling below, water outside the shower, or a musty smell?", type: "yesnounsure", options: YNU, required: true, escalate: { when: ["yes"], flag: "leak" } }] },
    ],
  },
  floor: {
    id: "floor", title: "Tile floor walkthrough", short: "Tile floors",
    intro: "About 5 minutes per room. We'll ask for each room, the tile type and the condition of the joints.",
    steps: [
      { id: "room", title: "Room", instructions: "One wide photo of the floor from the doorway, one close-up of the tile surface and one close-up of the grout joints.", repeat: { label: "room", min: 1, max: 6 },
        capture: { photosMin: 2, photosMax: 5, video: "optional", tips: [wide, closeUp] },
        measurements: [{ id: "room_length", label: "Room length", kind: "length" }, { id: "room_width", label: "Room width", kind: "length" }, { id: "room_area", label: "Or total floor area", kind: "area" }],
        questions: [
          { id: "room_name", label: "Which room is this?", type: "text", hint: "e.g. Kitchen, primary bath" },
          { id: "tile_type", label: "Tile type", type: "choice", required: true, options: [{ id: "porcelain", label: "Porcelain" }, { id: "ceramic", label: "Ceramic" }, { id: "natural_stone", label: "Natural stone" }, { id: "unknown", label: "Not sure" }] },
          { id: "joint_condition", label: "Grout joints look…", type: "choice", required: true, options: [{ id: "sound_dirty", label: "Sound, just dirty / stained" }, { id: "cracked", label: "Cracked in places" }, { id: "missing", label: "Missing or crumbling" }, { id: "unknown", label: "Not sure" }] },
        ] },
      { id: "transitions", title: "Edges & thresholds", instructions: "Optional: photos of doorways, thresholds and where tile meets other flooring.", capture: { photosMin: 0, photosMax: 3, video: "none", tips: [closeUp] }, measurements: [], questions: [] },
      { id: "problems", title: "Problems to know about", instructions: "Tell us about anything that might need repair rather than restoration.", capture: { photosMin: 0, photosMax: 3, video: "none", tips: [] }, measurements: [],
        questions: [
          { id: "loose_tiles", label: "Any loose, cracked or hollow-sounding tiles?", type: "yesnounsure", options: YNU, required: true, escalate: { when: ["yes"], flag: "loose_tile" } },
          { id: "moisture", label: "Any moisture, lifting or a leak under the floor?", type: "yesnounsure", options: YNU, required: true, escalate: { when: ["yes"], flag: "leak" } },
        ] },
    ],
  },
  stone: {
    id: "stone", title: "Stone countertops & islands", short: "Stone islands & countertops",
    intro: "About 5–8 minutes. We'll ask for each countertop run, the edges, and close-ups of any etching or stains.",
    steps: [
      { id: "overview", title: "Overview", instructions: "One wide photo of the kitchen or bathroom stone so we can see all the runs.", capture: { photosMin: 1, photosMax: 3, video: "optional", tips: [wide] }, measurements: [],
        questions: [
          { id: "stone_type", label: "What stone is it?", type: "choice", required: true, options: [{ id: "marble", label: "Marble" }, { id: "granite", label: "Granite" }, { id: "quartzite", label: "Quartzite" }, { id: "limestone", label: "Limestone" }, { id: "travertine", label: "Travertine" }, { id: "quartz", label: "Engineered quartz" }, { id: "unknown", label: "Not sure" }], escalate: { when: ["unknown"], flag: "stone_uncertain" } },
          { id: "finish", label: "Finish", type: "choice", options: [{ id: "polished", label: "Polished / shiny" }, { id: "honed", label: "Honed / matte" }, { id: "unknown", label: "Not sure" }] },
        ] },
      { id: "run", title: "Countertop run or island", instructions: "Photograph this run from above and from the front edge. Add another run for each separate section or the island.", repeat: { label: "run", min: 1, max: 6 },
        capture: { photosMin: 1, photosMax: 3, video: "none", tips: [wide] },
        measurements: [{ id: "run_length", label: "Length", kind: "length", required: false }, { id: "run_depth", label: "Depth", kind: "length" }], questions: [{ id: "run_name", label: "Name this run", type: "text", hint: "e.g. Island, sink run" }] },
      { id: "edges", title: "Edges", instructions: "Close-ups of the edge profile and any chips.", capture: { photosMin: 1, photosMax: 4, video: "none", tips: [closeUp] },
        measurements: [{ id: "edge_length", label: "Total exposed edge (if known)", kind: "length" }],
        questions: [{ id: "edge_profile", label: "Edge profile", type: "choice", options: [{ id: "eased", label: "Eased / square" }, { id: "bevel", label: "Bevel" }, { id: "bullnose", label: "Bullnose" }, { id: "ogee", label: "Ogee / decorative" }, { id: "unknown", label: "Not sure" }] }] },
      { id: "damage", title: "Etching & stains", instructions: "Close-ups of dull rings (etching), dark spots (stains), chips or cracks. Shine a phone light across the surface at a low angle to show etching.", capture: { photosMin: 1, photosMax: 6, video: "optional", tips: [closeUp, "Low-angle light shows etching best."] }, measurements: [],
        questions: [{ id: "damage_type", label: "What do you see? (choose any)", type: "multi", options: [{ id: "etch", label: "Dull rings / etching" }, { id: "stain", label: "Dark stains" }, { id: "dull", label: "Overall dullness" }, { id: "chip", label: "Chips" }, { id: "crack", label: "Cracks" }], escalate: { when: ["crack"], flag: "stone_uncertain" } }] },
    ],
  },
  commercial: {
    id: "commercial", title: "Commercial area walkthrough", short: "Restrooms, lobbies & corridors",
    intro: "For facility teams. Add each restroom, lobby or corridor, then tell us when areas can close. A site visit is usually still needed for commercial scopes.",
    steps: [
      { id: "site", title: "The property", instructions: "Tell us about the building. Photos of the entrance or directory are optional.", capture: { photosMin: 0, photosMax: 2, video: "none", tips: [] }, measurements: [],
        questions: [
          { id: "facility_type", label: "Facility type", type: "choice", required: true, options: [{ id: "office", label: "Office" }, { id: "hotel", label: "Hotel / hospitality" }, { id: "healthcare", label: "Healthcare" }, { id: "education", label: "School / campus" }, { id: "residential_common", label: "Condo / HOA common areas" }, { id: "retail", label: "Retail" }, { id: "other", label: "Other" }], escalate: { when: ["healthcare"], flag: "safety_sensitive" } },
        ] },
      { id: "area", title: "Area", instructions: "Wide photos of the floor and walls, then close-ups of the worst grout and any damaged tiles. A short video walk-through helps.", repeat: { label: "area", min: 1, max: 10 },
        capture: { photosMin: 2, photosMax: 6, video: "recommended", tips: [wide, closeUp] },
        measurements: [{ id: "area_length", label: "Length", kind: "length" }, { id: "area_width", label: "Width", kind: "length" }, { id: "area_total", label: "Or total area", kind: "area" }, { id: "fixtures", label: "Fixtures (toilets, urinals, sinks)", kind: "count" }],
        questions: [
          { id: "area_type", label: "Area type", type: "choice", required: true, options: [{ id: "restroom", label: "Restroom" }, { id: "lobby", label: "Lobby" }, { id: "corridor", label: "Corridor" }, { id: "other", label: "Other" }] },
          { id: "area_name", label: "Name / location", type: "text", hint: "e.g. 2nd floor men's restroom" },
        ] },
      { id: "closures", title: "Closures & constraints", instructions: "When can areas close, and is anything safety-sensitive?", capture: { photosMin: 0, photosMax: 0, video: "none", tips: [] }, measurements: [],
        questions: [
          { id: "closure_window", label: "When can work happen?", type: "text", required: true, hint: "e.g. nights 10pm–6am, weekends only" },
          { id: "can_close", label: "Can each area close fully while we work?", type: "choice", required: true, options: [{ id: "yes", label: "Yes" }, { id: "partial", label: "Partly / one at a time" }, { id: "no", label: "No — must stay open" }] },
          { id: "wet_in_use", label: "Will wet areas stay in use during work?", type: "yesnounsure", options: YNU, escalate: { when: ["yes"], flag: "safety_sensitive" } },
          { id: "slip_complaints", label: "Any slip complaints or incidents on these floors?", type: "yesnounsure", options: YNU, escalate: { when: ["yes"], flag: "safety_sensitive" } },
        ] },
    ],
  },
};

/** Step instance key for a repeatable step: "<stepId>#<n>" (n from 1). Non-repeatable steps use the step id. */
export const stepKey = (stepId: string, n?: number) => (n ? `${stepId}#${n}` : stepId);
export function parseStepKey(key: string): { stepId: string; n?: number } {
  const m = /^([a-z_]+)(?:#(\d{1,2}))?$/.exec(key);
  return m ? { stepId: m[1]!, n: m[2] ? Number(m[2]) : undefined } : { stepId: "" };
}
export function stepDef(t: WalkthroughTemplate, key: string): StepDef | undefined {
  const { stepId, n } = parseStepKey(key);
  const s = t.steps.find((x) => x.id === stepId);
  if (!s) return undefined;
  if (s.repeat ? !n || n < 1 || n > s.repeat.max : n !== undefined) return undefined;
  return s;
}
