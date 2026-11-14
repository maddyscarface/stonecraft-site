import "server-only";
import { dmConfig } from "./config";
import { DataMoonError, dmRequest, type Fetcher } from "./http";
import type { CreditStatus, ExportJob, FeedSummary, SafeExportOptions } from "./types";

/**
 * Intent API client (intentapi.datamoon.com, header `X-API-Key` = DATAMOON_INTENT_KEY). Separate product and key
 * from the main API. Endpoints below are from https://intentdocs.datamoon.com (re-checked 2026-11-14).
 * Export creation RESERVES record credits; page reads and downloads do not.
 */
export function intentClient(fetcher?: Fetcher) {
  const c = dmConfig();
  const guard = () => {
    if (!c.enabled || !c.intentEnabled) throw new DataMoonError("disabled", 0, "DataMoon intent API is disabled by feature flag");
    if (!process.env.DATAMOON_INTENT_KEY) throw new DataMoonError("disabled", 0, "DATAMOON_INTENT_KEY not set");
  };
  const req = async <T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<T> => {
    guard();
    return dmRequest<T>({ base: c.intentBase, path, method, headers: { "X-API-Key": process.env.DATAMOON_INTENT_KEY! }, body, query, fetcher });
  };
  return {
    listFeeds: (search?: string, page = 1, page_size = 25) => req<{ feeds: FeedSummary[]; total: number; page: number; page_size: number; total_pages: number }>("GET", "/intent/feeds", undefined, { search, page, page_size }),
    getFeed: (id: string) => req<FeedSummary>("GET", `/intent/feeds/${encodeURIComponent(id)}`),
    getCredits: () => req<CreditStatus>("GET", "/organization/credits"),
    getFeedLimit: () => req<Record<string, unknown>>("GET", "/organization/feed-limit"),
    /** preview=true returns metrics only; preview=false SAVES a feed (counts against feed limit). lookback_days ≤ 14. */
    feedBuilder: (b: { text: string; lookback_days?: number; search_similarity?: "low" | "medium" | "high" | number; preview: boolean }) => req<Record<string, unknown>>("POST", "/intent/feeds/builder", b),
    /** Read-only unless auto_export is passed (never passed by this adapter). */
    feedStats: (feed_id: string, lookback_days: number) => req<{ feed_id: string; total_records: number; records_with_contact_id?: number }>("POST", "/intent/feeds/stats", { feed_id, lookback_days, include_daily_counts: false }),
    consumerFields: (category?: string) => req<{ fields: { name: string; label: string; category: string; supported_operators?: string[] }[]; categories?: string[] }>("POST", "/intent/feeds/filters/consumer/fields", { category, enabled_only: true }),
    consumerValues: (field: string) => req<Record<string, unknown>>("POST", "/intent/feeds/filters/consumer/values", { field }),
    businessFields: () => req<{ fields: { name: string; label: string; category: string }[] }>("POST", "/intent/feeds/filters/business/fields", { enabled_only: true }),
    businessValues: (field: string) => req<Record<string, unknown>>("POST", "/intent/feeds/filters/business/values", { field }),
    previewExport: (feed_id: string, o: SafeExportOptions, preview_rows = 25) => req<Record<string, unknown>>("POST", "/intent/feeds/exports/preview", { feed_id, ...o, preview_rows, skip_count: false }),
    countExport: (feed_id: string, o: SafeExportOptions) => req<Record<string, unknown>>("POST", "/intent/feeds/exports/count", { feed_id, ...o }),
    /** BILLABLE: reserves credits. Callers must pass quota guard + owner export approval first. */
    createExport: (feed_id: string, o: SafeExportOptions) => req<ExportJob>("POST", "/intent/feeds/exports", { feed_id, ...o }),
    listExports: (body: Record<string, unknown> = {}) => req<{ exports?: ExportJob[] }>("POST", "/intent/feeds/exports/list", body),
    exportPage: (export_id: string, page: number) => req<{ export_id: string; page: number; total_pages: number; rows: Record<string, unknown>[] }>("POST", "/intent/feeds/exports/page", { export_id, page }),
    downloadUrl: (export_id: string) => req<{ url?: string; expires_at?: string }>("POST", "/intent/feeds/exports/download-url", { export_id }),
    enrichBundles: () => req<{ enabled_bundles: string[] }>("GET", "/enrich/bundles"),
    /** POST /enrich/{bundle-path} with contact_ids (bulk). Bundle path uses hyphens (individual-core); export bundle keys use underscores. */
    enrich: (bundlePath: string, contact_ids: string[]) => req<Record<string, unknown>>("POST", `/enrich/${encodeURIComponent(bundlePath)}`, { contact_ids }),
    listWebhooks: () => req<{ items: Record<string, unknown>[]; has_more: boolean }>("GET", "/webhooks", undefined, { limit: 25, offset: 0 }),
    /** Org-wide export.ready subscription. Returns signing_secret ONCE — store it in DATAMOON_INTENT_WEBHOOK_SECRET. Owner action only. */
    registerWebhook: (url: string, mode: "create" | "test") => req<Record<string, unknown>>("POST", "/webhooks", { mode, url, enabled: true }),
  };
}

export const CONTACT_ID_RE = /^id_[0-9a-f]{16}$/;
