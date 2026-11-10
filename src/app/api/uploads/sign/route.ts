import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ALLOWED_TYPES, MAX_BYTES, makeKey, signUpload } from "@/lib/photos";
import { rateLimit } from "@/lib/store";

export const runtime = "nodejs";
const Body = z.object({ filename: z.string().max(200), contentType: z.string(), size: z.number().int().positive(), eventId: z.string().min(8).max(100) });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  if (!(await rateLimit(`upl:${ip}`, 40, 600)).ok) return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  const type = p.data.contentType === "" && /\.(heic|heif)$/i.test(p.data.filename) ? "image/heic" : p.data.contentType;
  if (!ALLOWED_TYPES[type]) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  if (p.data.size > MAX_BYTES) return NextResponse.json({ error: "File over 20 MB" }, { status: 413 });
  try {
    const key = makeKey(p.data.eventId, type);
    return NextResponse.json({ key, ...(await signUpload(key, type)) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}
