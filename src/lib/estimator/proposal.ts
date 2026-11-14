import { z } from "zod";
import type { Region, RateBook, Surface } from "./rates";
import { rateFor } from "./rates";

/**
 * Private proposals (Phase 4). Manual pricing only:
 *  - each line's unit price is typed by staff, or copied from the OWNER's rate book on request — never guessed;
 *  - totals exist only when every line has a quantity and a price (otherwise `total: null`, no partial guesses);
 *  - every edit needs `expectedRevision` (stale-revision protection → 409);
 *  - owner approval binds to a revision; any later edit drops the approval;
 *  - DOCX/PDF export only for the approved revision; "marked sent externally" only after an export of that
 *    revision. Nothing is ever sent by the system.
 */
export const proposalStatuses = ["draft", "pending_approval", "approved", "exported", "sent_externally", "void"] as const;
export type ProposalStatus = (typeof proposalStatuses)[number];
export type ProposalLine = { id: string; description: string; service?: string; surface?: Surface; quantity: number | null; unit: string; unitPrice: number | null; priceSource: "manual" | "rate_book" | "unset"; measurementRef?: string };
export type Stamp = { by: string; at: string };
export type Proposal = {
  id: string; brand: "stonecraft"; reference: string; region: Region; walkthroughId?: string; leadId?: string; projectId?: string;
  customerName: string; siteLabel: string; status: ProposalStatus; revision: number;
  lines: ProposalLine[]; scopeNotes: string; exclusions: string; validDays: number;
  submittedForApproval?: Stamp & { revision: number }; approval?: Stamp & { revision: number };
  exports: (Stamp & { revision: number; format: "docx" | "pdf"; storageKey: string; size: number })[];
  sentExternally?: Stamp & { revision: number; channel: string; note?: string };
  history: (Stamp & { revision: number; action: string })[];
  createdAt: string; updatedAt: string; sandbox: boolean;
};

const lineSchema = z.object({
  id: z.string().max(40).optional(), description: z.string().trim().min(1).max(300), service: z.string().max(40).optional(), surface: z.string().max(40).optional(),
  quantity: z.number().min(0).max(1_000_000).nullable(), unit: z.string().max(20), unitPrice: z.number().min(0).max(10_000_000).nullable(),
  priceSource: z.enum(["manual", "rate_book", "unset"]).optional(), measurementRef: z.string().max(80).optional(),
});
export const proposalCreateSchema = z.object({
  region: z.enum(["boston", "south-florida"]), walkthroughId: z.string().uuid().optional(), leadId: z.string().max(100).optional(), projectId: z.string().uuid().optional(),
  customerName: z.string().trim().min(1).max(120), siteLabel: z.string().trim().max(200).default(""),
});
export const proposalEditSchema = z.object({
  expectedRevision: z.number().int().min(1),
  lines: z.array(lineSchema).max(60).optional(), scopeNotes: z.string().max(4000).optional(), exclusions: z.string().max(2000).optional(), validDays: z.number().int().min(1).max(180).optional(),
  customerName: z.string().trim().min(1).max(120).optional(), siteLabel: z.string().trim().max(200).optional(),
});

const r2 = (n: number) => Math.round(n * 100) / 100;
export function lineTotal(l: Pick<ProposalLine, "quantity" | "unitPrice">) { return l.quantity !== null && l.unitPrice !== null ? r2(l.quantity * l.unitPrice) : null; }
/** No guessed totals: null unless every line is fully priced. */
export function totals(p: Pick<Proposal, "lines">) {
  const unpriced = p.lines.filter((l) => lineTotal(l) === null).length;
  const sum = p.lines.reduce((s, l) => s + (lineTotal(l) ?? 0), 0);
  return { unpricedLines: unpriced, total: p.lines.length && unpriced === 0 ? r2(sum) : null };
}

export type Check = { ok: true } | { ok: false; status: number; error: string };
const no = (status: number, error: string): Check => ({ ok: false, status, error });
export function checkRevision(p: Proposal, expected: number): Check { return expected === p.revision ? { ok: true } : no(409, `This proposal changed (now revision ${p.revision}). Reload before saving.`); }

export function applyEdit(p: Proposal, e: z.infer<typeof proposalEditSchema>, by: string, newId: () => string): Check {
  const c = checkRevision(p, e.expectedRevision); if (!c.ok) return c;
  if (p.status === "void" || p.status === "sent_externally") return no(409, `Proposal is ${p.status.replace("_", " ")} and can't be edited. Duplicate it instead.`);
  if (e.lines) p.lines = e.lines.map((l) => ({ id: l.id || newId(), description: l.description, service: l.service, surface: l.surface as Surface | undefined, quantity: l.quantity, unit: l.unit, unitPrice: l.unitPrice, priceSource: l.unitPrice === null ? "unset" : l.priceSource === "rate_book" ? "rate_book" : "manual", measurementRef: l.measurementRef }));
  if (e.scopeNotes !== undefined) p.scopeNotes = e.scopeNotes;
  if (e.exclusions !== undefined) p.exclusions = e.exclusions;
  if (e.validDays !== undefined) p.validDays = e.validDays;
  if (e.customerName !== undefined) p.customerName = e.customerName;
  if (e.siteLabel !== undefined) p.siteLabel = e.siteLabel;
  const wasApproved = p.approval && p.status !== "draft";
  p.revision++; p.status = "draft"; p.approval = undefined; p.submittedForApproval = undefined;
  p.history.push({ by, at: new Date().toISOString(), revision: p.revision, action: wasApproved ? "edited (owner approval cleared)" : "edited" });
  return { ok: true };
}

/** Copy owner rates into lines that have a service + surface and no price yet. Never invents a rate. */
export function fillFromRateBook(p: Proposal, book: RateBook): { filled: number; missing: number } {
  let filled = 0, missing = 0;
  for (const l of p.lines) {
    if (l.unitPrice !== null || !l.service || !l.surface) continue;
    const r = rateFor(book, l.service, l.surface);
    if (r && r.rate !== null) { l.unitPrice = r.rate; l.unit = r.unit; l.priceSource = "rate_book"; filled++; } else missing++;
  }
  return { filled, missing };
}

export function submitForApproval(p: Proposal, expected: number, by: string): Check {
  const c = checkRevision(p, expected); if (!c.ok) return c;
  if (p.status !== "draft") return no(409, "Only drafts can be submitted for approval.");
  const t = totals(p);
  if (!p.lines.length) return no(422, "Add at least one line.");
  if (t.total === null) return no(422, `${t.unpricedLines} line(s) have no quantity or price. Prices are never guessed — enter them manually.`);
  p.status = "pending_approval"; p.submittedForApproval = { by, at: new Date().toISOString(), revision: p.revision };
  p.history.push({ by, at: new Date().toISOString(), revision: p.revision, action: "submitted for owner approval" });
  return { ok: true };
}

export function approve(p: Proposal, expected: number, actor: { id: string; role: string }): Check {
  if (actor.role !== "owner") return no(403, "Owner approval required");
  const c = checkRevision(p, expected); if (!c.ok) return c;
  if (p.status !== "pending_approval" && p.status !== "draft") return no(409, `Can't approve a ${p.status} proposal.`);
  if (totals(p).total === null) return no(422, "Every line needs a quantity and a manual price before approval.");
  p.status = "approved"; p.approval = { by: actor.id, at: new Date().toISOString(), revision: p.revision };
  p.history.push({ by: actor.id, at: p.approval.at, revision: p.revision, action: "approved by owner" });
  return { ok: true };
}

export function canExport(p: Proposal, expected: number, actor: { role: string }): Check {
  if (actor.role !== "owner") return no(403, "Only the owner can export proposals");
  const c = checkRevision(p, expected); if (!c.ok) return c;
  if (!p.approval || p.approval.revision !== p.revision || !["approved", "exported"].includes(p.status)) return no(409, "Approve this exact revision before exporting.");
  return { ok: true };
}

export function markSentExternally(p: Proposal, expected: number, actor: { id: string; role: string }, channel: string, note?: string): Check {
  if (actor.role !== "owner") return no(403, "Only the owner can record that a proposal was sent");
  const c = checkRevision(p, expected); if (!c.ok) return c;
  if (!p.exports.some((x) => x.revision === p.revision)) return no(409, "Export this revision first. The system never sends proposals; this only records that you sent it yourself.");
  p.status = "sent_externally"; p.sentExternally = { by: actor.id, at: new Date().toISOString(), revision: p.revision, channel: channel.slice(0, 40), note: note?.slice(0, 300) };
  p.history.push({ by: actor.id, at: p.sentExternally.at, revision: p.revision, action: `marked sent externally (${p.sentExternally.channel})` });
  return { ok: true };
}
