import { afterEach, describe, expect, it, vi } from "vitest";

/** Supabase KV backend: env is read at module load, so each test re-imports the store with fresh env + mocked fetch. */
async function loadWith(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("@/lib/store");
}

describe("Supabase/Postgres KV backend", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

  it("is selected when Supabase is set and Upstash is not; RPCs carry the server key and JSON args", async () => {
    const calls: { url: string; body: Record<string, unknown>; auth: string | null }[] = [];
    const replies: Record<string, unknown> = { kv_get: JSON.stringify({ a: 1 }), kv_setnx: true, kv_incr: 3, kv_lrange: [JSON.stringify("x"), JSON.stringify("y")], kv_set: null, kv_lpush: null, kv_del: null };
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      const fn = url.split("/rpc/")[1];
      calls.push({ url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get("authorization") });
      const r = replies[fn];
      return r === null ? new Response(null, { status: 204 }) : new Response(JSON.stringify(r), { status: 200 });
    }));
    const s = await loadWith({ UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "", SUPABASE_URL: "https://example.supabase.co/", SUPABASE_SERVICE_ROLE_KEY: "test-key", SUPABASE_KV: "" });
    expect(s.kvBackend).toBe("supabase");
    expect(s.kvConfigured).toBe(true);
    expect(await s.kvGet("k")).toEqual({ a: 1 });
    await s.kvSet("k", { b: 2 }, 60);
    expect(await s.kvSetNx("n", "v", 30)).toBe(true);
    expect(await s.kvIncr("c", 10)).toBe(3);
    await s.listPush("l", "x", 100);
    expect(await s.listRange("l", 0, 9)).toEqual(["x", "y"]);
    await s.kvDel("k");
    expect(calls.map((c) => c.url)).toEqual(["kv_get", "kv_set", "kv_setnx", "kv_incr", "kv_lpush", "kv_lrange", "kv_del"].map((f) => `https://example.supabase.co/rest/v1/rpc/${f}`));
    expect(calls[1].body).toEqual({ p_key: "k", p_value: JSON.stringify({ b: 2 }), p_ttl: 60 });
    expect(calls[4].body).toEqual({ p_key: "l", p_value: JSON.stringify("x"), p_max: 100 });
    expect(calls.every((c) => c.auth === "Bearer test-key")).toBe(true);
  });

  it("prefers Upstash when both are set, and can be disabled with SUPABASE_KV=0", async () => {
    let s = await loadWith({ UPSTASH_REDIS_REST_URL: "https://u", UPSTASH_REDIS_REST_TOKEN: "t", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" });
    expect(s.kvBackend).toBe("upstash");
    s = await loadWith({ UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", SUPABASE_KV: "0" });
    expect(s.kvBackend).toBe("memory");
  });

  it("surfaces RPC failures instead of silently falling back to memory", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    const s = await loadWith({ UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", SUPABASE_KV: "" });
    await expect(s.kvGet("k")).rejects.toThrow(/kv_get failed: 500/);
  });
});
