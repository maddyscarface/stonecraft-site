/**
 * Intent-data integration (DataMoon or AudienceLab). DISABLED BY DEFAULT.
 *
 * Activation (all required):
 *   INTENT_PROVIDER=datamoon | audiencelab        server adapter used by /api/intent/webhook
 *   INTENT_WEBHOOK_SECRET=<long random string>     shared secret the provider sends in x-intent-secret
 *   NEXT_PUBLIC_INTENT_PIXEL_SRC=<provider script> optional site pixel; only loads with ad consent and no GPC
 *   NEXT_PUBLIC_INTENT_ENABLED=true                 explicit kill switch for the pixel
 *
 * Compliance rules baked in: signals are tagged into GHL only (never auto-SMS — every intent
 * contact gets `intent:no-auto-sms`), pixel is consent-gated, and the whole thing turns off by
 * clearing INTENT_PROVIDER. Field names in the adapters are VERIFY items: confirm against the
 * provider's webhook/export docs once the account exists.
 */
export type IntentSignal = {
  provider: "datamoon" | "audiencelab";
  kind: "person" | "company";
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  domain?: string;
  zip?: string;
  state?: string;
  topics: string[];
  score?: number;
  pageUrl?: string;
  seenAt?: string;
};

export interface IntentProvider {
  id: IntentSignal["provider"];
  /** Normalise a provider webhook body into zero or more signals. Must never throw. */
  parse(body: unknown): IntentSignal[];
}
