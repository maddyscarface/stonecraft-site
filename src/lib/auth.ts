import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

/**
 * Minimal owner/BDR gate for internal tools until SmartOps auth (Supabase Auth with roles) is live.
 * ADMIN_TOKEN must be a long random string. The cookie stores an HMAC of it, never the token.
 */
const COOKIE = "sc_admin";

function sign(v: string) {
  return createHmac("sha256", process.env.ADMIN_TOKEN ?? "").update(`sc-admin:${v}`).digest("hex");
}

export function adminConfigured() { return (process.env.ADMIN_TOKEN ?? "").length >= 24; }

export function tokenMatches(candidate: string) {
  const t = process.env.ADMIN_TOKEN ?? "";
  if (!adminConfigured()) return false;
  const a = Buffer.from(candidate), b = Buffer.from(t);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const sessionValue = () => sign("session");

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const c = (await cookies()).get(COOKIE)?.value;
  if (c && c.length === 64 && timingSafeEqual(Buffer.from(c), Buffer.from(sessionValue()))) return true;
  const h = (await headers()).get("authorization")?.replace(/^Bearer\s+/i, "");
  return h ? tokenMatches(h) : false;
}

export const ADMIN_COOKIE = COOKIE;
