/**
 * Revenue attribution. At lead time we snapshot first- and last-touch attribution against the
 * contact's deterministic external id; when GHL reports a won/paid stage with a value, the CRM
 * webhook joins the two and records revenue by source/medium/campaign. Pure helpers here are
 * unit-tested; storage lives in lib/store (Upstash in production).
 */
export type Touch = { source: string; medium?: string; campaign?: string; at?: string };
export type AttributionSnapshot = { first: Touch; last: Touch; landingPage?: string; clickIds: Record<string, string>; leadEventId: string; leadAt: string; market?: string | null };
export type RevenueRecord = { eventId: string; stage: string; value: number; currency: "USD"; market?: string | null; at: string; attribution: AttributionSnapshot | null };

type Attr = Record<string, string | undefined>;

export function attributionSnapshot(a: Attr, leadEventId: string, market?: string | null, now = new Date()): AttributionSnapshot {
  const lastSource = a.utm_source ?? a.last_touch_source ?? (a.gclid || a.gbraid || a.wbraid ? "google" : a.fbclid ? "meta" : a.msclkid ? "microsoft" : a.openai_oppref ? "chatgpt" : a.first_touch_source ?? "direct");
  const last: Touch = { source: lastSource, medium: a.utm_medium ?? a.last_touch_medium, campaign: a.utm_campaign ?? a.last_touch_campaign, at: a.last_touch_at };
  const first: Touch = a.first_touch_source ? { source: a.first_touch_source, medium: a.first_touch_medium, campaign: a.first_touch_campaign, at: a.first_touch_at ?? a.first_seen } : { ...last, at: a.first_seen ?? last.at };
  const clickIds = Object.fromEntries(["gclid", "gbraid", "wbraid", "fbclid", "msclkid", "openai_oppref"].filter((k) => a[k]).map((k) => [k, a[k]!]));
  return { first, last, landingPage: a.landing_page, clickIds, leadEventId, leadAt: now.toISOString(), market };
}

/** Sum revenue by first- or last-touch source/medium (and campaign). */
export function summarizeRevenue(records: RevenueRecord[], model: "first" | "last" = "last") {
  const rows = new Map<string, { source: string; medium: string; campaign: string; revenue: number; deals: number }>();
  for (const r of records) {
    const t = r.attribution?.[model] ?? { source: "unattributed" };
    const key = `${t.source}|${t.medium ?? ""}|${t.campaign ?? ""}`;
    const row = rows.get(key) ?? { source: t.source, medium: t.medium ?? "", campaign: t.campaign ?? "", revenue: 0, deals: 0 };
    row.revenue += r.value; row.deals += 1; rows.set(key, row);
  }
  const list = [...rows.values()].sort((a, b) => b.revenue - a.revenue);
  return { model, total: list.reduce((s, r) => s + r.revenue, 0), deals: list.reduce((s, r) => s + r.deals, 0), rows: list };
}
