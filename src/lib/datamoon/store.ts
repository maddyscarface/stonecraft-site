import "server-only";
import { kv } from "@/lib/server/kv";
import { BRAND_ID } from "@/lib/ops/brand";
import type { Recipe } from "./recipes";

/**
 * DataMoon persistence (KV namespace dm:*), physically separate from first-party leads (lead:*), paid review
 * cases (rr:*) and the private property marketplace (pp:*). Imported vendor prospects are NEVER property inventory.
 */
export type VendorContact = {
  id: string; brand: string; contactId: string; recipeId: string; importId: string; exportId: string;
  firstName?: string; lastName?: string; email?: string; state?: string; zip?: string; matchConfidence?: string;
  /** Market of the recipe that imported it (boston | south-florida). */
  market?: string;
  status: "imported" | "suppressed" | "synced" | "rejected" | "deleted"; synthetic: boolean;
  provenance: "DataMoon"; importedAt: string; expiresAt: string; crm?: { status: string; contactId?: string; at: string };
};
export type ImportLog = { id: string; brand: string; exportId: string; recipeId: string; at: string; by: string; dryRun: boolean; accepted: number; rejected: number; duplicates: number; suppressed: number; reasons: Record<string, number>; synthetic: boolean };
export type WebhookEvent = { id: string; receivedAt: string; type: string; exportId?: string; feedId?: string | null; rowCount?: number; status: "queued" | "rejected_feed" | "duplicate" | "test_ignored"; downloadExpiresAt?: string };

const K = {
  recipe: (id: string) => `dm:recipe:${id}`, recipes: "dm:recipes",
  contact: (id: string) => `dm:contact:${id}`, contacts: "dm:contacts", byCid: (cid: string) => `dm:cid:${cid}`, byEmail: (h: string) => `dm:email:${h}`,
  imports: "dm:imports", events: "dm:events", evt: (id: string) => `dm:evt:${id}`,
  month: (ym: string) => `dm:usage:${ym}`, topics: "dm:topics", dl: (exportId: string) => `dm:dl:${exportId}`,
};
const getJson = async <T>(k: string) => { const r = await kv.get(k); return r ? (JSON.parse(r) as T) : null; };

export async function saveRecipe(r: Recipe) { r.updatedAt = new Date().toISOString(); await kv.set(K.recipe(r.id), JSON.stringify(r)); }
export async function getRecipe(id: string) { const r = await getJson<Recipe>(K.recipe(id)); return r && r.brand === BRAND_ID ? r : null; }
export async function indexRecipe(id: string) { await kv.lpush(K.recipes, id); }
export async function listRecipes() { const ids = [...new Set(await kv.lrange(K.recipes, 0, 199))]; return (await Promise.all(ids.map(getRecipe))).filter((r): r is Recipe => !!r); }

export async function saveContact(c: VendorContact) { await kv.set(K.contact(c.id), JSON.stringify(c)); }
export async function getContact(id: string) { const c = await getJson<VendorContact>(K.contact(id)); return c && c.brand === BRAND_ID ? c : null; }
export async function indexContact(c: VendorContact, emailHash?: string) {
  await kv.lpush(K.contacts, c.id); await kv.set(K.byCid(c.contactId), c.id);
  if (emailHash) await kv.set(K.byEmail(emailHash), c.id);
}
export const contactByCid = (cid: string) => kv.get(K.byCid(cid));
export const contactByEmail = (h: string) => kv.get(K.byEmail(h));
export async function listVendorContacts(limit = 500) {
  const ids = [...new Set(await kv.lrange(K.contacts, 0, limit - 1))];
  const now = new Date().toISOString();
  return (await Promise.all(ids.map(getContact))).filter((c): c is VendorContact => !!c && c.status !== "deleted" && c.expiresAt > now);
}

export async function logImport(l: ImportLog) { await kv.lpush(K.imports, JSON.stringify(l)); }
export async function listImports() { return (await kv.lrange(K.imports, 0, 99)).map((s) => JSON.parse(s) as ImportLog); }

/** Webhook dedupe: true the first time an event id is seen (at-least-once delivery). */
export const claimEvent = (id: string) => kv.setNX(K.evt(id), "1", 60 * 60 * 24 * 30);
export async function logEvent(e: WebhookEvent) { await kv.lpush(K.events, JSON.stringify(e)); }
export async function listEvents() { return (await kv.lrange(K.events, 0, 99)).map((s) => JSON.parse(s) as WebhookEvent); }
/** Short-lived private download link (expires with the vendor link; never logged or shown in the UI). */
export async function stashDownload(exportId: string, url: string, expiresAt: string) {
  const ttl = Math.max(1, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  await kv.set(K.dl(exportId), JSON.stringify({ url, expiresAt }), Math.min(ttl, 3600));
}
export const getDownload = (exportId: string) => getJson<{ url: string; expiresAt: string }>(K.dl(exportId));

export const yearMonth = (d = new Date()) => d.toISOString().slice(0, 7);
export async function monthUsage(ym = yearMonth()) { return Number((await kv.get(K.month(ym))) || 0); }
export async function addUsage(n: number, ym = yearMonth()) { const cur = await monthUsage(ym); await kv.set(K.month(ym), String(cur + n)); }

export type SavedTopic = { kind: "b2b" | "b2c"; id: string | number; name: string; confirmedAt: string; by: string; synthetic: boolean };
export async function saveTopic(t: SavedTopic) { const all = await listSavedTopics(); const next = [t, ...all.filter((x) => !(x.kind === t.kind && String(x.id) === String(t.id)))].slice(0, 200); await kv.set(K.topics, JSON.stringify(next)); }
export async function listSavedTopics() { return (await getJson<SavedTopic[]>(K.topics)) ?? []; }
