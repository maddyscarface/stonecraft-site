import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { kv } from "@/lib/server/kv";
import { BRAND_ID } from "./brand";

/**
 * Append-only, hash-chained ops audit log. Each entry stores sha256(prevHash + canonical entry) so tampering
 * with or deleting an older entry breaks verification. Entries contain ids, actions and coarse metadata only —
 * never document bytes, raw vendor rows, full contact details or secrets.
 */
export type OpsAudit = {
  id: string; at: string; brand: string; actor: string; role: string; action: string;
  target?: { type: string; id: string }; detail?: Record<string, unknown>; prev: string; hash: string;
};
const K = { list: "ops:audit", head: "ops:audit:head" };

const digest = (prev: string, e: Omit<OpsAudit, "hash">) => createHash("sha256").update(prev + JSON.stringify({ ...e, hash: undefined })).digest("hex");

const SENSITIVE = /(token|secret|password|key|email|phone|gps|address|api_key|signature)/i;
function scrub(d?: Record<string, unknown>) {
  if (!d) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) out[k] = SENSITIVE.test(k) ? "[redacted]" : typeof v === "string" ? v.slice(0, 300) : v;
  return out;
}

export async function opsAudit(actor: { id: string; role: string }, action: string, target?: { type: string; id: string }, detail?: Record<string, unknown>) {
  const prev = (await kv.get(K.head)) || "genesis";
  const base: Omit<OpsAudit, "hash"> = { id: randomUUID(), at: new Date().toISOString(), brand: BRAND_ID, actor: actor.id, role: actor.role, action, target, detail: scrub(detail), prev };
  const e: OpsAudit = { ...base, hash: digest(prev, base) };
  await kv.lpush(K.list, JSON.stringify(e));
  await kv.set(K.head, e.hash);
  return e;
}

export async function listOpsAudit(limit = 200): Promise<OpsAudit[]> {
  return (await kv.lrange(K.list, 0, limit - 1)).map((s) => JSON.parse(s) as OpsAudit);
}

/** Verifies the chain over the newest `limit` entries (newest-first list). */
export function verifyChain(entries: OpsAudit[]): { ok: boolean; brokenAt?: string } {
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const { hash, ...rest } = e;
    if (digest(e.prev, rest) !== hash) return { ok: false, brokenAt: e.id };
    const older = entries[i + 1];
    if (older && older.hash !== e.prev) return { ok: false, brokenAt: e.id };
  }
  return { ok: true };
}
