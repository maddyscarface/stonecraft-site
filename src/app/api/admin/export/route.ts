import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { listRange } from "@/lib/store";

/** Google Ads offline conversion import CSV (Upload → "Conversions from clicks"). */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  await audit("admin.export.get");
  const market = req.nextUrl.searchParams.get("market");
  const rows = (await listRange<{ gclid: string; conversion: string; time: string; value: number; market?: string }>("gads_offline", 0, 4999)).filter((r) => !market || r.market === market);
  const tz = "America/New_York";
  const fmt = (iso: string) => { const d = new Date(iso); const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(d); const o = Object.fromEntries(p.map((x) => [x.type, x.value])); return `${o.year}-${o.month}-${o.day} ${o.hour}:${o.minute}:${o.second}`; };
  const csv = [`Parameters:TimeZone=${tz}`, "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency", ...rows.map((r) => [r.gclid, r.conversion, fmt(r.time), r.value, "USD"].join(","))].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="gads-offline-${market ?? "all"}.csv"` } });
}
