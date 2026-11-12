import { listPush } from "@/lib/store";

/**
 * Admin audit log (Build 04 §5). Records who-did-what at the action level only: never lead names,
 * emails, phones, addresses or photo keys. Durable when Upstash is configured.
 */
export async function audit(action: string, detail: Record<string, string | number | boolean | null | undefined> = {}) {
  const safe = Object.fromEntries(Object.entries(detail).filter(([k]) => !/email|phone|name|address|photo|token|key/i.test(k)));
  try { await listPush("audit", { at: new Date().toISOString(), action, ...safe }, 5000); } catch { /* auditing must never break the admin action */ }
}
