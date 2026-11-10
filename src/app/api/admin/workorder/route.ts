import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { briefToText, generateBrief, type WorkOrderInput } from "@/lib/workorder/engine";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const input = (await req.json()) as WorkOrderInput;
  // Strip any pricing the caller may have included — tech briefs never carry it.
  const { priceTotal: _p, margin: _m, techPay: _t, ...safe } = input;
  const brief = generateBrief({ ...safe, jobId: safe.jobId || `WO-${Date.now()}` });
  return NextResponse.json({ brief, text: briefToText(brief) });
}
