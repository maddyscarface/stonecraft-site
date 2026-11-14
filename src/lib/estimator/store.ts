import "server-only";
import { kv } from "@/lib/server/kv";
import { blankRateBook, type RateBook, type Region } from "./rates";
import type { Proposal } from "./proposal";

/** KV persistence for the private estimator (namespace est:*). Never read by any public route. */
const K = { rates: (r: Region) => `est:rates:${r}`, prop: (id: string) => `est:proposal:${id}`, idx: "est:proposals" };
export async function getRateBook(region: Region): Promise<RateBook> {
  const raw = await kv.get(K.rates(region));
  if (!raw) return blankRateBook(region);
  const saved = JSON.parse(raw) as RateBook;
  // merge so newly added services/surfaces appear blank
  const blank = blankRateBook(region);
  return { ...saved, entries: blank.entries.map((e) => saved.entries.find((s) => s.service === e.service && s.surface === e.surface) ?? e) };
}
export async function saveRateBook(b: RateBook) { await kv.set(K.rates(b.region), JSON.stringify(b)); }
export async function saveProposal(p: Proposal) { p.updatedAt = new Date().toISOString(); await kv.set(K.prop(p.id), JSON.stringify(p)); }
export async function getProposal(id: string) { const r = await kv.get(K.prop(id)); if (!r) return null; const p = JSON.parse(r) as Proposal; return p.brand === "stonecraft" ? p : null; }
export async function indexProposal(id: string) { await kv.lpush(K.idx, id); }
export async function listProposals() { const ids = [...new Set(await kv.lrange(K.idx, 0, 299))]; return (await Promise.all(ids.map(getProposal))).filter((p): p is Proposal => !!p); }
