import { NextResponse, type NextRequest } from "next/server";
import { ALLOWED_TYPES, MAX_BYTES, localPhotos, localUploadsAllowed, verifyLocalSig } from "@/lib/photos";

export const runtime = "nodejs";

function check(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "", sig = req.nextUrl.searchParams.get("sig") ?? "";
  if (!localUploadsAllowed() || !key || !verifyLocalSig(key, sig)) return null;
  return key;
}

export async function PUT(req: NextRequest) {
  const key = check(req);
  if (!key) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const type = req.headers.get("content-type") ?? "";
  if (!ALLOWED_TYPES[type]) return NextResponse.json({ error: "type" }, { status: 415 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > MAX_BYTES) return NextResponse.json({ error: "size" }, { status: 413 });
  localPhotos.set(key, { type, data: buf });
  return new NextResponse(null, { status: 200 });
}

export async function GET(req: NextRequest) {
  const key = check(req);
  const f = key ? localPhotos.get(key) : undefined;
  if (!f) return new NextResponse("not found", { status: 404 });
  return new NextResponse(new Uint8Array(f.data), { headers: { "Content-Type": f.type, "Cache-Control": "private, max-age=3600" } });
}
