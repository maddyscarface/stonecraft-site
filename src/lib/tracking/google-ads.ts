/**
 * Google Ads offline conversion upload (revenue from GHL won/paid stages → Google Ads).
 * Inactive until ALL of these are set; otherwise conversions stay queued in `gads_offline`
 * and can be downloaded as a CSV from /api/admin/export:
 *   GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN,
 *   GOOGLE_ADS_CUSTOMER_ID (no dashes), GOOGLE_ADS_LOGIN_CUSTOMER_ID (optional, MCC),
 *   GOOGLE_ADS_CONVERSION_ACTIONS  JSON map {"job_won":"<conversionActionId>","qualified_lead":"…"}
 *   GOOGLE_ADS_API_VERSION         default v21 — VERIFY the current version before go-live.
 */
export type OfflineConversion = { gclid?: string; gbraid?: string; wbraid?: string; conversion: string; time: string; value?: number; currency?: string; orderId?: string };

const env = (k: string) => process.env[k] || "";
export const googleAdsConfigured = () => ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_CONVERSION_ACTIONS"].every((k) => env(k));

/** Google Ads wants "yyyy-mm-dd hh:mm:ss+00:00". */
export const adsDateTime = (iso: string) => new Date(iso).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "+00:00");

export function clickConversionPayload(c: OfflineConversion, customerId: string, actionId: string) {
  return {
    conversions: [{
      conversionAction: `customers/${customerId}/conversionActions/${actionId}`,
      ...(c.gclid ? { gclid: c.gclid } : c.gbraid ? { gbraid: c.gbraid } : c.wbraid ? { wbraid: c.wbraid } : {}),
      conversionDateTime: adsDateTime(c.time),
      ...(c.value ? { conversionValue: c.value, currencyCode: c.currency ?? "USD" } : {}),
      ...(c.orderId ? { orderId: c.orderId } : {}),
    }],
    partialFailure: true,
  };
}

export async function uploadOfflineConversion(c: OfflineConversion): Promise<{ sent: boolean; reason?: string; status?: number }> {
  if (!googleAdsConfigured()) return { sent: false, reason: "not configured (queued for CSV import)" };
  if (!c.gclid && !c.gbraid && !c.wbraid) return { sent: false, reason: "no click id" };
  let actions: Record<string, string> = {};
  try { actions = JSON.parse(env("GOOGLE_ADS_CONVERSION_ACTIONS")); } catch { return { sent: false, reason: "GOOGLE_ADS_CONVERSION_ACTIONS invalid JSON" }; }
  const actionId = actions[c.conversion];
  if (!actionId) return { sent: false, reason: `no conversion action for ${c.conversion}` };
  const tok = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ client_id: env("GOOGLE_ADS_CLIENT_ID"), client_secret: env("GOOGLE_ADS_CLIENT_SECRET"), refresh_token: env("GOOGLE_ADS_REFRESH_TOKEN"), grant_type: "refresh_token" }), cache: "no-store" });
  if (!tok.ok) return { sent: false, reason: "oauth failed", status: tok.status };
  const { access_token } = (await tok.json()) as { access_token: string };
  const cid = env("GOOGLE_ADS_CUSTOMER_ID").replace(/-/g, "");
  const v = env("GOOGLE_ADS_API_VERSION") || "v21";
  const res = await fetch(`https://googleads.googleapis.com/${v}/customers/${cid}:uploadClickConversions`, {
    method: "POST", cache: "no-store",
    headers: { Authorization: `Bearer ${access_token}`, "developer-token": env("GOOGLE_ADS_DEVELOPER_TOKEN"), "Content-Type": "application/json", ...(env("GOOGLE_ADS_LOGIN_CUSTOMER_ID") ? { "login-customer-id": env("GOOGLE_ADS_LOGIN_CUSTOMER_ID").replace(/-/g, "") } : {}) },
    body: JSON.stringify(clickConversionPayload(c, cid, actionId)),
  });
  return { sent: res.ok, status: res.status };
}
