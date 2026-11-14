import "server-only";

/**
 * Minimal DataMoon transport. Never logs keys; legacy `api_key` is sent in the JSON body (not the query
 * string) to avoid URL logging. Maps documented error codes to typed errors so callers can handle
 * 401/403 (auth), 410 (expired export), 422 (validation / monthly record limit / disallowed fields), 429 (rate limit).
 */
export type DmErrorCode = "auth" | "not_found" | "validation" | "quota_exceeded" | "rate_limited" | "expired" | "server" | "disabled" | "network";
export class DataMoonError extends Error {
  constructor(public code: DmErrorCode, public status: number, message: string, public retryAfterSec?: number, public detail?: unknown) { super(message); }
}
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export async function dmRequest<T>(opts: { base: string; path: string; method: "GET" | "POST" | "PATCH" | "DELETE"; headers?: Record<string, string>; body?: unknown; query?: Record<string, string | number | undefined>; fetcher?: Fetcher; timeoutMs?: number }): Promise<T> {
  const q = opts.query ? "?" + new URLSearchParams(Object.entries(opts.query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : "";
  const f = opts.fetcher ?? fetch;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 15_000);
  let res: Response;
  try {
    res = await f(`${opts.base}${opts.path}${q}`, { method: opts.method, headers: { Accept: "application/json", ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}), ...opts.headers }, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined, cache: "no-store", signal: ctl.signal });
  } catch (e) { throw new DataMoonError("network", 0, `DataMoon network error: ${(e as Error).name}`); }
  finally { clearTimeout(t); }
  const text = await res.text();
  let json: unknown = undefined; try { json = text ? JSON.parse(text) : undefined; } catch { /* non-JSON */ }
  if (res.ok) return json as T;
  const msg = (json as { message?: string; detail?: string })?.message || (json as { detail?: string })?.detail || `HTTP ${res.status}`;
  if (res.status === 400 || res.status === 401 || res.status === 403) throw new DataMoonError("auth", res.status, msg);
  if (res.status === 404) throw new DataMoonError("not_found", 404, msg);
  if (res.status === 410) throw new DataMoonError("expired", 410, msg);
  if (res.status === 429) throw new DataMoonError("rate_limited", 429, msg, Number(res.headers.get("retry-after")) || 60);
  if (res.status === 422) throw new DataMoonError(/limit|quota|exceed|credit/i.test(msg) ? "quota_exceeded" : "validation", 422, msg, undefined, (json as { errors?: unknown; allowed_fields?: unknown })?.errors ?? (json as { allowed_fields?: unknown })?.allowed_fields);
  throw new DataMoonError("server", res.status, msg);
}
