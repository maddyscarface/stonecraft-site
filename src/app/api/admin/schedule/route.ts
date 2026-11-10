import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { markets } from "@/config/markets";
import { cityByZip } from "@/config/cities";
import { checkBooking, detectZone, localParts, priorityReasons, suggestSlots } from "@/lib/scheduling/engine";
import type { Appointment } from "@/lib/scheduling/types";
import { kvGet, kvSet } from "@/lib/store";
import { marketForZip } from "@/lib/leads/routing";

export const runtime = "nodejs";
const apptKey = (m: string) => `appts:${m}`;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const b = (await req.json()) as { action: "suggest" | "book" | "list"; zip?: string; town?: string; estimatedValue?: number; customerType?: string; isHnw?: boolean; isUrgent?: boolean; booking?: Omit<Appointment, "id" | "status">; market?: string };
  const m = b.zip ? marketForZip(b.zip) : markets.find((x) => x.id === b.market);
  if (!m) return NextResponse.json({ error: "ZIP not in a configured market" }, { status: 400 });
  const appts = (await kvGet<Appointment[]>(apptKey(m.id))) ?? [];
  if (b.action === "list") return NextResponse.json({ market: m.id, appointments: appts });

  const lead = { zip: b.zip, town: b.town, estimatedValue: b.estimatedValue, customerType: b.customerType, isHnw: b.isHnw, isUrgent: b.isUrgent };
  const now = localParts(new Date(), m.timezone);
  const points: Record<string, { lat: number; lng: number }> = {};
  for (const a of appts) if (a.lat && a.lng) points[a.id] = { lat: a.lat, lng: a.lng };
  const city = b.zip ? cityByZip(b.zip) : undefined;
  const leadPoint = city ? { lat: city.lat, lng: city.lng } : undefined;

  if (b.action === "suggest") return NextResponse.json({ market: m.id, now, suggestion: suggestSlots({ lead, zones: m.zones, appointments: appts, now, leadPoint, appointmentPoints: points }) });

  if (b.action === "book" && b.booking) {
    const zone = m.zones.find((z) => z.id === b.booking!.zoneId) ?? detectZone(lead, m.zones);
    if (!zone) return NextResponse.json({ error: "zone not found" }, { status: 400 });
    const isPriority = priorityReasons(lead, zone.priorityValueThreshold).length > 0;
    const check = checkBooking({ candidate: b.booking, appointments: appts, zone, isPriority, points, candidatePoint: leadPoint });
    if (!check.ok) return NextResponse.json(check, { status: 409 });
    const appt: Appointment = { ...b.booking, id: `ap_${Date.now()}`, status: "pending", lat: leadPoint?.lat, lng: leadPoint?.lng };
    await kvSet(apptKey(m.id), [...appts, appt]);
    return NextResponse.json({ ok: true, appointment: appt, warnings: check.warnings, notifyOwner: isPriority });
  }
  return NextResponse.json({ error: "bad action" }, { status: 400 });
}
