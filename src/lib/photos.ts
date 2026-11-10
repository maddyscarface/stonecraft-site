/**
 * Photo storage adapter.
 *  - Production: Supabase Storage private bucket (signed upload + signed read URLs).
 *  - Dev/sandbox: in-memory store behind /api/uploads/local (blocked in production unless ALLOW_LOCAL_UPLOADS=true).
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PHOTO_BUCKET (default "assessment-photos")
 */
import { createHmac, randomUUID } from "node:crypto";

const SUPA = process.env.SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_PHOTO_BUCKET ?? "assessment-photos";
export const supabaseConfigured = Boolean(SUPA && KEY);
export const localUploadsAllowed = () => !supabaseConfigured && (process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_UPLOADS === "true");

export const ALLOWED_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };
export const MAX_BYTES = 20 * 1024 * 1024;

const g = globalThis as unknown as { __scPhotos?: Map<string, { type: string; data: Buffer }> };
g.__scPhotos ??= new Map();
export const localPhotos = g.__scPhotos;

const localSig = (key: string) => createHmac("sha256", process.env.ADMIN_TOKEN ?? "dev-only").update(`upload:${key}`).digest("hex").slice(0, 32);
export const verifyLocalSig = (key: string, sig: string) => localSig(key) === sig;

export function makeKey(eventId: string, contentType: string) {
  const ym = new Date().toISOString().slice(0, 7);
  const safeEvent = eventId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
  return `assessments/${ym}/${safeEvent}/${randomUUID()}.${ALLOWED_TYPES[contentType] ?? "jpg"}`;
}

export async function signUpload(key: string, contentType: string) {
  if (supabaseConfigured) {
    const res = await fetch(`${SUPA}/storage/v1/object/upload/sign/${BUCKET}/${key}`, { method: "POST", headers: { Authorization: `Bearer ${KEY}`, apikey: KEY!, "Content-Type": "application/json" }, body: "{}", cache: "no-store" });
    if (!res.ok) throw new Error(`storage sign failed ${res.status}`);
    const { url } = (await res.json()) as { url: string };
    return { uploadUrl: `${SUPA}/storage/v1${url}`, method: "PUT", headers: { "Content-Type": contentType, "x-upsert": "false" } };
  }
  if (!localUploadsAllowed()) throw new Error("Photo storage is not configured");
  return { uploadUrl: `/api/uploads/local?key=${encodeURIComponent(key)}&sig=${localSig(key)}`, method: "PUT", headers: { "Content-Type": contentType } };
}

/** Long-lived read links for the CRM record (owner/BDR use). */
export async function readUrls(keys: string[], baseUrl: string, expiresIn = 60 * 60 * 24 * 90) {
  if (!keys.length) return [];
  if (supabaseConfigured) {
    const res = await fetch(`${SUPA}/storage/v1/object/sign/${BUCKET}`, { method: "POST", headers: { Authorization: `Bearer ${KEY}`, apikey: KEY!, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn, paths: keys }), cache: "no-store" });
    if (!res.ok) return keys.map((k) => `storage://${BUCKET}/${k}`);
    const rows = (await res.json()) as { signedURL?: string; path: string }[];
    return rows.map((r) => (r.signedURL ? `${SUPA}/storage/v1${r.signedURL}` : `storage://${BUCKET}/${r.path}`));
  }
  return keys.map((k) => `${baseUrl}/api/uploads/local?key=${encodeURIComponent(k)}&sig=${localSig(k)}`);
}

export const validKeyForEvent = (key: string, eventId: string) => key.startsWith("assessments/") && key.includes(`/${eventId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60)}/`);
