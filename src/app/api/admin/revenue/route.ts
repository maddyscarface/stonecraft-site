import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listRange } from "@/lib/store";
import { summarizeRevenue, type RevenueRecord } from "@/lib/attribution/revenue";

/** Revenue by source — ?model=first|last&market=boston|south-florida&days=90 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const model = sp.get("model") === "first" ? "first" : "last";
  const since = Date.now() - Number(sp.get("days") ?? 90) * 864e5;
  const market = sp.get("market");
  const records = (await listRange<RevenueRecord>("revenue", 0, 9999)).filter((r) => Date.parse(r.at) >= since && (!market || r.market === market));
  return NextResponse.json(summarizeRevenue(records, model));
}
