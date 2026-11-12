import type { EstimateConfig } from "@/lib/estimate/qualifiers";
import type { BriefTheme } from "@/lib/estimate/lead-brief";
import type { QualifierTheme } from "@/components/estimate/EstimateQualifiers";

/**
 * StoneCraft pre-estimate qualifiers (residential, renter and landlord funnels).
 * Commercial leads already capture budget, procurement and decision role in their own step.
 *
 * Ranges are split from the public Boston ranges in src/config/services.ts
 * (shower $1,200–2,500 · floor $600–1,800 · marble $800–2,200 · colour seal $400–900) and the
 * DRAFT price sheet in src/config/pricing.ts. [OWNER TO CONFIRM] each size tier, then set
 * rangesConfirmed: true. Florida never shows ranges in the form (pre-launch, no approved pricing).
 *
 * favorites: finishes, not past jobs, until real StoneCraft jobs with written permission exist.
 * Never list Sir Grout projects here.
 */
export const estimateConfig: EstimateConfig = {
  brand: "StoneCraft",
  visitLabel: "estimate visit",
  timezone: "America/New_York",
  tzLabel: "Eastern Time",
  projectTypes: [
    {
      id: "shower", label: "Shower restoration",
      sizes: [
        { id: "alcove", label: "Standard tub or alcove shower", typical: [1200, 1700] },
        { id: "walkin", label: "Large or walk-in shower", typical: [1600, 2500] },
        { id: "two", label: "Two showers", typical: [2300, 4200] },
      ],
      addOns: [
        { id: "color_seal", label: "Grout colour sealing", typical: [300, 600] },
        { id: "bath_floor", label: "Bathroom floor too", typical: [450, 800] },
      ],
    },
    {
      id: "floor", label: "Tile & grout floor",
      sizes: [
        { id: "lt60", label: "Bathroom floor", hint: "Under 60 sq ft", typical: [600, 800] },
        { id: "60_200", label: "Kitchen or large bath", hint: "60–200 sq ft", typical: [700, 1800] },
        { id: "200_500", label: "Several rooms", hint: "200–500 sq ft", typical: [1500, 3500] },
        { id: "500p", label: "Whole floor", hint: "500+ sq ft", typical: [3000, 6500] },
      ],
      addOns: [{ id: "color_seal", label: "Grout colour sealing", typical: [400, 900] }],
    },
    {
      id: "marble", label: "Marble or natural stone",
      sizes: [
        { id: "small", label: "Vanity top or small area", hint: "Under 50 sq ft", typical: [800, 1100] },
        { id: "floor", label: "Bathroom or foyer floor", hint: "50–200 sq ft", typical: [900, 2200] },
        { id: "large", label: "Large area", hint: "200+ sq ft", typical: [2000, 5000] },
      ],
      addOns: [{ id: "polish", label: "Hone & polish (etch removal)", typical: [400, 1500] }],
    },
    {
      id: "countertop", label: "Stone countertops",
      sizes: [
        { id: "vanity", label: "Bathroom vanity", typical: [300, 450] },
        { id: "kitchen", label: "Kitchen counters", typical: [450, 1100] },
      ],
    },
    {
      id: "refresh", label: "1–2 Day Bathroom Refresh",
      sizes: [
        { id: "one", label: "One bathroom", typical: [1500, 2200] },
        { id: "two", label: "Two bathrooms", typical: [2800, 4200] },
      ],
    },
  ],
  budgetBands: [
    { id: "lt500", label: "Under $500", min: 0, max: 500 },
    { id: "500_1k", label: "$500–1k", min: 500, max: 1000 },
    { id: "1_2k", label: "$1–2k", min: 1000, max: 2000 },
    { id: "2_3_5k", label: "$2–3.5k", min: 2000, max: 3500 },
    { id: "3_5_6k", label: "$3.5–6k", min: 3500, max: 6000 },
    { id: "6kp", label: "$6k+", min: 6000, max: null },
    { id: "unsure", label: "Not sure yet", min: 0, max: null },
  ],
  startOptions: [
    { id: "asap", label: "As soon as possible" },
    { id: "2weeks", label: "Within 2 weeks" },
    { id: "month", label: "Within a month" },
    { id: "flexible", label: "Flexible" },
  ],
  timeWindows: [
    { id: "0800", label: "8:00 AM", start: "08:00", end: "09:00" },
    { id: "1000", label: "10:00 AM", start: "10:00", end: "11:00" },
    { id: "1200", label: "12:00 PM", start: "12:00", end: "13:00" },
    { id: "1400", label: "2:00 PM", start: "14:00", end: "15:00" },
    { id: "1600", label: "4:00 PM", start: "16:00", end: "17:00" },
  ],
  minLeadDays: 1,
  favorites: {
    prompt: "Which finish do you want?",
    options: [
      { id: "bright_white", label: "Bright white grout" },
      { id: "match_color", label: "Match my current grout colour" },
      { id: "darker_grout", label: "Darker grout that hides dirt" },
      { id: "honed", label: "Matte (honed) stone" },
      { id: "polished", label: "Shiny (polished) stone" },
      { id: "fresh_caulk", label: "Clean, fresh caulk lines" },
    ],
  },
  priceGuidePath: "/residential#price-guide",
  rangeNote: "Greater Boston guidance. Your written quote follows the assessment, before anything is booked.",
  rangesConfirmed: false,
  addressRequired: false,
  addressLabel: "Street address (optional, for the estimate visit)",
};

export const briefTheme: BriefTheme = { dark: "#25292B", accent: "#B89A70", accentSoft: "#EEE9E1", ink: "#25292B", muted: "#5F6A64" };

export const qualifierTheme: QualifierTheme = {
  input: "field",
  label: "label",
  chip: "rounded border border-cream-dark bg-white px-3 py-2 text-left text-sm font-semibold hover:border-hunter",
  chipOn: "rounded border border-hunter bg-hunter px-3 py-2 text-left text-sm font-semibold text-white",
  box: "rounded-lg border border-hunter bg-cream p-4",
  muted: "text-hunter/70",
  link: "font-semibold underline",
};
