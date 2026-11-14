import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { kv } from "@/lib/server/kv";
import type { Walkthrough } from "./model";

/**
 * KV persistence for walkthroughs (namespace wt:*). Invite tokens are 256-bit random values; ONLY their SHA-256
 * hash is stored (wt:inv:<hash>). Tokens expire, can be revoked and are never consumed by reads: the token travels
 * in the URL fragment (#t=…, never sent to the server or in Referer) and then in an X-Walkthrough-Token header.
 */
const K = { wt: (id: string) => `wt:${id}`, idx: "wt:index", inv: (h: string) => `wt:inv:${h}`, lead: (id: string) => `wt:lead:${id}` };
export const tokenHash = (t: string) => createHash("sha256").update(`wt:${t}`).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

/**
 * Per-walkthrough mutex. Every mutation is read-modify-write on one KV document, and the client uploads several
 * photos in parallel, so without this two media-sign calls can each save a copy that drops the other's record.
 * SET NX with a short TTL (a crashed holder frees itself); callers re-read the document inside the lock.
 */
export async function withWalkthroughLock<T>(id: string, fn: () => Promise<T>, waitMs = 8000): Promise<T | "busy"> {
  const key = `wt:lock:${id}`; const owner = randomBytes(8).toString("hex"); const until = Date.now() + waitMs;
  while (!(await kv.setNX(key, owner, 15))) { if (Date.now() > until) return "busy"; await new Promise((r) => setTimeout(r, 40 + Math.random() * 60)); }
  try { return await fn(); } finally { if ((await kv.get(key)) === owner) await kv.del(key); }
}
export async function saveWalkthrough(w: Walkthrough) { w.updatedAt = new Date().toISOString(); await kv.set(K.wt(w.id), JSON.stringify(w)); }
export async function getWalkthrough(id: string): Promise<Walkthrough | null> {
  const r = await kv.get(K.wt(id)); if (!r) return null;
  const w = JSON.parse(r) as Walkthrough;
  return w.brand === "stonecraft" ? w : null;
}
export async function indexWalkthrough(id: string) { await kv.lpush(K.idx, id); }
export async function listWalkthroughs(limit = 300) {
  const ids = [...new Set(await kv.lrange(K.idx, 0, limit - 1))];
  return (await Promise.all(ids.map(getWalkthrough))).filter((w): w is Walkthrough => !!w);
}

export async function bindInvite(token: string, walkthroughId: string, expiresAt: string) {
  const ttl = Math.max(60, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000) + 86400);
  await kv.set(K.inv(tokenHash(token)), JSON.stringify({ walkthroughId, expiresAt }), ttl);
}
export async function revokeInviteHash(hash: string) { await kv.del(K.inv(hash)); }

/** Resolve a raw token → walkthrough. Constant-time compare against the stored hash; expired/revoked → null. Never mutates. */
export async function resolveToken(token: string | null | undefined): Promise<Walkthrough | null> {
  if (!token || !/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  const h = tokenHash(token);
  const raw = await kv.get(K.inv(h)); if (!raw) return null;
  const { walkthroughId } = JSON.parse(raw) as { walkthroughId: string };
  const w = await getWalkthrough(walkthroughId); if (!w) return null;
  const a = Buffer.from(w.invite.hash), b = Buffer.from(h);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (w.invite.revoked || Date.parse(w.invite.expiresAt) < Date.now() || w.status === "closed") return null;
  return w;
}

export async function leadWalkthrough(leadId: string) { return kv.get(K.lead(leadId)); }
export async function claimLead(leadId: string, walkthroughId: string) { return kv.setNX(K.lead(leadId), walkthroughId, 60 * 60 * 24 * 365); }
