/**
 * Key-value storage: Upstash Redis REST when configured; otherwise Supabase/Postgres (kv_* RPCs from
 * migrations/0005_kv_store.up.sql, server-only service-role key) when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set;
 * in-memory otherwise (dev/sandbox only).
 * Used for: lead log, idempotency keys, rate limits, admin overrides (pricing, scoring, zones), Phase 4 ops/walkthrough data.
 */
type Json = unknown;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const upstash = Boolean(url && token);
const sbUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
/** Supabase KV is used only when Upstash is absent and SUPABASE_KV is not "0". */
const supa = !upstash && Boolean(sbUrl && sbKey) && process.env.SUPABASE_KV !== "0";
export const kvBackend: "upstash" | "supabase" | "memory" = upstash ? "upstash" : supa ? "supabase" : "memory";
export const kvConfigured = kvBackend !== "memory";
export const kvBackendLabel = kvBackend === "upstash" ? "Upstash" : kvBackend === "supabase" ? "Supabase (Postgres)" : "in-memory (dev)";
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

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${sbUrl}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: sbKey!, Authorization: `Bearer ${sbKey}`, "Content-Type": "application/json" }, body: JSON.stringify(args), cache: "no-store" });
  if (!res.ok) throw new Error(`KV ${fn} failed: ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(url!, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd), cache: "no-store" });
  if (!res.ok) throw new Error(`KV ${cmd[0]} failed: ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

export async function kvGet<T = Json>(key: string): Promise<T | null> {
  if (supa) { const r = await rpc<string | null>("kv_get", { p_key: key }); return r ? (JSON.parse(r) as T) : null; }
  if (kvConfigured) { const r = (await redis(["GET", key])) as string | null; return r ? (JSON.parse(r) as T) : null; }
  const e = mem.__scMem!.get(key);
  if (!e || (e.exp && e.exp < Date.now())) return null;
  return JSON.parse(e.v) as T;
}

export async function kvSet(key: string, value: Json, ttlSec?: number) {
  const v = JSON.stringify(value);
  if (supa) { await rpc("kv_set", { p_key: key, p_value: v, p_ttl: ttlSec ?? null }); return; }
  if (kvConfigured) { await redis(ttlSec ? ["SET", key, v, "EX", ttlSec] : ["SET", key, v]); return; }
  mem.__scMem!.set(key, { v, exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined });
}

/** Set only if absent. Returns true if this call created the key. */
export async function kvSetNx(key: string, value: Json, ttlSec: number): Promise<boolean> {
  const v = JSON.stringify(value);
  if (supa) return (await rpc<boolean>("kv_setnx", { p_key: key, p_value: v, p_ttl: ttlSec })) === true;
  if (kvConfigured) return (await redis(["SET", key, v, "NX", "EX", ttlSec])) === "OK";
  const e = mem.__scMem!.get(key);
  if (e && (!e.exp || e.exp > Date.now())) return false;
  mem.__scMem!.set(key, { v, exp: Date.now() + ttlSec * 1000 });
  return true;
}

export async function kvIncr(key: string, ttlSec: number): Promise<number> {
  if (supa) return Number(await rpc<number | string>("kv_incr", { p_key: key, p_ttl: ttlSec }));
  if (kvConfigured) { const n = (await redis(["INCR", key])) as number; if (n === 1) await redis(["EXPIRE", key, ttlSec]); return n; }
  const cur = (await kvGet<number>(key)) ?? 0;
  await kvSet(key, cur + 1, ttlSec);
  return cur + 1;
}

export async function listPush(key: string, value: Json, max = 5000) {
  const v = JSON.stringify(value);
  if (supa) { await rpc("kv_lpush", { p_key: key, p_value: v, p_max: max }); return; }
  if (kvConfigured) { await redis(["LPUSH", key, v]); await redis(["LTRIM", key, 0, max - 1]); return; }
  const l = mem.__scLists!.get(key) ?? [];
  l.unshift(v); mem.__scLists!.set(key, l.slice(0, max));
}

export async function listRange<T = Json>(key: string, start = 0, stop = 999): Promise<T[]> {
  if (supa) return ((await rpc<string[] | null>("kv_lrange", { p_key: key, p_start: start, p_stop: stop })) ?? []).map((s) => JSON.parse(s) as T);
  if (kvConfigured) return ((await redis(["LRANGE", key, start, stop])) as string[]).map((s) => JSON.parse(s) as T);
  return (mem.__scLists!.get(key) ?? []).slice(start, stop + 1).map((s) => JSON.parse(s) as T);
}

export async function rateLimit(id: string, limit: number, windowSec: number) {
  const n = await kvIncr(`rl:${id}:${Math.floor(Date.now() / 1000 / windowSec)}`, windowSec);
  return { ok: n <= limit, count: n };
}

/** Phase 4: delete a key (used by the ops session / outbox adapter in src/lib/server/kv.ts). */
export async function kvDel(key: string) {
  if (supa) { await rpc("kv_del", { p_key: key }); return; }
  if (kvConfigured) { await redis(["DEL", key]); return; }
  mem.__scMem!.delete(key);
  mem.__scLists!.delete(key);
}

/** Test helper: clear the in-memory store. */
export function __resetMemoryStore() { mem.__scMem!.clear(); mem.__scLists!.clear(); }
