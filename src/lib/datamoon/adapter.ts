import "server-only";
import { randomUUID } from "node:crypto";
import { dmConfig } from "./config";
import { DataMoonError, type Fetcher } from "./http";
import { intentClient } from "./intent-client";
import { mainClient } from "./main-client";
import { fixtureCredits, fixtureFeeds, fixtureRows, fixtureTopics } from "./fixtures";
import type { Recipe } from "./recipes";
import type { AudienceRun, CreditStatus, ExportJob, FeedSummary, PreviewResult, SafeExportOptions, Topic, TopicKind } from "./types";

/** Adapter contract from 05_SHARED_TECHNICAL_ARCHITECTURE (implemented against the documented endpoints). */
export interface AudienceProvider {
  readonly mode: "noop_fixtures" | "live" | "disabled";
  discoverTopics(kind: TopicKind, query: string): Promise<Topic[]>;
  preview(r: Recipe): Promise<PreviewResult>;
  activate(r: Recipe): Promise<AudienceRun | ExportJob>;
  poll(runId: string, api: Recipe["api"]): Promise<AudienceRun | ExportJob>;
  listAvailableFeeds(): Promise<FeedSummary[]>;
  exportFeed(feedId: string, o: SafeExportOptions): Promise<ExportJob>;
  getCreditStatus(): Promise<CreditStatus | null>;
  exportRows(exportId: string, page: number): Promise<Record<string, unknown>[]>;
}

const safeOptions = (r: Recipe): SafeExportOptions => ({ lookback_days: Math.min(14, r.lookbackDays), max_rows: r.maxRecords, page_size: 1000, require_contact_id: true, match_confidence: "deterministic",
  consumer_filters: r.filters.filter((f) => f.api === "intent_consumer").map(({ field, operator, value }) => ({ field, operator, value })),
  business_filters: r.filters.filter((f) => f.api === "intent_business").map(({ field, operator, value }) => ({ field, operator, value })),
  enrichment_bundles: r.enrichmentBundles.length ? r.enrichmentBundles : undefined });

/** NoopDataMoonAdapter: deterministic SYNTHETIC fixtures, zero network calls. */
export class NoopDataMoonAdapter implements AudienceProvider {
  readonly mode = "noop_fixtures" as const;
  private exports = new Map<string, ExportJob & { polls: number }>();
  async discoverTopics(kind: TopicKind, query: string) {
    const q = query.trim().toLowerCase();
    return fixtureTopics.filter((t) => t.kind === kind && (!q || t.name.toLowerCase().includes(q) || (t.category ?? "").toLowerCase().includes(q)));
  }
  async preview(r: Recipe): Promise<PreviewResult> {
    const total = Math.min(r.maxRecords, 1200);
    return { total_records: total, records_with_contact_id: Math.floor(total * 0.6), sample: fixtureRows(3).map(({ contact_id, match_confidence, personal_state }) => ({ contact_id, match_confidence, personal_state })), estimatedCredits: Math.min(r.maxRecords, Math.floor(total * 0.6)), synthetic: true };
  }
  async activate(r: Recipe) { return this.exportFeed(r.feedId ?? fixtureFeeds[0].id, safeOptions(r)); }
  async poll(id: string): Promise<ExportJob> {
    const e = this.exports.get(id);
    if (!e) return { export_id: id, status: "expired", total_rows: 0, total_pages: 0, page_size: 1000, created_at: new Date().toISOString(), synthetic: true };
    e.polls++; if (e.polls >= 1) { e.status = "ready"; e.total_rows = 6; e.total_pages = 1; }
    return { ...e };
  }
  async listAvailableFeeds() { return fixtureFeeds; }
  async exportFeed(feedId: string, o: SafeExportOptions): Promise<ExportJob> {
    const job = { export_id: randomUUID(), status: "building" as const, total_rows: 0, total_pages: 0, page_size: o.page_size ?? 1000, created_at: new Date().toISOString(), feed_id: feedId, synthetic: true, polls: 0 };
    this.exports.set(job.export_id, job); return { ...job };
  }
  async getCreditStatus() { return fixtureCredits; }
  async exportRows(_id: string, _page: number) { return fixtureRows(6); }
}

/** Live adapter over the two documented clients. Only constructed when flags + keys are present. */
export class LiveDataMoonAdapter implements AudienceProvider {
  readonly mode = "live" as const;
  constructor(private fetcher?: Fetcher) {}
  discoverTopics(kind: TopicKind, query: string) { return mainClient(this.fetcher).listTopics(kind, query); }
  async preview(r: Recipe): Promise<PreviewResult> {
    if (r.api !== "intent_feed" || !r.feedId) throw new DataMoonError("validation", 422, "Live preview is implemented for intent feeds only (main-API audiences are async builds)");
    const p = await intentClient(this.fetcher).previewExport(r.feedId, safeOptions(r), 10) as Record<string, unknown>;
    const total = Number(p.total_records ?? p.total_rows ?? 0), withId = Number(p.records_with_contact_id ?? total);
    return { total_records: total, records_with_contact_id: withId, sample: [], estimatedCredits: Math.min(r.maxRecords, withId) };
  }
  async activate(r: Recipe) {
    if (r.api === "intent_feed" && r.feedId) return this.exportFeed(r.feedId, safeOptions(r));
    const res = await mainClient(this.fetcher).buildAudience({ type: r.kind, name: `sc-${r.market === "boston" ? "bos" : "fl"}-${r.id.slice(0, 8)}`, limit: r.maxRecords, topic_ids: r.topics.map((t) => t.id), filters: [{ field: "personal_state", operator: "in", value: r.states.length ? r.states : undefined }].filter((f) => f.value) as never });
    return { id: String((res as { data?: { id?: unknown } }).data?.id ?? ""), status: "in_progress" as const };
  }
  async poll(id: string, api: Recipe["api"]) {
    if (api === "main_audience") return mainClient(this.fetcher).pollAudience(id);
    const list = await intentClient(this.fetcher).listExports({ export_id: id });
    const e = list.exports?.find((x) => x.export_id === id);
    if (!e) throw new DataMoonError("not_found", 404, "Export not found");
    return e;
  }
  async listAvailableFeeds() { return (await intentClient(this.fetcher).listFeeds()).feeds; }
  exportFeed(feedId: string, o: SafeExportOptions) { return intentClient(this.fetcher).createExport(feedId, o); }
  async getCreditStatus() { return intentClient(this.fetcher).getCredits(); }
  async exportRows(id: string, page: number) { return (await intentClient(this.fetcher).exportPage(id, page)).rows ?? []; }
}

class DisabledAdapter implements AudienceProvider {
  readonly mode = "disabled" as const;
  private no(): never { throw new DataMoonError("disabled", 0, "DataMoon is not connected and fixtures are disabled on this deployment"); }
  discoverTopics() { return this.no(); } preview() { return this.no(); } activate() { return this.no(); } poll() { return this.no(); }
  listAvailableFeeds() { return this.no(); } exportFeed() { return this.no(); } async getCreditStatus() { return null; } exportRows() { return this.no(); }
}

const g = globalThis as unknown as { __dmNoop?: NoopDataMoonAdapter };
export function getProvider(fetcher?: Fetcher): AudienceProvider {
  const c = dmConfig();
  const live = c.enabled && ((c.intentEnabled && c.hasIntentKey) || (c.mainEnabled && c.hasModuleKey));
  if (live) return new LiveDataMoonAdapter(fetcher);
  if (c.fixturesAllowed) return (g.__dmNoop ??= new NoopDataMoonAdapter());
  return new DisabledAdapter();
}
