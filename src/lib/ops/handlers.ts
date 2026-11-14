import "server-only";
import { kv } from "@/lib/server/kv";
import { pushLeadToGhl, upsertIntentContact } from "@/lib/crm/ghl";
import { routeLead } from "@/lib/leads/routing";
import { readUrls } from "@/lib/photos";
import { importJob } from "@/lib/datamoon/service";
import { syncVendorContact } from "@/lib/datamoon/ghl-map";
import { getWalkthrough } from "@/lib/walkthrough/store";
import { regionTag } from "@/config/crm";
import type { LeadInput } from "@/lib/leads/schema";
import type { Score } from "@/lib/leads/scoring";
import type { Handler, JobKind } from "./outbox";

/** Outbox handlers: re-load the record by id and re-run the existing (unchanged) CRM functions. */
export const handlers: Partial<Record<JobKind, Handler>> = {
  "ghl.lead": async (job) => {
    const raw = await kv.get(`lead:data:${job.ref}`);
    if (!raw) return { status: "error", detail: "lead not found" };
    const rec = JSON.parse(raw) as { lead: LeadInput; score: Score };
    const routing = routeLead(rec.lead);
    const r = await pushLeadToGhl(rec.lead, routing, rec.score, await readUrls(rec.lead.photoKeys, process.env.NEXT_PUBLIC_SITE_URL || ""));
    return r.mode === "dry-run" ? { status: "skipped", detail: "GHL not configured (dry-run)" } : r.error ? { status: "error", detail: r.error } : { status: "ok" };
  },
  "ghl.walkthrough": async (job) => {
    const w = await getWalkthrough(job.ref);
    if (!w) return { status: "error", detail: "walkthrough not found" };
    if (!w.customer.email) return { status: "ok", detail: "no email on walkthrough — nothing to tag" };
    const tags = ["brand:stonecraft", regionTag(w.market), "walkthrough:submitted", `walkthrough:${w.workType}`, ...(w.county ? [`county:${w.county}`] : []), ...w.escalations.map((e) => `walkthrough-escalation:${e}`)];
    const r = await upsertIntentContact({ email: w.customer.email, firstName: w.customer.firstName, zip: w.zip, state: w.market === "boston" ? "MA" : "FL" }, tags, { source: "website-walkthrough" });
    return r.mode === "dry-run" ? { status: "skipped", detail: "GHL not configured (dry-run)" } : r.error ? { status: "error", detail: r.error } : { status: "ok" };
  },
  "datamoon.import": importJob,
  "datamoon.ghl_contact": (job) => syncVendorContact(job.ref),
};
