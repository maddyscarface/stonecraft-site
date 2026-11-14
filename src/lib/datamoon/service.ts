import "server-only";
import { randomUUID } from "node:crypto";
import { BRAND_ID } from "@/lib/ops/brand";
import { opsAudit } from "@/lib/ops/audit";
import { enqueue, type Job } from "@/lib/ops/outbox";
import type { Actor } from "@/lib/ops/auth";
import { getProvider } from "./adapter";
import { dmConfig } from "./config";
import { FIXTURE_LABEL, fixtureTopics } from "./fixtures";
import { DataMoonError } from "./http";
import { importRows } from "./importer";
import { checkQuota } from "./quota";
import { approvalIssues, complianceIssues, estimateCredits, recipeInputSchema, targetingViolations, type Recipe } from "./recipes";
import { addUsage, claimEvent, getRecipe, indexRecipe, listRecipes, logEvent, monthUsage, saveRecipe, saveTopic, stashDownload } from "./store";
import { feedAllowed, parseEvent, verifyDataMoonSignature } from "./webhook";
import type { TopicKind } from "./types";

type R<T> = { ok: true; data: T } | { ok: false; status: number; error: string; issues?: string[] };
const fail = (status: number, error: string, issues?: string[]): R<never> => ({ ok: false, status, error, issues });
const who = (a: Actor) => ({ id: a.id, role: a.role });

export async function discoverTopics(kind: TopicKind, q: string) {
  const p = getProvider();
  try {
    if (p.mode === "live") return { source: "datamoon", topics: await p.discoverTopics(kind, q) };
  } catch (e) { if (!(e instanceof DataMoonError && e.code === "disabled")) return { source: "error", error: (e as Error).message, topics: [] }; }
  const qq = q.trim().toLowerCase();
  return { source: "synthetic_fixture", label: FIXTURE_LABEL, topics: fixtureTopics.filter((t) => t.kind === kind && (!qq || t.name.toLowerCase().includes(qq))) };
}

export async function confirmTopic(a: Actor, t: { kind: TopicKind; id: string | number; name: string; synthetic: boolean }) {
  const saved = { ...t, confirmedAt: new Date().toISOString(), by: a.id };
  await saveTopic(saved); await opsAudit(who(a), "datamoon.topic_confirmed", { type: "topic", id: String(t.id) }, { synthetic: t.synthetic });
  return saved;
}

export async function createRecipe(a: Actor, body: unknown): Promise<R<Recipe>> {
  const p = recipeInputSchema.safeParse(body);
  if (!p.success) return fail(422, "Invalid recipe", p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  const hard = targetingViolations(p.data);
  if (hard.length) { await opsAudit(who(a), "datamoon.recipe_refused", undefined, { reasons: hard.length }); return fail(422, "Recipe refused: prohibited targeting", hard); }
  const issues = complianceIssues(p.data);
  const now = new Date().toISOString();
  const r: Recipe = { ...p.data, id: randomUUID(), brand: BRAND_ID, status: "draft", owner: a.id, createdAt: now, updatedAt: now, estimatedCredits: estimateCredits(p.data), synthetic: p.data.topics.every((t) => t.synthetic) || !dmConfig().enabled, version: 1 };
  await saveRecipe(r); await indexRecipe(r.id);
  await opsAudit(who(a), "datamoon.recipe_created", { type: "recipe", id: r.id }, { persona: r.persona, issues: issues.length });
  return { ok: true, data: Object.assign(r, { issues }) };
}

export async function recipeAction(a: Actor, id: string, action: string, body: Record<string, unknown> = {}): Promise<R<unknown>> {
  const r = await getRecipe(id);
  if (!r) return fail(404, "Not found");
  const cfg = dmConfig();
  const ownerOnly = ["approve", "approve_export", "approve_crm_sync", "revoke_approvals"];
  if (ownerOnly.includes(action) && a.role !== "owner") return fail(403, "Owner approval required");
  switch (action) {
    case "update": {
      if (r.status === "approved") return fail(409, "Approved recipes are locked. Pause it, then edit (approvals are cleared).");
      const merged = recipeInputSchema.safeParse({ ...r, ...body });
      if (!merged.success) return fail(422, "Invalid recipe", merged.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
      const hard = targetingViolations(merged.data); if (hard.length) return fail(422, "Recipe refused: prohibited targeting", hard);
      Object.assign(r, merged.data, { estimatedCredits: estimateCredits(merged.data), version: r.version + 1 });
      break;
    }
    case "submit": { const issues = complianceIssues(r); if (issues.length) return fail(422, "Fix compliance issues first", issues); r.status = "submitted"; break; }
    case "approve": { const issues = complianceIssues(r); if (issues.length) return fail(422, "Compliance issues", issues); if (r.status !== "submitted") return fail(409, "Submit the recipe first"); r.status = "approved"; break; }
    case "approve_export": {
      if (r.status !== "approved") return fail(409, "Approve the recipe first");
      const issues = approvalIssues(r, cfg, "export"); if (issues.length) return fail(422, "Export approval blocked", issues);
      r.exportApproval = { by: a.id, at: new Date().toISOString(), maxRecords: r.maxRecords }; break;
    }
    case "approve_crm_sync": {
      if (!r.exportApproval) return fail(409, "Approve the export first");
      const issues = approvalIssues(r, cfg, "crm_sync"); if (issues.length) return fail(422, "CRM sync approval blocked", issues);
      r.crmSyncApproval = { by: a.id, at: new Date().toISOString() }; break;
    }
    case "revoke_approvals": r.exportApproval = undefined; r.crmSyncApproval = undefined; break;
    case "pause": r.status = "paused"; r.exportApproval = undefined; r.crmSyncApproval = undefined; break;
    case "reopen": if (r.status !== "paused") return fail(409, "Only paused recipes can be reopened"); r.status = "draft"; break;
    case "retire": r.status = "retired"; r.exportApproval = undefined; r.crmSyncApproval = undefined; break;
    case "preview": {
      try { const pv = await getProvider().preview(r); await opsAudit(who(a), "datamoon.preview", { type: "recipe", id }, { synthetic: !!pv.synthetic, total: pv.total_records }); return { ok: true, data: pv }; }
      catch (e) { return fail(e instanceof DataMoonError && e.code === "disabled" ? 409 : 502, (e as Error).message); }
    }
    case "run": return runRecipe(a, r);
    default: return fail(400, "Unknown action");
  }
  await saveRecipe(r);
  await opsAudit(who(a), `datamoon.recipe_${action}`, { type: "recipe", id }, { status: r.status });
  return { ok: true, data: r };
}

/** Billable in live mode. Requires: approved recipe + owner export approval + quota guard; live also needs the brand activation flag. */
async function runRecipe(a: Actor, r: Recipe): Promise<R<unknown>> {
  if (r.status !== "approved" || !r.exportApproval) return fail(409, "Recipe needs owner approval and an export approval");
  const cfg = dmConfig(); const p = getProvider();
  if (p.mode === "disabled") return fail(409, "DataMoon not connected");
  if (p.mode === "live" && r.synthetic) return fail(409, "Synthetic (fixture) recipes cannot run against the live vendor — create a new recipe from live catalog topics");
  if (p.mode === "live" && !cfg.activationEnabled) return fail(409, "DATAMOON_AUDIENCE_ACTIVATION_BUILDGHANA is off");
  const credits = await p.getCreditStatus().catch(() => null);
  if (p.mode === "live") {
    const q = checkQuota({ requested: r.maxRecords, ceiling: cfg.recordCeiling, monthlyBudget: cfg.monthlyBudget, monthUsed: await monthUsage(), credits });
    if (!q.ok) { await opsAudit(who(a), "datamoon.quota_denied", { type: "recipe", id: r.id }, { reason: q.reason }); return fail(402, q.reason); }
  }
  try {
    const job = await p.activate(r);
    const exportId = "export_id" in job ? job.export_id : job.id;
    if (p.mode === "live") await addUsage(r.maxRecords);
    r.lastRunAt = new Date().toISOString(); await saveRecipe(r);
    await opsAudit(who(a), "audience.run_started", { type: "recipe", id: r.id }, { exportId, synthetic: p.mode !== "live" });
    // Synthetic mode: the fixture export is "ready" immediately → queue the import like a webhook would.
    if (p.mode === "noop_fixtures") await enqueue("datamoon.import", exportId, `dm-import:${exportId}`, { source: "datamoon.fixture_run", payload: { exportId, recipeId: r.id, synthetic: true } });
    return { ok: true, data: { exportId, status: "status" in job ? job.status : "in_progress", synthetic: p.mode !== "live" } };
  } catch (e) {
    const err = e as DataMoonError;
    await opsAudit(who(a), "audience.sync_failed", { type: "recipe", id: r.id }, { code: err.code, status: err.status });
    return fail(err.code === "rate_limited" ? 429 : err.code === "quota_exceeded" ? 402 : err.code === "auth" ? 502 : 502, err.message);
  }
}

/** Outbox handler: pull export rows (fixtures or live pages) and import them. */
export async function importJob(job: Job) {
  const exportId = String(job.payload?.exportId ?? job.ref);
  const recipeId = String(job.payload?.recipeId ?? "");
  const synthetic = job.payload?.synthetic === true;
  const r = recipeId ? await getRecipe(recipeId) : (await listRecipes()).find((x) => x.lastRunAt);
  if (!r) return { status: "error" as const, detail: "No recipe for export" };
  const p = getProvider();
  if (!synthetic && p.mode !== "live") return { status: "skipped" as const, detail: "Live provider not configured" };
  try {
    const rows: Record<string, unknown>[] = [];
    for (let page = 1; page <= 50; page++) { const chunk = await p.exportRows(exportId, page); rows.push(...chunk); if (synthetic || chunk.length === 0) break; }
    const s = await importRows(rows, { exportId, recipeId: r.id, by: "system", dryRun: false, synthetic, market: r.market });
    await opsAudit({ id: "system", role: "system" }, "audience.export_imported", { type: "export", id: exportId }, { accepted: s.accepted, rejected: s.rejected, duplicates: s.duplicates, suppressed: s.suppressed });
    return { status: "ok" as const };
  } catch (e) {
    const err = e as DataMoonError;
    return { status: err.code === "expired" ? ("error" as const) : ("error" as const), detail: `${err.code ?? "error"}: ${err.message}` };
  }
}

/** Webhook entry point (route stays thin). Returns [status, body]. Verifies BEFORE parsing. */
export async function handleExportWebhook(raw: string, h: { id?: string | null; timestamp?: string | null; signature?: string | null }): Promise<[number, Record<string, unknown>]> {
  const cfg = dmConfig();
  if (!cfg.enabled || !cfg.intentEnabled || !cfg.hasWebhookSecret) return [404, { ok: false, error: "DataMoon webhook disabled" }];
  if (!h.signature) {
    // Unsigned deliveries are only ever DataMoon's connectivity test (test:true). Acknowledge, never ingest.
    const e = parseEvent(raw); const isTest = !!e && e.test === true;
    if (isTest) await logEvent({ id: e!.id, receivedAt: new Date().toISOString(), type: e!.type, status: "test_ignored" });
    return isTest ? [200, { ok: true, test: true, ingested: false }] : [401, { ok: false, error: "Missing signature" }];
  }
  const v = verifyDataMoonSignature(raw, h, process.env.DATAMOON_INTENT_WEBHOOK_SECRET);
  if (!v.ok) return [401, { ok: false, error: v.reason }];
  const e = parseEvent(raw);
  if (!e) return [400, { ok: false, error: "Unrecognised event" }];
  if (h.id && h.id !== e.id) return [400, { ok: false, error: "Webhook-Id mismatch" }];
  if (e.test) return [200, { ok: true, test: true, ingested: false }];
  if (!(await claimEvent(e.id))) { await logEvent({ id: e.id, receivedAt: new Date().toISOString(), type: e.type, exportId: e.data.export_id, status: "duplicate" }); return [200, { ok: true, duplicate: true }]; }
  if (!feedAllowed(e.data.feed_id, BRAND_ID, cfg.feedBrandMap)) {
    await logEvent({ id: e.id, receivedAt: new Date().toISOString(), type: e.type, exportId: e.data.export_id, feedId: e.data.feed_id, status: "rejected_feed" });
    await opsAudit({ id: "datamoon", role: "provider" }, "audience.sync_failed", { type: "export", id: e.data.export_id }, { reason: "feed_not_mapped_to_brand" });
    return [202, { ok: true, ingested: false, reason: "feed_not_mapped_to_brand" }];
  }
  if (e.data.download_url && e.data.download_expires_at) await stashDownload(e.data.export_id, e.data.download_url, e.data.download_expires_at);
  const recipe = (await listRecipes()).find((r) => r.feedId === e.data.feed_id && r.exportApproval);
  await enqueue("datamoon.import", e.data.export_id, `dm-import:${e.data.export_id}`, { source: "datamoon.webhook", parentEventId: e.id, payload: { exportId: e.data.export_id, recipeId: recipe?.id ?? "", synthetic: false } });
  await logEvent({ id: e.id, receivedAt: new Date().toISOString(), type: e.type, exportId: e.data.export_id, feedId: e.data.feed_id, rowCount: e.data.row_count, status: "queued", downloadExpiresAt: e.data.download_expires_at ?? undefined });
  await opsAudit({ id: "datamoon", role: "provider" }, "audience.run_ready", { type: "export", id: e.data.export_id }, { rows: e.data.row_count });
  return [200, { ok: true, queued: true }];
}

/** Create a draft recipe from a pre-built Boston / Southeast Florida template (synthetic fixture topics). */
export async function createFromTemplate(a: Actor, key: string): Promise<R<Recipe>> {
  const { RECIPE_TEMPLATES } = await import("./recipes");
  const t = RECIPE_TEMPLATES.find((x) => x.key === key);
  if (!t) return fail(404, "Unknown template");
  const { key: _k, topicFixtureIds, ...rest } = t;
  const topics = topicFixtureIds.map((id) => fixtureTopics.find((f) => f.id === id)).filter(Boolean).map((f) => ({ kind: f!.kind, id: f!.id, name: f!.name, synthetic: true }));
  return createRecipe(a, { ...rest, topics });
}
