import { verifyFileSig } from "@/lib/server/storage/sign";
import { localStore } from "@/lib/server/storage/local";
import { sniffMime, typeMatches } from "@/lib/walkthrough/media";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...noStore, "Content-Type": "application/json" } });

/**
 * Signed-URL endpoint for the LOCAL (sandbox) private-file adapter only. Supabase signed URLs point straight at
 * the bucket and never hit this route. PUT verifies signature, declared type, exact size and magic bytes.
 */
export async function PUT(req: Request) {
  const q = new URL(req.url).searchParams;
  const key = q.get("key") || "", exp = Number(q.get("exp")), ct = q.get("ct") || "", size = Number(q.get("size")), sig = q.get("sig") || "";
  if (!verifyFileSig("put", key, exp, sig, `${ct}\n${size}`)) return json({ ok: false, error: "Link expired or invalid" }, 403);
  if ((req.headers.get("content-type") || "").split(";")[0] !== ct) return json({ ok: false, error: "Content type mismatch" }, 415);
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength !== size || buf.byteLength > localStore.maxBytes) return json({ ok: false, error: "Size mismatch" }, 413);
  const sniffed = sniffMime(buf);
  if (!typeMatches(ct, sniffed)) return json({ ok: false, error: "File content does not match its type" }, 415);
  await localStore.put(key, buf, ct);
  return json({ ok: true });
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const key = q.get("key") || "", exp = Number(q.get("exp")), sig = q.get("sig") || "", name = q.get("name") || "";
  if (!verifyFileSig("get", key, exp, sig, name)) return json({ ok: false, error: "Link expired or invalid" }, 403);
  const obj = await localStore.get(key);
  if (!obj) return json({ ok: false, error: "Not found (sandbox storage is temporary)" }, 404);
  return new Response(Buffer.from(obj.body), { headers: { ...noStore, "Content-Type": obj.contentType, "X-Content-Type-Options": "nosniff", "Content-Disposition": `${name ? "attachment" : "inline"}; filename="${(name || key.split("/").pop() || "file").replace(/[^\w.\- ]/g, "_")}"` } });
}
