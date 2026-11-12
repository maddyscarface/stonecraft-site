import type { IntentProvider, IntentSignal } from "./types";

type Rec = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() && !Number.isNaN(Number(v)) ? Number(v) : undefined);
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean) : []);
const rows = (body: unknown): Rec[] => {
  if (Array.isArray(body)) return body as Rec[];
  const b = body as Rec | null;
  if (!b || typeof b !== "object") return [];
  for (const k of ["data", "records", "visitors", "contacts", "results"]) if (Array.isArray(b[k])) return b[k] as Rec[];
  return [b];
};

/** DataMoon — VERIFY field names against the account's webhook/export schema. */
export const datamoon: IntentProvider = {
  id: "datamoon",
  parse(body) {
    return rows(body).map((r): IntentSignal => ({
      provider: "datamoon",
      kind: str(r.email) || str(r.personal_email) || str(r.business_email) ? "person" : "company",
      email: str(r.business_email) ?? str(r.email) ?? str(r.personal_email),
      phone: str(r.phone) ?? str(r.mobile_phone),
      firstName: str(r.first_name), lastName: str(r.last_name),
      company: str(r.company_name) ?? str(r.company), domain: str(r.company_domain) ?? str(r.domain),
      zip: str(r.zip) ?? str(r.postal_code), state: str(r.state),
      topics: arr(r.topics ?? r.intent_topics ?? r.keywords), score: num(r.intent_score ?? r.score),
      pageUrl: str(r.page_url) ?? str(r.url), seenAt: str(r.timestamp) ?? str(r.seen_at),
    })).filter((s) => s.email || s.domain || s.company);
  },
};

/** AudienceLab — VERIFY field names against the account's webhook/export schema. */
export const audiencelab: IntentProvider = {
  id: "audiencelab",
  parse(body) {
    return rows(body).map((r): IntentSignal => {
      const person = (r.person ?? r.contact ?? r) as Rec;
      const company = (r.company ?? r) as Rec;
      return {
        provider: "audiencelab",
        kind: str(person.email) || str(person.BUSINESS_EMAIL) ? "person" : "company",
        email: str(person.email) ?? str(person.BUSINESS_EMAIL) ?? str(person.PERSONAL_EMAIL),
        phone: str(person.phone) ?? str(person.MOBILE_PHONE),
        firstName: str(person.first_name) ?? str(person.FIRST_NAME), lastName: str(person.last_name) ?? str(person.LAST_NAME),
        company: str(company.name) ?? str(company.COMPANY_NAME), domain: str(company.domain) ?? str(company.COMPANY_DOMAIN),
        zip: str(person.zip) ?? str(person.PERSONAL_ZIP), state: str(person.state) ?? str(person.PERSONAL_STATE),
        topics: arr(r.segments ?? r.audiences ?? r.topics), score: num(r.score),
        pageUrl: str(r.page_url) ?? str(r.URL), seenAt: str(r.event_timestamp) ?? str(r.timestamp),
      };
    }).filter((s) => s.email || s.domain || s.company);
  },
};

export const intentProviders = { datamoon, audiencelab } as const;

/** Returns the active provider, or null (default) when intent data is switched off. */
export function activeIntentProvider(env: Record<string, string | undefined> = process.env): IntentProvider | null {
  const id = (env.INTENT_PROVIDER ?? "").toLowerCase();
  if (!id || !env.INTENT_WEBHOOK_SECRET) return null;
  return (intentProviders as Record<string, IntentProvider>)[id] ?? null;
}

/** GHL tags for a signal. Intent contacts are never auto-texted. */
export function intentTags(s: IntentSignal) {
  return Array.from(new Set(["brand:stonecraft", `intent:${s.provider}`, "intent:no-auto-sms", ...s.topics.slice(0, 10).map((t) => `intent-topic:${t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`), ...(s.score !== undefined ? [`intent-score:${s.score >= 70 ? "high" : s.score >= 40 ? "mid" : "low"}`] : [])]));
}
