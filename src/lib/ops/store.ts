import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { kv } from "@/lib/server/kv";
import { BRAND_ID } from "./brand";
import type { OpsDocument, Project } from "./model";

/** KV persistence for ops objects. Every getter enforces the deployment brand (cross-brand → null). */
const K = {
  project: (id: string) => `ops:project:${id}`, projects: "ops:projects",
  doc: (id: string) => `ops:doc:${id}`, docsFor: (pid: string) => `ops:docs:${pid}`,
  supp: (h: string) => `ops:supp:${h}`, supps: "ops:supps",
  consent: "ops:consent",
};
const getJson = async <T>(k: string) => { const r = await kv.get(k); return r ? (JSON.parse(r) as T) : null; };
const brandOk = <T extends { brand: string }>(x: T | null) => (x && x.brand === BRAND_ID ? x : null);

export async function saveProject(p: Project) { p.updatedAt = new Date().toISOString(); await kv.set(K.project(p.id), JSON.stringify(p)); }
export async function getProject(id: string) { return brandOk(await getJson<Project>(K.project(id))); }
export async function indexProject(id: string) { await kv.lpush(K.projects, id); }
export async function listProjects(limit = 300) {
  const ids = [...new Set(await kv.lrange(K.projects, 0, limit - 1))];
  return (await Promise.all(ids.map(getProject))).filter((p): p is Project => !!p);
}
export const newReference = () => `P-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;

export async function saveDoc(d: OpsDocument) { await kv.set(K.doc(d.id), JSON.stringify(d)); }
export async function getDoc(id: string) { return brandOk(await getJson<OpsDocument>(K.doc(id))); }
export async function indexDoc(projectId: string, id: string) { await kv.lpush(K.docsFor(projectId), id); }
export async function docsFor(projectId: string) {
  const ids = [...new Set(await kv.lrange(K.docsFor(projectId), 0, 199))];
  return (await Promise.all(ids.map(getDoc))).filter((d): d is OpsDocument => !!d && d.projectId === projectId);
}

/* ── Suppressions / opt-out ledger ─────────────────────────────────────────── */
export const emailHash = (e: string) => createHash("sha256").update(e.trim().toLowerCase()).digest("hex");
export type Suppression = { key: string; kind: "email" | "contact_id"; reason: string; note?: string; at: string; by: string; brand: string; emailMasked?: string };
const mask = (e: string) => { const [u, d] = e.split("@"); return `${u.slice(0, 1)}***@${d}`; };

export async function addSuppression(s: { email?: string; contactId?: string; reason: string; note?: string; by: string }) {
  const out: Suppression[] = [];
  if (s.email) out.push({ key: emailHash(s.email), kind: "email", reason: s.reason, note: s.note, at: new Date().toISOString(), by: s.by, brand: BRAND_ID, emailMasked: mask(s.email) });
  if (s.contactId) out.push({ key: s.contactId, kind: "contact_id", reason: s.reason, note: s.note, at: new Date().toISOString(), by: s.by, brand: BRAND_ID });
  for (const x of out) { await kv.set(K.supp(x.key), JSON.stringify(x)); await kv.lpush(K.supps, x.key); }
  return out;
}
export async function removeSuppression(key: string) { await kv.del(K.supp(key)); }
export async function isSuppressed(q: { email?: string; contactId?: string }) {
  if (q.email && (await kv.get(K.supp(emailHash(q.email))))) return true;
  if (q.contactId && (await kv.get(K.supp(q.contactId)))) return true;
  return false;
}
export async function listSuppressions() {
  const keys = [...new Set(await kv.lrange(K.supps, 0, 999))];
  return (await Promise.all(keys.map((k) => getJson<Suppression>(K.supp(k))))).filter((s): s is Suppression => !!s && s.brand === BRAND_ID);
}

/** Consent evidence ledger: what was consented, when, from which surface (ids only). */
export async function recordConsent(e: { subjectType: string; subjectId: string; consents: Record<string, boolean>; source: string }) {
  await kv.lpush(K.consent, JSON.stringify({ ...e, brand: BRAND_ID, at: new Date().toISOString() }));
}
export async function listConsent(limit = 200) { return (await kv.lrange(K.consent, 0, limit - 1)).map((s) => JSON.parse(s) as Record<string, unknown>); }
