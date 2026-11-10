import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { kvGet } from "@/lib/store";
import { draftPriceSheets } from "@/config/pricing";
import { buildQuote, customerView, type QuoteLineInput } from "@/lib/pricing/engine";
import type { PriceSheet } from "@/lib/pricing/types";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const b = (await req.json()) as { market: string; zip?: string; customerType?: string; isHnw?: boolean; lines: QuoteLineInput[] };
  const sheet = (await kvGet<PriceSheet>(`cfg:pricing:${b.market}`)) ?? draftPriceSheets.find((s) => s.marketId === b.market);
  if (!sheet) return NextResponse.json({ error: "no price sheet" }, { status: 400 });
  const q = buildQuote({ sheet, zip: b.zip, customerType: b.customerType, isHnw: b.isHnw, month: new Date().getMonth() + 1, lines: b.lines });
  return NextResponse.json({ internal: q, customer: customerView(q), sheetVersion: sheet.version, approved: sheet.approved });
}
