/**
 * Zone-first scheduling engine (SmartOps Module 2).
 * Pure functions — no I/O. Storage adapters feed appointments in and persist results.
 *
 * Rules implemented:
 *  1 Zone-first booking (primary day → flex day → next cycle / adjacent zone)
 *  2 Proximity fill (closest to existing appointments first)
 *  3 Flex slot holds with time-based release
 *  4 Priority override (value, HNW, commercial, urgent)
 *  6 Estimate vs job calendars are separate (filtered by `type`)
 *  7 Hard block on time overlap per assignee; soft warning on drive gaps
 */
import { zoneZips } from "@/config/markets";
import { cities } from "@/config/cities";
import type { Appointment, LeadForScheduling, Weekday, Zone } from "./types";

const DAYS: Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// ───────────── date helpers (local market time) ─────────────

export function localParts(now: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  const hour = p.hour === "24" ? "00" : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
}

export function weekdayOf(date: string): Weekday {
  const [y, m, d] = date.split("-").map(Number);
  return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Next date (strictly after `from` unless includeToday) that falls on `day`. */
export function nextDateFor(day: Weekday, from: string, includeToday = false): string {
  for (let i = includeToday ? 0 : 1; i <= 7; i++) {
    const d = addDays(from, i);
    if (weekdayOf(d) === day) return d;
  }
  return addDays(from, 7);
}

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** Minutes between two local (date,time) pairs. */
function minutesBetween(aDate: string, aTime: string, bDate: string, bTime: string) {
  const dayDiff = (Date.parse(bDate) - Date.parse(aDate)) / 86_400_000;
  return dayDiff * 1440 + toMin(bTime) - toMin(aTime);
}

// ───────────── zones ─────────────

export function effectiveZone(zone: Zone, month: number): Zone & { mode: string } {
  const m = zone.seasonalModes?.find((s) => s.months.includes(month));
  if (!m) return { ...zone, mode: "standard" };
  return {
    ...zone,
    mode: m.name,
    flexSlotCount: m.flexSlotCount ?? zone.flexSlotCount,
    flexReleaseHours: m.flexReleaseHours ?? zone.flexReleaseHours,
    priorityValueThreshold: m.priorityValueThreshold ?? zone.priorityValueThreshold,
    slotTimes: m.slotTimes ?? zone.slotTimes,
  };
}

export function detectZone(lead: LeadForScheduling, zones: Zone[], opts: { includeInactive?: boolean } = {}): Zone | null {
  const pool = zones.filter((z) => opts.includeInactive || z.active);
  const zip = lead.zip?.trim().slice(0, 5);
  if (zip) {
    const exact = pool.find((z) => zoneZips(z).includes(zip));
    if (exact) return exact;
    const prefix = pool.find((z) => z.zipPrefixes?.some((p) => zip.startsWith(p)));
    if (prefix) return prefix;
  }
  if (lead.town) {
    const t = lead.town.trim().toLowerCase();
    const city = cities.find((c) => c.name.toLowerCase() === t || c.slug === t.replace(/\s+/g, "-") || c.neighborhoods?.some((n) => n.toLowerCase() === t));
    if (city) return pool.find((z) => z.citySlugs.includes(city.slug)) ?? null;
  }
  return null;
}

// ───────────── distance ─────────────

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Rough drive-time ESTIMATE from straight-line distance (road factor 1.35, 32 km/h urban average).
 * Labelled `estimated: true` everywhere it surfaces. Replace with a distance-matrix adapter when configured.
 */
export function estimateDriveMinutes(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return { minutes: Math.round(((haversineKm(a, b) * 1.35) / 32) * 60), estimated: true as const };
}

// ───────────── slots ─────────────

export type Slot = {
  date: string;
  time: string;
  isFlex: boolean;
  /** ISO-like local "YYYY-MM-DD HH:MM" when the flex hold releases to the general queue. */
  flexReleaseAt: string | null;
  /** Whether a non-priority lead may book it right now. */
  openToGeneral: boolean;
};

export function availableSlots(params: {
  zone: Zone;
  date: string;
  appointments: Appointment[];
  type?: Appointment["type"];
  now: { date: string; time: string };
  assignedTo?: string;
}): Slot[] {
  const { zone, date, appointments, now } = params;
  const type = params.type ?? "estimate";
  const month = Number(date.slice(5, 7));
  const z = effectiveZone(zone, month);

  const booked = appointments.filter((a) => a.zoneId === zone.id && a.date === date && a.type === type && a.status !== "cancelled" && (!params.assignedTo || a.assignedTo === params.assignedTo)).map((a) => a.start);
  // Remove past slots on the same day.
  const free = z.slotTimes.filter((t) => !booked.includes(t) && minutesBetween(now.date, now.time, date, t) > 0);

  // The last N configured slots are FLEX holds (regardless of which are booked).
  const flexTimes = new Set(z.slotTimes.slice(Math.max(0, z.slotTimes.length - z.flexSlotCount)));

  return free.map((time) => {
    const isFlex = flexTimes.has(time);
    if (!isFlex) return { date, time, isFlex, flexReleaseAt: null, openToGeneral: true };
    const releaseMin = toMin(time) - z.flexReleaseHours * 60;
    const dayOffset = Math.floor(releaseMin / 1440);
    const relDate = addDays(date, dayOffset);
    const relTime = fromMin(((releaseMin % 1440) + 1440) % 1440);
    const released = minutesBetween(relDate, relTime, now.date, now.time) >= 0;
    return { date, time, isFlex, flexReleaseAt: `${relDate} ${relTime}`, openToGeneral: released };
  });
}

// ───────────── priority ─────────────

export function priorityReasons(lead: LeadForScheduling, threshold: number): string[] {
  const r: string[] = [];
  if ((lead.estimatedValue ?? 0) > threshold) r.push(`Estimated value above $${threshold}`);
  if (lead.isHnw) r.push("Luxury / HNW property");
  if (lead.customerType === "commercial" || lead.customerType === "property_manager") r.push("Commercial account");
  if (lead.isUrgent) r.push("Urgent flag (listing date, safety or time-sensitive)");
  return r;
}

// ───────────── suggestions ─────────────

export type Suggestion =
  | { detected: false; manualAssignRequired: true; reason: string }
  | {
      detected: true;
      zone: { id: string; name: string; color: string; mode: string };
      primary: { date: string; day: Weekday; slots: Slot[] };
      secondary: { date: string; day: Weekday | "floating"; slots: Slot[] } | null;
      fallback: { date: string; slots: Slot[] } | null;
      isPriority: boolean;
      priorityReasons: string[];
      canBookAnyZone: boolean;
      requiresBdrConfirmation: boolean;
      notifyOwner: boolean;
      bdrScript: string;
    };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildBdrScript(primaryDay: string, slots: Slot[]) {
  const times = slots.slice(0, 4).map((s) => s.time);
  if (!times.length) return "Let me check the next opening for your area and come right back to you. In the meantime, if you send a few photos, I can make sure the specialist is prepared.";
  return `We have availability in your area on ${cap(primaryDay)}. I can book ${times.join(", ")}. Before then, if you send a few photos, I can make sure the specialist is prepared for what you're seeing.`;
}

export function suggestSlots(params: {
  lead: LeadForScheduling;
  zones: Zone[];
  appointments: Appointment[];
  now: { date: string; time: string };
  /** Coordinates of the lead, if known, for proximity ordering. */
  leadPoint?: { lat: number; lng: number };
  appointmentPoints?: Record<string, { lat: number; lng: number }>;
}): Suggestion {
  const { lead, zones, appointments, now } = params;
  const zone = detectZone(lead, zones);
  if (!zone) return { detected: false, manualAssignRequired: true, reason: "Address did not match an active zone. Assign manually or confirm the service area." };

  const z = effectiveZone(zone, Number(now.date.slice(5, 7)));
  const reasons = priorityReasons(lead, z.priorityValueThreshold);
  const isPriority = reasons.length > 0;
  const visible = (slots: Slot[]) => slots.filter((s) => isPriority || s.openToGeneral);

  const primaryDate = nextDateFor(z.primaryDay, now.date, true);
  let primarySlots = visible(availableSlots({ zone, date: primaryDate, appointments, now }));

  // Rule 2: proximity — order slots so the nearest existing appointment's neighbours fill first.
  if (params.leadPoint && params.appointmentPoints) {
    const dayAppts = appointments.filter((a) => a.zoneId === zone.id && a.date === primaryDate && a.status !== "cancelled");
    if (dayAppts.length) {
      const nearest = dayAppts
        .map((a) => ({ a, km: params.appointmentPoints![a.id] ? haversineKm(params.leadPoint!, params.appointmentPoints![a.id]) : Infinity }))
        .sort((x, y) => x.km - y.km)[0];
      const anchor = toMin(nearest.a.start);
      primarySlots = [...primarySlots].sort((x, y) => Math.abs(toMin(x.time) - anchor) - Math.abs(toMin(y.time) - anchor));
    }
  }

  let secondary: { date: string; day: Weekday | "floating"; slots: Slot[] } | null = null;
  if (z.flexDay !== "floating") {
    const d = nextDateFor(z.flexDay, now.date, true);
    secondary = { date: d, day: z.flexDay, slots: visible(availableSlots({ zone, date: d, appointments, now })) };
  }

  let fallback: { date: string; slots: Slot[] } | null = null;
  if (!primarySlots.length && !(secondary?.slots.length)) {
    const d = nextDateFor(z.primaryDay, primaryDate, false);
    fallback = { date: d, slots: visible(availableSlots({ zone, date: d, appointments, now })) };
  }

  return {
    detected: true,
    zone: { id: zone.id, name: zone.name, color: zone.color, mode: z.mode },
    primary: { date: primaryDate, day: z.primaryDay, slots: primarySlots },
    secondary,
    fallback,
    isPriority,
    priorityReasons: reasons,
    canBookAnyZone: isPriority,
    requiresBdrConfirmation: isPriority,
    notifyOwner: isPriority,
    bdrScript: buildBdrScript(z.primaryDay, primarySlots),
  };
}

// ───────────── booking checks ─────────────

export type BookingCheck = { ok: true; warnings: string[] } | { ok: false; error: "SLOT_CONFLICT" | "OUTSIDE_ZONE_DAY"; detail: string };

export function checkBooking(params: {
  candidate: Omit<Appointment, "id" | "status">;
  appointments: Appointment[];
  zone: Zone;
  isPriority: boolean;
  points?: Record<string, { lat: number; lng: number }>;
  candidatePoint?: { lat: number; lng: number };
}): BookingCheck {
  const { candidate, appointments, zone } = params;
  const cStart = toMin(candidate.start), cEnd = cStart + candidate.durationMin;
  const mine = appointments.filter((a) => a.assignedTo === candidate.assignedTo && a.date === candidate.date && a.status !== "cancelled");

  // Rule 7 hard block: any time overlap for the same person.
  const clash = mine.find((a) => { const s = toMin(a.start), e = s + a.durationMin; return cStart < e && s < cEnd; });
  if (clash) return { ok: false, error: "SLOT_CONFLICT", detail: `${candidate.assignedTo} already has an appointment at ${clash.start}.` };

  // Rule 1/4: off-zone-day bookings need priority.
  const day = weekdayOf(candidate.date);
  if (candidate.type === "estimate" && day !== zone.primaryDay && day !== zone.flexDay && zone.flexDay !== "floating" && !params.isPriority) {
    return { ok: false, error: "OUTSIDE_ZONE_DAY", detail: `${zone.name} is booked on ${cap(zone.primaryDay)} (flex ${cap(String(zone.flexDay))}). Use priority override with BDR confirmation.` };
  }

  // Rule 7 soft warning: gap vs estimated drive.
  const warnings: string[] = [];
  const sorted = [...mine].sort((a, b) => toMin(a.start) - toMin(b.start));
  const prev = [...sorted].reverse().find((a) => toMin(a.start) < cStart);
  const next = sorted.find((a) => toMin(a.start) > cStart);
  const check = (other: Appointment | undefined, gap: number, dir: string) => {
    if (!other) return;
    if (params.points?.[other.id] && params.candidatePoint) {
      const drive = estimateDriveMinutes(params.points[other.id], params.candidatePoint).minutes;
      if (drive > gap) warnings.push(`Estimated drive ${dir} (~${drive} min, straight-line estimate) exceeds the ${gap}-min gap.`);
    }
    if (gap > zone.driveGapWarningMin) warnings.push(`Gap ${dir} is ${gap} min (> ${zone.driveGapWarningMin}-min warning threshold).`);
  };
  if (prev) check(prev, cStart - (toMin(prev.start) + prev.durationMin), "from previous appointment");
  if (next) check(next, toMin(next.start) - cEnd, "to next appointment");
  if (params.isPriority && day !== zone.primaryDay) warnings.push("Priority override booking — owner will be notified.");

  return { ok: true, warnings };
}
