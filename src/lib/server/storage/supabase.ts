import "server-only";
import type { PrivateStore, SignedUrl } from "./types";

/**
 * Supabase Storage private bucket (same provider the Phase 2 photo flow uses).
 * Env (server-only): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PRIVATE_BUCKET (default "stonecraft-private").
 * The bucket must be PRIVATE. Signed upload URLs are single-use; signed download URLs are short-lived.
 */
const SUPA = () => process.env.SUPABASE_URL?.replace(/\/$/, "");
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = () => process.env.SUPABASE_PRIVATE_BUCKET || "stonecraft-private";
export const supabaseConfigured = () => Boolean(SUPA() && KEY());
const h = () => ({ Authorization: `Bearer ${KEY()}`, apikey: KEY()!, "Content-Type": "application/json" });

export const supabaseStore: PrivateStore = {
  name: "supabase",
  durable: true,
  maxBytes: 200 * 1024 * 1024,
  async signUpload(key, contentType, _size, ttlSec): Promise<SignedUrl> {
    const res = await fetch(`${SUPA()}/storage/v1/object/upload/sign/${BUCKET()}/${key}`, { method: "POST", headers: h(), body: "{}", cache: "no-store" });
    if (!res.ok) throw new Error(`storage sign failed ${res.status}`);
    const { url } = (await res.json()) as { url: string };
    return { url: `${SUPA()}/storage/v1${url}`, method: "PUT", headers: { "Content-Type": contentType, "x-upsert": "false" }, expiresAt: new Date(Date.now() + ttlSec * 1000).toISOString() };
  },
  async signDownload(key, ttlSec, downloadName): Promise<SignedUrl> {
    const res = await fetch(`${SUPA()}/storage/v1/object/sign/${BUCKET()}/${key}`, { method: "POST", headers: h(), body: JSON.stringify({ expiresIn: ttlSec }), cache: "no-store" });
    if (!res.ok) throw new Error(`storage sign failed ${res.status}`);
    const { signedURL } = (await res.json()) as { signedURL: string };
    const dl = downloadName ? `&download=${encodeURIComponent(downloadName)}` : "";
    return { url: `${SUPA()}/storage/v1${signedURL}${dl}`, method: "GET", headers: {}, expiresAt: new Date(Date.now() + ttlSec * 1000).toISOString() };
  },
  async put(key, body, contentType) {
    const res = await fetch(`${SUPA()}/storage/v1/object/${BUCKET()}/${key}`, { method: "POST", headers: { Authorization: `Bearer ${KEY()}`, apikey: KEY()!, "Content-Type": contentType, "x-upsert": "true" }, body: Buffer.from(body), cache: "no-store" });
    if (!res.ok) throw new Error(`storage put failed ${res.status}`);
  },
  async get(key) {
    const res = await fetch(`${SUPA()}/storage/v1/object/authenticated/${BUCKET()}/${key}`, { headers: { Authorization: `Bearer ${KEY()}`, apikey: KEY()! }, cache: "no-store" });
    if (!res.ok) return null;
    return { body: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get("content-type") || "application/octet-stream" };
  },
  async remove(key) {
    await fetch(`${SUPA()}/storage/v1/object/${BUCKET()}`, { method: "DELETE", headers: h(), body: JSON.stringify({ prefixes: [key] }), cache: "no-store" });
  },
};
