import type { Zone } from "@/lib/scheduling/types";
import { cities, type MarketId } from "./cities";

export type Market = {
  id: MarketId;
  slug: string;
  name: string;
  brandName: string;
  shortName: string;
  state: "MA" | "FL";
  /**
   * live       → indexed, ads may run
   * pre-launch → pages render with noindex, forms work, a notice explains availability is being confirmed
   */
  status: "live" | "pre-launch";
  statusNote?: string;
  timezone: string;
  phoneE164: string;
  phoneDisplay: string;
  email: string;
  hours: string;
  /** No storefront: we describe a service area, not an office. */
  serviceAreaLabel: string;
  /** Dispatch point for drive-time estimates. Not shown publicly. */
  homeBase: { lat: number; lng: number };
  /** Show the owner-approved public price ranges for this market. */
  showPriceRanges: boolean;
  /** Claim ids from site.trustClaims that apply to this market. */
  credentialIds: string[];
  zones: Zone[];
  ghl: { locationIdEnv: string; pipelineEnvPrefix: string };
};

const SLOTS = ["10:00", "11:30", "13:00", "14:30"];

export const markets: Market[] = [
  {
    id: "boston",
    slug: "boston",
    name: "Greater Boston",
    brandName: "StoneCraft Boston",
    shortName: "Boston",
    state: "MA",
    status: "live",
    timezone: "America/New_York",
    phoneE164: process.env.NEXT_PUBLIC_PHONE_BOSTON ?? "+16170000000",
    phoneDisplay: process.env.NEXT_PUBLIC_PHONE_BOSTON_DISPLAY ?? "(617) 000-0000",
    email: "hello@stonecraftboston.com",
    hours: "Mon–Fri 7:30am–6pm · Sat 8am–2pm",
    serviceAreaLabel: "Serving Boston, Cambridge, Brookline, Newton and MetroWest",
    homeBase: { lat: 42.3601, lng: -71.0589 }, // VERIFY: set to real dispatch address
    showPriceRanges: true,
    credentialIds: ["insured", "ma-hic"],
    ghl: { locationIdEnv: "GHL_LOCATION_ID_BOSTON", pipelineEnvPrefix: "GHL_BOSTON" },
    zones: [
      { id: "bos-inner", marketId: "boston", name: "Inner Core", citySlugs: ["boston", "back-bay", "south-end", "seaport", "beacon-hill", "south-boston", "charlestown", "cambridge"], extraZips: ["02115"], primaryDay: "monday", flexDay: "thursday", slotTimes: SLOTS, slotDurationMin: 45, flexSlotCount: 1, flexReleaseHours: 24, priorityValueThreshold: 2500, driveGapWarningMin: 45, color: "#1A3828", active: true },
      { id: "bos-west", marketId: "boston", name: "Brookline / Newton / Waltham", citySlugs: ["brookline", "newton", "waltham", "watertown"], primaryDay: "tuesday", flexDay: "thursday", slotTimes: SLOTS, slotDurationMin: 45, flexSlotCount: 1, flexReleaseHours: 24, priorityValueThreshold: 2500, driveGapWarningMin: 45, color: "#4A7060", active: true },
      { id: "bos-north", marketId: "boston", name: "Somerville / North", citySlugs: ["somerville", "arlington", "belmont", "lexington"], extraZips: ["02134", "02135", "02130", "02155"], primaryDay: "wednesday", flexDay: "monday", slotTimes: SLOTS, slotDurationMin: 45, flexSlotCount: 1, flexReleaseHours: 24, priorityValueThreshold: 2500, driveGapWarningMin: 45, color: "#C8A46A", active: true },
      { id: "bos-metrowest", marketId: "boston", name: "South / MetroWest", citySlugs: ["needham", "wellesley", "natick", "framingham"], primaryDay: "thursday", flexDay: "tuesday", slotTimes: SLOTS, slotDurationMin: 45, flexSlotCount: 1, flexReleaseHours: 24, priorityValueThreshold: 2500, driveGapWarningMin: 45, color: "#A07830", active: true },
      // Worcester only where operationally supported — inactive by default.
      { id: "bos-worcester", marketId: "boston", name: "Worcester Region", citySlugs: [], zipPrefixes: ["016"], primaryDay: "friday", flexDay: "thursday", slotTimes: SLOTS, slotDurationMin: 45, flexSlotCount: 1, flexReleaseHours: 24, priorityValueThreshold: 2500, driveGapWarningMin: 60, color: "#2A5040", active: false },
    ],
  },
  {
    id: "south-florida",
    slug: "south-florida",
    name: "Southeast Florida",
    brandName: "StoneCraft Southeast Florida",
    shortName: "SE Florida",
    state: "FL",
    // Pre-launch until independent operating rights, entity, insurance and
    // brand availability in Florida are confirmed in writing. See docs/15.
    status: (process.env.MARKET_FL_STATUS as "live" | "pre-launch") ?? "pre-launch",
    statusNote: "We're confirming scheduling availability in Southeast Florida. Send photos and we'll tell you when we can serve your address.",
    timezone: "America/New_York",
    phoneE164: process.env.NEXT_PUBLIC_PHONE_FL ?? "+15610000000",
    phoneDisplay: process.env.NEXT_PUBLIC_PHONE_FL_DISPLAY ?? "(561) 000-0000",
    email: "hello@stonecraftsefl.com", // VERIFY domain
    hours: "Mon–Fri 8am–5:30pm",
    serviceAreaLabel: "Serving Palm Beach County and Broward County",
    homeBase: { lat: 26.5, lng: -80.1 }, // VERIFY
    showPriceRanges: false,
    credentialIds: ["insured", "fl-license"],
    ghl: { locationIdEnv: "GHL_LOCATION_ID_FL", pipelineEnvPrefix: "GHL_FL" },
    zones: [
      { id: "fl-pb-north", marketId: "south-florida", name: "Palm Beach North", citySlugs: ["west-palm-beach", "palm-beach", "palm-beach-gardens"], primaryDay: "monday", flexDay: "thursday", slotTimes: SLOTS, slotDurationMin: 45, flexSlotCount: 1, flexReleaseHours: 48, priorityValueThreshold: 2000, driveGapWarningMin: 40, color: "#1A3828", active: true,
        seasonalModes: [{ name: "peak", months: [11, 12, 1, 2, 3, 4], flexSlotCount: 2, flexReleaseHours: 24, priorityValueThreshold: 1500, slotTimes: ["10:00", "11:30", "13:00", "14:30", "15:45"] }] },
      { id: "fl-pb-south", marketId: "south-florida", name: "Boca / Delray", citySlugs: ["boca-raton", "highland-beach", "delray-beach", "boynton-beach"], primaryDay: "tuesday", flexDay: "thursday", slotTimes: SLOTS, slotDurationMin: 45, flexSlotCount: 1, flexReleaseHours: 48, priorityValueThreshold: 2000, driveGapWarningMin: 40, color: "#4A7060", active: true,
        seasonalModes: [{ name: "peak", months: [11, 12, 1, 2, 3, 4], flexSlotCount: 2, flexReleaseHours: 24, priorityValueThreshold: 1500, slotTimes: ["10:00", "11:30", "13:00", "14:30", "15:45"] }] },
      { id: "fl-broward", marketId: "south-florida", name: "Broward", citySlugs: ["fort-lauderdale", "pompano-beach", "deerfield-beach", "plantation", "weston", "coral-springs"], primaryDay: "wednesday", flexDay: "friday", slotTimes: SLOTS, slotDurationMin: 45, flexSlotCount: 1, flexReleaseHours: 48, priorityValueThreshold: 2000, driveGapWarningMin: 45, color: "#C8A46A", active: true },
    ],
  },
];

export const getMarket = (id: string) => markets.find((m) => m.id === id || m.slug === id);

/** All ZIPs routed to a zone, derived from the city table plus extras. */
export function zoneZips(zone: Zone): string[] {
  const fromCities = cities.filter((c) => zone.citySlugs.includes(c.slug)).flatMap((c) => c.zips);
  return Array.from(new Set([...fromCities, ...(zone.extraZips ?? [])]));
}

export const allZones = () => markets.flatMap((m) => m.zones);
