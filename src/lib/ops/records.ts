import "server-only";
import { kv } from "@/lib/server/kv";
import { listRange } from "@/lib/store";
import { listVendorContacts } from "@/lib/datamoon/store";
import { listWalkthroughs } from "@/lib/walkthrough/store";
import { listProposals } from "@/lib/estimator/store";
import { BRAND_ID } from "./brand";
import { listProjects } from "./store";
import type { RecordType } from "./model";

/**
 * Unified, searchable record index: first-party leads (Phase 4 lead:data:* plus the Phase 2/3 "leads" log),
 * guided walkthroughs, private proposals (status only — never prices), ops projects and (separately labelled)
 * DataMoon vendor prospects. PII is masked unless the caller has records.read_pii.
 */
export type Market = "boston" | "south-florida" | "unknown";
export type RecordSummary = {
  type: RecordType; id: string; brand: string; reference: string; createdAt: string; status: string; secondary?: string;
  name: string; email: string; market: Market; county?: string | null; source: string; sandbox: boolean; crm?: string; firstParty: boolean;
};

export const maskEmail = (e?: string) => { if (!e || !e.includes("@")) return ""; const [u, d] = e.split("@"); return `${u!.slice(0, 1)}***@${d}`; };
export const maskName = (f?: string, l?: string) => [f, l].filter(Boolean).map((x) => `${x!.slice(0, 1)}.`).join(" ");
const mk = (m?: string | null): Market => (m === "boston" || m === "south-florida" ? m : "unknown");

type Raw = RecordSummary & { _name: string; _email: string };
type LeadData = { leadId: string; receivedAt: string; lead: Record<string, any>; routing: { market: string | null; county: string | null; pipeline: string; zone: string | null }; score: { tier: string; score: number }; ghl?: { mode?: string; error?: string } };
type LegacyLead = { id: string; at: string; variant: string; market: string | null; county?: string | null; tier: string; source?: string; pipeline?: string; ghl?: { mode?: string; error?: string } };

async function collect(): Promise<Raw[]> {
  const out: Raw[] = [];
  const seen = new Set<string>();
  for (const id of [...new Set(await kv.lrange("leads:index", 0, 999))]) {
    const raw = await kv.get(`lead:data:${id}`); if (!raw) continue;
    const r = JSON.parse(raw) as LeadData; const l = r.lead; seen.add(r.leadId);
    out.push({ type: "lead", id: r.leadId, brand: BRAND_ID, reference: `L-${r.leadId.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase()}`, createdAt: r.receivedAt, status: r.score?.tier || "new", secondary: `${l.variant} · ${r.routing.pipeline}`,
      name: "", email: "", _name: `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim(), _email: l.email ?? "", market: mk(r.routing.market), county: r.routing.county, source: l.attribution?.utm_source || "direct", sandbox: process.env.VERCEL_ENV !== "production", crm: r.ghl?.error ? "error" : r.ghl?.mode, firstParty: true });
  }
  // Phase 2/3 lead log (no PII stored there) — shown for continuity.
  for (const r of await listRange<LegacyLead>("leads", 0, 999)) {
    if (!r?.id || seen.has(r.id)) continue; seen.add(r.id);
    out.push({ type: "lead", id: r.id, brand: BRAND_ID, reference: `L-${r.id.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase()}`, createdAt: r.at, status: r.tier, secondary: `${r.variant} · ${r.pipeline ?? ""} (log only)`, name: "", email: "", _name: "", _email: "", market: mk(r.market), county: r.county, source: r.source || "direct", sandbox: process.env.VERCEL_ENV !== "production", crm: r.ghl?.error ? "error" : r.ghl?.mode, firstParty: true });
  }
  for (const w of await listWalkthroughs()) {
    out.push({ type: "walkthrough", id: w.id, brand: w.brand, reference: w.reference, createdAt: w.createdAt, status: w.status, secondary: `${w.workType}${w.escalations.length ? ` · ${w.escalations.length} escalation(s)` : ""}${w.outcome ? ` · ${w.outcome.value}` : w.suggestedOutcome ? ` · suggested ${w.suggestedOutcome}` : ""}`,
      name: "", email: "", _name: w.customer.firstName, _email: w.customer.email ?? "", market: w.market, county: w.county, source: w.invite.channel === "self_start" ? "walkthrough (self-start)" : "walkthrough (staff link)", sandbox: w.sandbox, firstParty: true });
  }
  for (const p of await listProposals()) {
    out.push({ type: "proposal", id: p.id, brand: p.brand, reference: p.reference, createdAt: p.createdAt, status: p.status, secondary: `rev ${p.revision}`, name: "", email: "", _name: p.customerName, _email: "", market: p.region, source: "estimator", sandbox: p.sandbox, firstParty: true });
  }
  for (const p of await listProjects()) {
    out.push({ type: "project", id: p.id, brand: p.brand, reference: p.reference, createdAt: p.createdAt, status: p.status, secondary: p.type, name: "", email: "", _name: p.title, _email: "", market: p.market, source: "staff", sandbox: p.sandbox, firstParty: true });
  }
  for (const v of await listVendorContacts()) {
    out.push({ type: "vendor_prospect", id: v.id, brand: v.brand, reference: v.contactId, createdAt: v.importedAt, status: v.status, secondary: `recipe ${v.recipeId.slice(0, 8)}`, name: "", email: "",
      _name: `${v.firstName ?? ""} ${v.lastName ?? ""}`.trim(), _email: v.email ?? "", market: mk(v.market), source: v.synthetic ? "DataMoon (synthetic fixture)" : "DataMoon", sandbox: v.synthetic, crm: v.crm?.status, firstParty: false });
  }
  return out.filter((r) => r.brand === BRAND_ID);
}

export type RecordQuery = { q?: string; type?: string; status?: string; source?: string; market?: string; county?: string; from?: string; to?: string; firstParty?: "1" | "0"; limit?: number };

export async function searchRecords(query: RecordQuery, opts: { pii: boolean }) {
  const all = await collect();
  const q = (query.q || "").trim().toLowerCase();
  const rows = all.filter((r) => {
    if (query.type && r.type !== query.type) return false;
    if (query.status && r.status !== query.status) return false;
    if (query.market && r.market !== query.market) return false;
    if (query.county && r.county !== query.county) return false;
    if (query.source && !r.source.toLowerCase().includes(query.source.toLowerCase())) return false;
    if (query.firstParty === "1" && !r.firstParty) return false;
    if (query.firstParty === "0" && r.firstParty) return false;
    if (query.from && r.createdAt < query.from) return false;
    if (query.to && r.createdAt.slice(0, 10) > query.to) return false;
    if (q) {
      const hay = [r.reference, r.id, r.status, r.secondary, r.type, r.county, ...(opts.pii ? [r._name, r._email] : [])].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const total = rows.length;
  const page = rows.slice(0, Math.min(query.limit ?? 200, 1000)).map(({ _name, _email, ...r }) => ({
    ...r,
    name: opts.pii ? _name : r.type === "project" ? _name : maskName(...(_name.split(" ") as [string, string])),
    email: opts.pii ? _email : maskEmail(_email),
  }));
  return { total, rows: page };
}

const CSV_SAFE = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // spreadsheet formula injection guard
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
/** CSV of permitted fields only. Name/email columns are included only with records.read_pii. Never prices. */
export function toCsv(rows: RecordSummary[], pii: boolean) {
  const cols: (keyof RecordSummary)[] = ["type", "reference", "createdAt", "status", "secondary", "market", "county", "source", "firstParty", "sandbox", "crm", ...(pii ? (["name", "email"] as const) : [])];
  return [cols.join(","), ...rows.map((r) => cols.map((c) => CSV_SAFE(r[c])).join(","))].join("\n");
}
