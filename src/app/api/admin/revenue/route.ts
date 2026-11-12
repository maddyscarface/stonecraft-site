import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { listRange } from "@/lib/store";
import { summarizeRevenue, type RevenueRecord } from "@/lib/attribution/revenue";

/** Revenue by source — ?model=first|last&basis=completed|won&market=boston|south-florida&days=90 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  await audit("admin.revenue.get");
  const sp = req.nextUrl.searchParams;
  const model = sp.get("model") === "first" ? "first" : "last";
  const since = Date.now() - Number(sp.get("days") ?? 90) * 864e5;
  const market = sp.get("market");
  const records = (await listRange<RevenueRecord>("revenue", 0, 9999)).filter((r) => Date.parse(r.at) >= since && (!market || r.market === market));
  const basis = sp.get("basis") === "won" ? "won" : "completed";
  return NextResponse.json(summarizeRevenue(records, model, basis));
}
