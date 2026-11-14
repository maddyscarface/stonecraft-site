import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * DataMoon intent export-ready webhook verification (https://intentdocs.datamoon.com/webhooks):
 *   headers Webhook-Id, Webhook-Timestamp (unix seconds), Webhook-Signature: v1=<hex>
 *   expected = "v1=" + HMAC_SHA256(secret_utf8, timestamp + "." + raw_body); constant-time compare; |now - ts| ≤ 300 s.
 * Verify BEFORE parsing. Unsigned `test: true` deliveries are connectivity checks only and are never ingested.
 */
export const TOLERANCE_SEC = 300;
export type VerifyResult = { ok: true } | { ok: false; reason: "missing_headers" | "bad_timestamp" | "stale_timestamp" | "bad_signature" | "no_secret" };

export function signDataMoon(secret: string, timestamp: string, raw: string) {
  return "v1=" + createHmac("sha256", Buffer.from(secret, "utf8")).update(`${timestamp}.${raw}`).digest("hex");
}

export function verifyDataMoonSignature(raw: string, h: { timestamp?: string | null; signature?: string | null }, secret: string | undefined, nowSec = Math.floor(Date.now() / 1000)): VerifyResult {
  if (!secret) return { ok: false, reason: "no_secret" };
  if (!h.timestamp || !h.signature) return { ok: false, reason: "missing_headers" };
  if (!/^\d{9,11}$/.test(h.timestamp)) return { ok: false, reason: "bad_timestamp" };
  if (Math.abs(nowSec - Number(h.timestamp)) > TOLERANCE_SEC) return { ok: false, reason: "stale_timestamp" };
  const expected = Buffer.from(signDataMoon(secret, h.timestamp, raw));
  // A header may carry several space-separated signatures (rotation); accept any v1 match.
  for (const candidate of h.signature.split(/\s+/)) {
    const got = Buffer.from(candidate);
    if (got.length === expected.length && timingSafeEqual(got, expected)) return { ok: true };
  }
  return { ok: false, reason: "bad_signature" };
}

export type ExportReadyEvent = { id: string; type: "export.ready"; test: boolean; created_at: string; data: { export_id: string; feed_id: string | null; row_count: number; download_url: string | null; download_expires_at: string | null } };
export function parseEvent(raw: string): ExportReadyEvent | null {
  try {
    const e = JSON.parse(raw) as ExportReadyEvent;
    if (typeof e?.id !== "string" || e.type !== "export.ready" || typeof e.data?.export_id !== "string") return null;
    return e;
  } catch { return null; }
}

/** Cross-brand guard: an event's feed must be mapped to this brand (feed_id null → only if export id is known locally). */
export function feedAllowed(feedId: string | null, brand: string, map: Record<string, string>) {
  return !!feedId && map[feedId] === brand;
}
