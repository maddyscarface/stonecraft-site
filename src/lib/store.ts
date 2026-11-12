/**
 * Key-value storage: Upstash Redis REST when configured, in-memory otherwise (dev/sandbox only).
 * Used for: lead log, idempotency keys, rate limits, admin overrides (pricing, scoring, zones).
 */
type Json = unknown;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
export const kvConfigured = Boolean(url && token);
/**
 * Production guard: never keep leads in process memory on a live site (lost on every serverless
 * recycle, not shared between instances). LEAD_ALLOW_MEMORY_STORE=1 is an escape hatch for local,
 * sandbox and *preview* deployments only. It is deliberately ignored when VERCEL_ENV=production so
 * the guard can't be masked by an env flag (Build 04 §5): production must have durable storage
 * (Upstash) or lead intake reports "blocked" and returns 503.
 */
export const isProductionDeploy = (env: Record<string, string | undefined> = process.env) => env.VERCEL_ENV === "production";
export function memoryStoreBlockedFor(env: Record<string, string | undefined>, kv: boolean) {
  if (kv || env.NODE_ENV !== "production") return false;
  if (isProductionDeploy(env)) return true;
  return env.LEAD_ALLOW_MEMORY_STORE !== "1";
}
export const memoryStoreBlocked = () => memoryStoreBlockedFor(process.env, kvConfigured);
/** True when a memory escape hatch is set on production but ignored (surfaced on /api/health). */
export const productionOverrideIgnored = () => isProductionDeploy() && (process.env.LEAD_ALLOW_MEMORY_STORE === "1" || process.env.ALLOW_LOCAL_UPLOADS === "true");

const mem = globalThis as unknown as { __scMem?: Map<string, { v: string; exp?: number }>; __scLists?: Map<string, string[]> };
mem.__scMem ??= new Map();
mem.__scLists ??= new Map();

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(url!, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd), cache: "no-store" });
  if (!res.ok) throw new Error(`KV ${cmd[0]} failed: ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

export async function kvGet<T = Json>(key: string): Promise<T | null> {
  if (kvConfigured) { const r = (await redis(["GET", key])) as string | null; return r ? (JSON.parse(r) as T) : null; }
  const e = mem.__scMem!.get(key);
  if (!e || (e.exp && e.exp < Date.now())) return null;
  return JSON.parse(e.v) as T;
}

export async function kvSet(key: string, value: Json, ttlSec?: number) {
  const v = JSON.stringify(value);
  if (kvConfigured) { await redis(ttlSec ? ["SET", key, v, "EX", ttlSec] : ["SET", key, v]); return; }
  mem.__scMem!.set(key, { v, exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined });
}

/** Set only if absent. Returns true if this call created the key. */
export async function kvSetNx(key: string, value: Json, ttlSec: number): Promise<boolean> {
  const v = JSON.stringify(value);
  if (kvConfigured) return (await redis(["SET", key, v, "NX", "EX", ttlSec])) === "OK";
  const e = mem.__scMem!.get(key);
  if (e && (!e.exp || e.exp > Date.now())) return false;
  mem.__scMem!.set(key, { v, exp: Date.now() + ttlSec * 1000 });
  return true;
}

export async function kvIncr(key: string, ttlSec: number): Promise<number> {
  if (kvConfigured) { const n = (await redis(["INCR", key])) as number; if (n === 1) await redis(["EXPIRE", key, ttlSec]); return n; }
  const cur = (await kvGet<number>(key)) ?? 0;
  await kvSet(key, cur + 1, ttlSec);
  return cur + 1;
}

export async function listPush(key: string, value: Json, max = 5000) {
  const v = JSON.stringify(value);
  if (kvConfigured) { await redis(["LPUSH", key, v]); await redis(["LTRIM", key, 0, max - 1]); return; }
  const l = mem.__scLists!.get(key) ?? [];
  l.unshift(v); mem.__scLists!.set(key, l.slice(0, max));
}

export async function listRange<T = Json>(key: string, start = 0, stop = 999): Promise<T[]> {
  if (kvConfigured) return ((await redis(["LRANGE", key, start, stop])) as string[]).map((s) => JSON.parse(s) as T);
  return (mem.__scLists!.get(key) ?? []).slice(start, stop + 1).map((s) => JSON.parse(s) as T);
}

export async function rateLimit(id: string, limit: number, windowSec: number) {
  const n = await kvIncr(`rl:${id}:${Math.floor(Date.now() / 1000 / windowSec)}`, windowSec);
  return { ok: n <= limit, count: n };
}
