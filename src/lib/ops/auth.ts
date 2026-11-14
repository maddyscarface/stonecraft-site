import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { kv, kvConfigured } from "@/lib/server/kv";
import { clientIp, rateLimit } from "@/lib/server/guards";
import { BRAND_ID } from "./brand";
import { hasPermission, isRole, type OpsRole, type Permission } from "./rbac";

/**
 * Ops console authentication (deny by default).
 *  - Staff identities come from server-only env. Tokens are never stored in plain text in OPS_STAFF_JSON:
 *      OPS_STAFF_JSON='[{"id":"sam","name":"Sam","role":"estimator","brands":["stonecraft"],"tokenSha256":"<hex sha256 of token>"}]'
 *  - The existing Phase 2/3 ADMIN_TOKEN (24+ chars) keeps working and maps to the owner role (brand stonecraft).
 *  - A login exchanges the token for an opaque session id in an HttpOnly, SameSite=Strict cookie (8 h, revocable).
 *    Scripts may send the token as a Bearer header instead. Cookie-authenticated writes require a same-origin request.
 *  - The console is LOCKED (404) when no staff identity is configured on the deployment.
 */
export type Actor = { id: string; name: string; role: OpsRole; brands: string[]; via: "session" | "bearer" };
type StaffDef = { id: string; name: string; role: OpsRole; brands: string[]; tokenSha256?: string; envToken?: string };

export const SESSION_COOKIE = "sc_ops";
const SESSION_TTL = 8 * 60 * 60;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const eqHex = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function staffDefs(): StaffDef[] {
  const out: StaffDef[] = [];
  const legacy: [string, string, string, OpsRole][] = [
    ["ADMIN_TOKEN", "owner", "Owner", "owner"],
  ];
  for (const [env, id, name, role] of legacy) {
    const v = process.env[env] || "";
    if (v.length >= 24) out.push({ id, name, role, brands: [BRAND_ID], envToken: v });
  }
  try {
    const parsed = JSON.parse(process.env.OPS_STAFF_JSON || "[]") as unknown[];
    for (const s of Array.isArray(parsed) ? parsed : []) {
      const x = s as Record<string, unknown>;
      if (typeof x.id === "string" && /^[a-z0-9-]{2,40}$/.test(x.id) && isRole(x.role) && typeof x.tokenSha256 === "string" && /^[0-9a-f]{64}$/.test(x.tokenSha256) && !out.some((o) => o.id === x.id)) {
        out.push({ id: x.id, name: typeof x.name === "string" ? x.name.slice(0, 60) : x.id, role: x.role, brands: Array.isArray(x.brands) ? x.brands.filter((b): b is string => typeof b === "string") : [], tokenSha256: x.tokenSha256 });
      }
    }
  } catch { /* malformed JSON → no extra staff (fail closed) */ }
  return out;
}

export const opsEnabled = () => staffDefs().length > 0;

export function identify(token: string): StaffDef | null {
  if (!token || token.length < 16) return null;
  const h = sha256(token);
  for (const s of staffDefs()) {
    const expected = s.tokenSha256 ?? sha256(s.envToken!);
    if (eqHex(h, expected)) return s;
  }
  return null;
}

export const isDisabled = async (id: string) => (await kv.get(`ops:staff:disabled:${id}`)) === "1";
export async function setDisabled(id: string, disabled: boolean) {
  if (disabled) await kv.set(`ops:staff:disabled:${id}`, "1"); else await kv.del(`ops:staff:disabled:${id}`);
  if (disabled) await kv.set(`ops:staff:revoked_before:${id}`, String(Date.now()));
}

export async function createSession(s: StaffDef): Promise<{ sid: string; maxAge: number }> {
  const sid = randomBytes(32).toString("base64url");
  await kv.set(`ops:sess:${sha256(sid)}`, JSON.stringify({ staffId: s.id, createdAt: Date.now() }), SESSION_TTL);
  return { sid, maxAge: SESSION_TTL };
}
export async function destroySession(sid: string) { await kv.del(`ops:sess:${sha256(sid)}`); }

function readCookie(req: Request, name: string) {
  const c = req.headers.get("cookie") || "";
  for (const part of c.split(/;\s*/)) { const i = part.indexOf("="); if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1)); }
  return "";
}
export const sessionCookieValue = (req: Request) => readCookie(req, SESSION_COOKIE);

export function cookieHeader(req: Request, sid: string, maxAge: number) {
  const secure = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  return `${SESSION_COOKIE}=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

async function resolveActor(req: Request): Promise<Actor | null> {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (bearer) {
    const s = identify(bearer);
    return s ? { id: s.id, name: s.name, role: s.role, brands: s.brands, via: "bearer" } : null;
  }
  const sid = readCookie(req, SESSION_COOKIE);
  if (!sid) return null;
  const raw = await kv.get(`ops:sess:${sha256(sid)}`);
  if (!raw) return null;
  const sess = JSON.parse(raw) as { staffId: string; createdAt: number };
  const revokedBefore = Number((await kv.get(`ops:staff:revoked_before:${sess.staffId}`)) || 0);
  if (revokedBefore && sess.createdAt <= revokedBefore) return null;
  const s = staffDefs().find((d) => d.id === sess.staffId);
  return s ? { id: s.id, name: s.name, role: s.role, brands: s.brands, via: "session" } : null;
}

const j = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });

/** Production fail-closed: ops writes need durable storage. */
export const opsStorageReady = () => process.env.VERCEL_ENV !== "production" || kvConfigured;

/**
 * Gate for every /api/admin/ops request. Order: locked → authn → disabled → brand grant → CSRF → permission.
 * Returns the actor or a Response to send back.
 */
export async function requireOps(req: Request, perm: Permission): Promise<Actor | Response> {
  if (!opsEnabled()) return j({ ok: false, error: "Admin is disabled on this deployment" }, 404);
  const actor = await resolveActor(req);
  if (!actor) {
    if (!(await rateLimit(`ops-fail:${clientIp(req.headers)}`, 10, 900))) return j({ ok: false, error: "Too many attempts" }, 429);
    return j({ ok: false, error: "Unauthorised" }, 401);
  }
  if (await isDisabled(actor.id)) return j({ ok: false, error: "Access revoked" }, 401);
  if (!actor.brands.includes(BRAND_ID)) return j({ ok: false, error: "No access to this brand" }, 403);
  if (req.method !== "GET" && req.method !== "HEAD" && actor.via === "session") {
    const origin = req.headers.get("origin"), host = req.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) return j({ ok: false, error: "Cross-site request blocked" }, 403);
  }
  if (!hasPermission(actor.role, perm)) return j({ ok: false, error: "Your role cannot do this" }, 403);
  if (req.method !== "GET" && !opsStorageReady()) return j({ ok: false, error: "Durable storage (Upstash) is not configured on production" }, 503);
  return actor;
}

export const opsJson = j;
