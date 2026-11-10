"use client";
/**
 * Browser tracking: consent, first-party attribution, dataLayer events, Meta Pixel.
 * All events go to window.dataLayer (GTM routes them to GA4 / Google Ads).
 * Meta Pixel events are sent directly with eventID so the server CAPI copy deduplicates.
 */

import { oaiqConsent, openAiRefs } from "@/lib/openai-ads/client";

type Consent = { analytics_storage: "granted" | "denied"; ad_storage: "granted" | "denied"; ad_user_data: "granted" | "denied"; ad_personalization: "granted" | "denied" };

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
  interface Navigator { globalPrivacyControl?: boolean }
}

const CONSENT_KEY = "sc_consent_v1";
const ATTR_KEY = "sc_attr_v1";
const ATTR_DAYS = 90;
const CLICK_IDS = ["gclid", "gbraid", "wbraid", "fbclid", "msclkid"] as const;
const UTMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

const safe = <T,>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };

export function getConsent(): Consent | null {
  return safe(() => { const v = localStorage.getItem(CONSENT_KEY); return v ? (JSON.parse(v) as Consent) : null; }, null);
}

export function defaultConsent(): Consent {
  const gpc = typeof navigator !== "undefined" && navigator.globalPrivacyControl === true;
  const def = (process.env.NEXT_PUBLIC_CONSENT_DEFAULT ?? "granted") === "granted" && !gpc ? "granted" : "denied";
  return { analytics_storage: "granted", ad_storage: def, ad_user_data: def, ad_personalization: def };
}

export function setConsent(c: Consent) {
  safe(() => localStorage.setItem(CONSENT_KEY, JSON.stringify(c)), undefined);
  window.gtag?.("consent", "update", c);
  window.fbq?.("consent", c.ad_storage === "granted" ? "grant" : "revoke");
  oaiqConsent(c.ad_storage === "granted" && navigator.globalPrivacyControl !== true);
  push({ event: "consent_update", ...c });
}

export function currentConsent(): Consent { return getConsent() ?? defaultConsent(); }

export function push(obj: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(obj);
}

function readCookie(name: string) {
  return safe(() => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.split("=").slice(1).join("="), undefined);
}

export type Attribution = Record<string, string | undefined>;

/** Capture UTMs/click ids on every landing; keep first-touch landing + last-touch source for 90 days. */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const url = new URL(window.location.href);
  const existing = safe(() => JSON.parse(localStorage.getItem(ATTR_KEY) ?? "null") as (Attribution & { exp?: number }) | null, null);
  const fresh = existing && existing.exp && Number(existing.exp) > Date.now() ? existing : null;
  const next: Attribution & { exp?: number } = { ...(fresh ?? {}) };

  const hasCampaign = UTMS.some((k) => url.searchParams.get(k)) || CLICK_IDS.some((k) => url.searchParams.get(k));
  if (hasCampaign) {
    for (const k of [...UTMS, ...CLICK_IDS]) { const v = url.searchParams.get(k); if (v) next[k] = v; }
    next.last_touch_source = url.searchParams.get("utm_source") ?? (url.searchParams.get("gclid") ? "google" : url.searchParams.get("fbclid") ? "meta" : undefined);
  }
  if (!next.landing_page) next.landing_page = url.pathname + url.search;
  if (!next.referrer && document.referrer && !document.referrer.includes(url.host)) next.referrer = document.referrer;
  if (!next.first_seen) next.first_seen = new Date().toISOString();

  const fbclid = url.searchParams.get("fbclid");
  if (fbclid) next.fbc = `fb.1.${Date.now()}.${fbclid}`;
  next.fbc = readCookie("_fbc") ?? next.fbc;
  next.fbp = readCookie("_fbp") ?? next.fbp;

  next.exp = (fresh?.exp as number | undefined) ?? Date.now() + ATTR_DAYS * 86_400_000;
  safe(() => localStorage.setItem(ATTR_KEY, JSON.stringify(next)), undefined);
  const { exp: _e, ...out } = next;
  return out;
}

export function getAttribution(): Attribution {
  const a = safe(() => JSON.parse(localStorage.getItem(ATTR_KEY) ?? "{}") as Attribution & { exp?: number }, {} as Attribution & { exp?: number });
  const { exp: _e, ...rest } = a;
  return { ...rest, fbc: readCookie("_fbc") ?? rest.fbc, fbp: readCookie("_fbp") ?? rest.fbp, ...openAiRefs() };
}

export function newEventId(prefix = "sc") {
  const r = safe(() => crypto.randomUUID(), `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return `${prefix}_${r}`;
}

export function getMarketPref(): string {
  return safe(() => localStorage.getItem("sc_market") ?? "boston", "boston");
}

/** Standard event helper. `meta` maps to a Meta standard event when ad consent allows. */
export function track(event: string, params: Record<string, unknown> = {}, meta?: { name: string; eventId?: string; custom?: Record<string, unknown> }) {
  const market = (params.market as string) ?? getMarketPref();
  push({ event, market, ...params });
  if (meta && currentConsent().ad_storage === "granted") {
    window.fbq?.("track", meta.name, { market, ...meta.custom }, meta.eventId ? { eventID: meta.eventId } : undefined);
  }
}

/** Enhanced conversions: expose user-provided data to GTM only at conversion time. */
export function pushUserData(u: { email?: string; phone?: string; firstName?: string; lastName?: string; zip?: string }) {
  if (currentConsent().ad_user_data !== "granted") return;
  const digits = u.phone?.replace(/\D/g, "");
  push({ event: "user_data_ready", user_data: { email: u.email, phone_number: digits ? `+1${digits.slice(-10)}` : undefined, address: { first_name: u.firstName, last_name: u.lastName, postal_code: u.zip, country: "US" } } });
}
