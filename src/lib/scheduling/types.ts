export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type SeasonalMode = {
  name: string;
  /** 1–12 */
  months: number[];
  flexSlotCount?: number;
  flexReleaseHours?: number;
  priorityValueThreshold?: number;
  slotTimes?: string[];
};

export type Zone = {
  id: string;
  marketId: string;
  name: string;
  /** City slugs covered — ZIPs are derived from the city table. */
  citySlugs: string[];
  /** Extra ZIPs or 3-digit prefixes that should also route here. */
  extraZips?: string[];
  zipPrefixes?: string[];
  primaryDay: Weekday;
  flexDay: Weekday | "floating";
  slotTimes: string[];
  slotDurationMin: number;
  flexSlotCount: number;
  flexReleaseHours: number;
  priorityValueThreshold: number;
  driveGapWarningMin: number;
  color: string;
  active: boolean;
  seasonalModes?: SeasonalMode[];
};

export type Appointment = {
  id: string;
  type: "estimate" | "job" | "virtual_consult";
  zoneId: string;
  date: string; // YYYY-MM-DD (market local)
  start: string; // HH:MM
  durationMin: number;
  assignedTo: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  lat?: number;
  lng?: number;
};

export type LeadForScheduling = {
  zip?: string;
  town?: string;
  lat?: number;
  lng?: number;
  estimatedValue?: number;
  customerType?: string;
  isHnw?: boolean;
  isUrgent?: boolean;
};
