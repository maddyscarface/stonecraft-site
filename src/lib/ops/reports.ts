import "server-only";
import { kvConfigured } from "@/lib/server/kv";
import { supabaseConfigured } from "@/lib/server/storage";
import { dmStatus } from "@/lib/datamoon/config";
import { listEvents as dmEvents, listImports } from "@/lib/datamoon/store";
import { getProvider } from "@/lib/datamoon/adapter";
import { arSummary } from "@/lib/ar/adapters";
import { listWalkthroughs } from "@/lib/walkthrough/store";
import { listProposals } from "@/lib/estimator/store";
import { totals } from "@/lib/estimator/proposal";
import { flStatus } from "@/config/markets";
import { searchRecords } from "./records";
import { listJobs, outboxStats } from "./outbox";
import { opsEnabled, staffDefs } from "./auth";

/** Aggregate reporting (counts only — no PII). Proposal values are owner-visible and sandbox/live are separated. */
export async function buildReport(opts: { includeValues: boolean }) {
  const { rows } = await searchRecords({ limit: 1000 }, { pii: false });
  const count = <K extends string>(f: (r: (typeof rows)[number]) => K, filter: (r: (typeof rows)[number]) => boolean = () => true) => rows.filter(filter).reduce<Record<string, number>>((m, r) => { const k = f(r); m[k] = (m[k] ?? 0) + 1; return m; }, {});
  const wts = await listWalkthroughs();
  const props = await listProposals();
  const approvedValue = (live: boolean) => props.filter((p) => p.sandbox !== live && ["approved", "exported", "sent_externally"].includes(p.status)).reduce((s, p) => s + (totals(p).total ?? 0), 0);
  return {
    generatedAt: new Date().toISOString(),
    totals: { records: rows.length, firstParty: rows.filter((r) => r.firstParty).length, vendorProspects: rows.filter((r) => !r.firstParty).length },
    byType: count((r) => r.type), byMarket: count((r) => r.market), byCounty: count((r) => r.county ?? "n/a", (r) => r.market === "south-florida"), bySource: count((r) => r.source), byMonth: count((r) => r.createdAt.slice(0, 7)),
    leadsByTier: count((r) => r.status, (r) => r.type === "lead"),
    walkthroughs: {
      byStatus: wts.reduce<Record<string, number>>((m, w) => { m[w.status] = (m[w.status] ?? 0) + 1; return m; }, {}),
      byWorkType: wts.reduce<Record<string, number>>((m, w) => { m[w.workType] = (m[w.workType] ?? 0) + 1; return m; }, {}),
      byOutcome: wts.reduce<Record<string, number>>((m, w) => { const k = w.outcome?.value ?? (w.suggestedOutcome ? `suggested:${w.suggestedOutcome}` : "none"); m[k] = (m[k] ?? 0) + 1; return m; }, {}),
      escalations: wts.reduce<Record<string, number>>((m, w) => { for (const e of w.escalations) m[e] = (m[e] ?? 0) + 1; return m; }, {}),
    },
    proposals: {
      byStatus: props.reduce<Record<string, number>>((m, p) => { m[p.status] = (m[p.status] ?? 0) + 1; return m; }, {}),
      ...(opts.includeValues ? { approvedValueUsd: { live: approvedValue(true), sandbox: approvedValue(false), note: "Owner-only. Sum of approved/exported/sent proposals with complete manual pricing." } } : {}),
    },
    outbox: await outboxStats(),
  };
}

export async function integrationHealth() {
  const ob = await outboxStats();
  const jobs = await listJobs();
  const lastErrors = jobs.filter((j) => j.lastError && j.status !== "done").slice(0, 10).map((j) => ({ id: j.id, kind: j.kind, status: j.status, attempts: j.attempts, error: j.lastError, updatedAt: j.updatedAt }));
  const credits = await getProvider().getCreditStatus().catch(() => null);
  return {
    checkedAt: new Date().toISOString(),
    note: "Configured ≠ verified. Every item stays 'not verified live' until owner test evidence is recorded.",
    markets: { boston: "live", southFlorida: flStatus(), flKillSwitch: "MARKET_FL_PAUSED=true", legacyFlStatusEnvIgnored: Boolean(process.env.MARKET_FL_STATUS) },
    storage: { kv: kvConfigured ? "upstash" : "memory (NOT durable)", privateFiles: supabaseConfigured() ? "supabase private bucket" : "local tmp sandbox (NOT durable)" },
    crm: { ghl: process.env.GHL_PRIVATE_TOKEN ? "configured_unverified" : "dry-run (not configured)", bostonLocation: Boolean(process.env.GHL_LOCATION_ID_BOSTON), flLocation: Boolean(process.env.GHL_LOCATION_ID_FL) },
    tracking: { metaCapi: Boolean(process.env.META_CAPI_TOKEN), ga4Mp: Boolean(process.env.GA4_API_SECRET), pixelsConsentGated: true },
    walkthrough: { enabled: process.env.WALKTHROUGH_ENABLED !== "false", selfStart: process.env.WALKTHROUGH_ENABLED !== "false" && process.env.WALKTHROUGH_SELF_START === "true" },
    ar: arSummary().map((a) => ({ provider: a.provider, status: a.status })),
    datamoon: { ...dmStatus(), provider: getProvider().mode, credits, recentWebhookEvents: (await dmEvents()).slice(0, 5), recentImports: (await listImports()).slice(0, 5).map((i) => ({ id: i.id, at: i.at, accepted: i.accepted, rejected: i.rejected, dryRun: i.dryRun, synthetic: i.synthetic })) },
    outbox: { ...ob, lastErrors, worker: process.env.CRON_SECRET ? "cron endpoint enabled (/api/cron/outbox)" : "manual (admin 'Run worker'); set CRON_SECRET + a scheduler" },
    admin: { enabled: opsEnabled(), staff: staffDefs().length, sessionCookie: "HttpOnly; SameSite=Strict" },
  };
}
