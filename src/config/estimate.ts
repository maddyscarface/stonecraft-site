import type { EstimateConfig } from "@/lib/estimate/qualifiers";
import type { BriefTheme } from "@/lib/estimate/lead-brief";
import type { QualifierTheme } from "@/components/estimate/EstimateQualifiers";

/**
 * StoneCraft pre-estimate qualifiers (residential, renter and landlord funnels).
 * Commercial leads already capture budget, procurement and decision role in their own step.
 *
 * Phase 4: this config is shipped to the browser, so it carries NO prices: no typical ranges and no
 * budget brackets. Pricing is owner-only (private estimator rate book). Leakage tests enforce this.
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
        { id: "alcove", label: "Standard tub or alcove shower" },
        { id: "walkin", label: "Large or walk-in shower" },
        { id: "two", label: "Two showers" },
      ],
      addOns: [
        { id: "color_seal", label: "Grout colour sealing" },
        { id: "bath_floor", label: "Bathroom floor too" },
      ],
    },
    {
      id: "floor", label: "Tile & grout floor",
      sizes: [
        { id: "lt60", label: "Bathroom floor", hint: "Under 60 sq ft" },
        { id: "60_200", label: "Kitchen or large bath", hint: "60–200 sq ft" },
        { id: "200_500", label: "Several rooms", hint: "200–500 sq ft" },
        { id: "500p", label: "Whole floor", hint: "500+ sq ft" },
      ],
      addOns: [{ id: "color_seal", label: "Grout colour sealing" }],
    },
    {
      id: "marble", label: "Marble or natural stone",
      sizes: [
        { id: "small", label: "Vanity top or small area", hint: "Under 50 sq ft" },
        { id: "floor", label: "Bathroom or foyer floor", hint: "50–200 sq ft" },
        { id: "large", label: "Large area", hint: "200+ sq ft" },
      ],
      addOns: [{ id: "polish", label: "Hone & polish (etch removal)" }],
    },
    {
      id: "countertop", label: "Stone countertops",
      sizes: [
        { id: "vanity", label: "Bathroom vanity" },
        { id: "kitchen", label: "Kitchen counters" },
      ],
    },
    {
      id: "refresh", label: "1–2 Day Bathroom Refresh",
      sizes: [
        { id: "one", label: "One bathroom" },
        { id: "two", label: "Two bathrooms" },
      ],
    },
  ],
  // Phase 4: no budget brackets with dollar figures are shown to customers. Owner-only rates live in the
  // private estimator rate book (/admin/ops → Estimator), never in this client-shipped config.
  budgetBands: [],
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
