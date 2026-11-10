/**
 * AI-assisted room scan (beta, admin only). Returns PROVISIONAL dimensions with confidence.
 * Never treated as field-verified; quotes from scans must be confirmed by measurement.
 * Env: ROOM_SCAN_ENABLED=true, ANTHROPIC_API_KEY, ROOM_SCAN_MODEL (default claude-sonnet-5-5)
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
const Body = z.object({ frames: z.array(z.string().regex(/^data:image\/jpeg;base64,/)).min(2).max(6), reference: z.object({ label: z.string(), inches: z.number().positive() }).optional(), notes: z.string().max(500).optional() });
const Out = z.object({ floor_sqft: z.number().nonnegative().nullable(), wall_tile_sqft: z.number().nonnegative().nullable(), shower_sqft: z.number().nonnegative().nullable(), confidence: z.enum(["low", "medium", "high"]), assumptions: z.string() });

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (process.env.ROOM_SCAN_ENABLED !== "true" || !process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Room scan beta is not enabled" }, { status: 503 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Send 2–6 JPEG frames" }, { status: 400 });
  const prompt = `You are estimating tiled surface areas for a restoration quote from phone camera frames of one room.
Estimate: floor tile area, wall tile area (excluding shower), shower enclosure tile area, all in square feet.
${p.data.reference ? `A reference object is visible: ${p.data.reference.label} = ${p.data.reference.inches} inches. Use it to calibrate.` : "No reference object was provided; standard fixtures (toilet ~28in deep, door ~30-36in wide, standard tub 60in) may help calibrate."}
${p.data.notes ? `Notes: ${p.data.notes}` : ""}
Be conservative. If you cannot see a surface, return null for it. Respond with ONLY JSON: {"floor_sqft":number|null,"wall_tile_sqft":number|null,"shower_sqft":number|null,"confidence":"low"|"medium"|"high","assumptions":"..."}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.ROOM_SCAN_MODEL ?? "claude-sonnet-5-5", max_tokens: 600, messages: [{ role: "user", content: [...p.data.frames.map((f) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.split(",")[1] } })), { type: "text", text: prompt }] }] }),
  });
  if (!res.ok) return NextResponse.json({ error: `Model error ${res.status}` }, { status: 502 });
  const j = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = j.content.find((c) => c.type === "text")?.text ?? "";
  const parsed = Out.safeParse((() => { try { return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch { return null; } })());
  if (!parsed.success) return NextResponse.json({ error: "Could not read estimate", raw: text.slice(0, 400) }, { status: 502 });
  return NextResponse.json({ ...parsed.data, provisional: true, fieldVerified: false, next: parsed.data.confidence === "low" ? "Use manual dimensions or add a reference object and rescan." : "Confirm with a tape measure before issuing the quote." });
}
