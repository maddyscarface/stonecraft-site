/**
 * Server-side conversion delivery: Meta Conversions API + GA4 Measurement Protocol.
 * Deduplication: the browser and server send the SAME event_id (Meta) / the same
 * transaction-style id param (GA4 dedupe is handled by sending the server copy only for
 * CRM-stage events that the browser never fires).
 *
 * Per-market config falls back to shared ids:
 *   META_PIXEL_ID (must equal NEXT_PUBLIC_META_PIXEL_ID for dedup) · META_CAPI_TOKEN
 *   (per-market _BOSTON/_FL overrides exist but only if the browser pixel is also split per market)
 *   GA4_MEASUREMENT_ID(_BOSTON|_FL), GA4_API_SECRET(_BOSTON|_FL)
 * Consent: callers pass `consent.ad_storage`; Meta events are skipped when ad consent is denied.
 */
import { createHash } from "node:crypto";

const sha = (v?: string) => (v ? createHash("sha256").update(v.trim().toLowerCase()).digest("hex") : undefined);
const suffix = (market?: string | null) => (market === "south-florida" ? "_FL" : market === "boston" ? "_BOSTON" : "");
const env = (name: string, market?: string | null) => process.env[`${name}${suffix(market)}`] ?? process.env[name];

export type ServerEvent = {
  name: string;           // Meta event name
  ga4Name: string;        // GA4 event name
  eventId: string;
  market?: string | null;
  url?: string;
  value?: number;
  currency?: string;
  user: { email?: string; phone?: string; firstName?: string; lastName?: string; zip?: string; city?: string; state?: string; externalId?: string };
  client?: { ip?: string; userAgent?: string; fbc?: string; fbp?: string; gaClientId?: string };
  params?: Record<string, string | number | undefined>;
  consent: { ad_storage: boolean; analytics_storage: boolean };
  /** Unix seconds; defaults to now. Meta accepts up to 7 days back. */
  time?: number;
};

export function metaPayload(e: ServerEvent) {
  const digits = e.user.phone?.replace(/\D/g, "");
  return {
    data: [{
      event_name: e.name,
      event_time: e.time ?? Math.floor(Date.now() / 1000),
      event_id: e.eventId,
      action_source: e.url ? "website" : "system_generated",
      event_source_url: e.url,
      user_data: {
        em: e.user.email ? [sha(e.user.email)] : undefined,
        ph: digits ? [sha(digits.length === 10 ? `1${digits}` : digits)] : undefined,
        fn: e.user.firstName ? [sha(e.user.firstName)] : undefined,
        ln: e.user.lastName ? [sha(e.user.lastName)] : undefined,
        zp: e.user.zip ? [sha(e.user.zip.slice(0, 5))] : undefined,
        ct: e.user.city ? [sha(e.user.city.replace(/\s+/g, ""))] : undefined,
        st: e.user.state ? [sha(e.user.state)] : undefined,
        country: [sha("us")],
        external_id: e.user.externalId ? [sha(e.user.externalId)] : undefined,
        client_ip_address: e.client?.ip,
        client_user_agent: e.client?.userAgent,
        fbc: e.client?.fbc,
        fbp: e.client?.fbp,
      },
      custom_data: { value: e.value, currency: e.value ? e.currency ?? "USD" : undefined, market: e.market ?? undefined, ...e.params },
    }],
    test_event_code: process.env.META_TEST_EVENT_CODE || undefined,
  };
}

export async function sendMeta(e: ServerEvent) {
  const pixel = env("META_PIXEL_ID", e.market), token = env("META_CAPI_TOKEN", e.market);
  if (!e.consent.ad_storage) return { sent: false, reason: "ad consent denied" };
  if (!pixel || !token) return { sent: false, reason: "not configured", payload: metaPayload(e) };
  const res = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(metaPayload(e)), cache: "no-store",
  });
  return { sent: res.ok, status: res.status, body: res.ok ? undefined : (await res.text()).slice(0, 300) };
}

export async function sendGa4(e: ServerEvent) {
  const mid = env("GA4_MEASUREMENT_ID", e.market), secret = env("GA4_API_SECRET", e.market);
  if (!e.consent.analytics_storage) return { sent: false, reason: "analytics consent denied" };
  if (!mid || !secret || !e.client?.gaClientId) return { sent: false, reason: !e.client?.gaClientId ? "no client_id" : "not configured" };
  const body = {
    client_id: e.client.gaClientId,
    timestamp_micros: (e.time ?? Math.floor(Date.now() / 1000)) * 1_000_000,
    events: [{ name: e.ga4Name, params: { event_id: e.eventId, value: e.value, currency: e.value ? "USD" : undefined, market: e.market ?? undefined, ...e.params } }],
  };
  const res = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${mid}&api_secret=${secret}`, { method: "POST", body: JSON.stringify(body), cache: "no-store" });
  return { sent: res.ok, status: res.status };
}

export function gaClientIdFromCookie(cookie?: string) {
  const m = cookie?.match(/(?:^|;\s*)_ga=GA\d\.\d\.(\d+\.\d+)/);
  return m?.[1];
}
