import { MARKET_GEO, type DmMarket } from "./recipes";
import "server-only";
import { randomUUID } from "node:crypto";
import { BRAND_ID } from "@/lib/ops/brand";
import { emailHash, isSuppressed } from "@/lib/ops/store";
import { dmConfig } from "./config";
import { CONTACT_ID_RE } from "./intent-client";
import { US_STATES } from "./recipes";
import { contactByCid, contactByEmail, indexContact, logImport, saveContact, type VendorContact } from "./store";
import type { ImportSummary } from "./types";

/**
 * Dry-run-first importer for DataMoon export rows (CSV text or row objects). Normalises only the minimum fields,
 * rejects invalid / non-US rows, drops suppressed people, dedupes by contact_id and normalised email, and stores
 * vendor prospects with provenance "DataMoon" and a retention expiry. Never writes leads, cases or property records.
 */
export function parseCsv(text: string, maxRows = 50_000): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true; else if (ch === ",") { row.push(cell); cell = ""; } else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; if (rows.length > maxRows) break; } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!head) return [];
  const cols = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(cols.map((c, i) => [c, (r[i] ?? "").trim()])));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export type Normalised = { contactId: string; firstName?: string; lastName?: string; email?: string; state?: string; zip?: string; matchConfidence?: string };
export function normaliseRow(r: Record<string, unknown>): { ok: true; v: Normalised } | { ok: false; reason: string } {
  const s = (k: string) => (typeof r[k] === "string" ? (r[k] as string).trim() : r[k] === undefined || r[k] === null ? "" : String(r[k]));
  const contactId = s("contact_id").toLowerCase();
  if (!CONTACT_ID_RE.test(contactId)) return { ok: false, reason: "invalid_contact_id" };
  const country = (s("contact_country") || s("country")).toUpperCase();
  if (country && !["US", "USA", "UNITED STATES"].includes(country)) return { ok: false, reason: "non_us_record" };
  const state = (s("personal_state") || s("state")).toLowerCase();
  if (state && !(US_STATES as readonly string[]).includes(state)) return { ok: false, reason: "non_us_record" };
  const email = (s("personal_emails").split(/[,;|]/)[0] || s("email") || s("business_email")).toLowerCase();
  if (email && !EMAIL.test(email)) return { ok: false, reason: "invalid_email" };
  return { ok: true, v: { contactId, firstName: s("first_name").slice(0, 60) || undefined, lastName: s("last_name").slice(0, 60) || undefined, email: email || undefined, state: state || undefined, zip: /^\d{5}/.test(s("personal_zip") || s("zip")) ? (s("personal_zip") || s("zip")).slice(0, 5) : undefined, matchConfidence: s("match_confidence") || undefined } };
}

export async function importRows(rows: Record<string, unknown>[], o: { exportId: string; recipeId: string; by: string; dryRun: boolean; synthetic: boolean; market?: string }): Promise<ImportSummary & { importId: string }> {
  const importId = randomUUID();
  const reasons: Record<string, number> = {};
  const bump = (k: string) => { reasons[k] = (reasons[k] ?? 0) + 1; };
  let accepted = 0, rejected = 0, duplicates = 0, suppressed = 0;
  const seen = new Set<string>();
  const expiresAt = new Date(Date.now() + dmConfig().retentionDays * 86400_000).toISOString();
  for (const raw of rows) {
    const n = normaliseRow(raw);
    if (!n.ok) { rejected++; bump(n.reason); continue; }
    const v = n.v; const eh = v.email ? emailHash(v.email) : undefined;
    // Market lock: a Boston recipe only accepts MA rows (FL recipe → FL rows); a known ZIP must be in the market's ZIP3s.
    if (o.market && o.market in MARKET_GEO) {
      const g = MARKET_GEO[o.market as DmMarket];
      if ((v.state && !g.states.includes(v.state)) || (v.zip && !g.zip3.includes(v.zip.slice(0, 3)))) { rejected++; bump("out_of_market"); continue; }
    }
    if (seen.has(v.contactId) || (eh && seen.has(eh)) || (await contactByCid(v.contactId)) || (eh && (await contactByEmail(eh)))) { duplicates++; bump("duplicate"); continue; }
    seen.add(v.contactId); if (eh) seen.add(eh);
    if (await isSuppressed({ email: v.email, contactId: v.contactId })) { suppressed++; bump("suppressed"); continue; }
    accepted++;
    if (!o.dryRun) {
      const c: VendorContact = { id: randomUUID(), brand: BRAND_ID, ...v, recipeId: o.recipeId, market: o.market, importId, exportId: o.exportId, status: "imported", synthetic: o.synthetic, provenance: "DataMoon", importedAt: new Date().toISOString(), expiresAt };
      await saveContact(c); await indexContact(c, eh);
    }
  }
  await logImport({ id: importId, brand: BRAND_ID, exportId: o.exportId, recipeId: o.recipeId, at: new Date().toISOString(), by: o.by, dryRun: o.dryRun, accepted, rejected, duplicates, suppressed, reasons, synthetic: o.synthetic });
  return { importId, exportId: o.exportId, accepted, rejected, duplicates, suppressed, reasons, dryRun: o.dryRun };
}
