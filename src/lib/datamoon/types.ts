/** Shapes confirmed against the public docs unless marked UNVERIFIED. */
export type TopicKind = "b2b" | "b2c";
/** GET /v2/{b2b|b2c}-topics/search?keywords=&mode=auto|keyword|semantic — item shape UNVERIFIED (docs show data: string[] placeholder). */
export type Topic = { id: string | number; name: string; category?: string; subcategory?: string; kind: TopicKind; synthetic?: boolean };

/** Main audience filter object (documented). */
export type MainFilter = { field: string; operator: string; value?: string | string[] | null; value_to?: string };
/** POST /audiences/build body (documented). type advanced_search|b2b|b2c; topic_ids max 5; limit 1..1,000,000. */
export type BuildAudienceRequest = { type: "advanced_search" | "b2b" | "b2c"; name?: string; limit?: number; topic_ids?: (number | string)[]; filters: MainFilter[] };
export type AudienceRun = { id: string; status: "in_progress" | "completed" | "failed"; counts?: Record<string, number>; synthetic?: boolean };

/** Intent feed summary (documented: IntentFeedSummary). */
export type FeedSummary = { id: string; description: string; output_type?: "consumer" | "business"; lookback_days?: number | null; export_row_limit?: number | null; export_rows_used?: number | null; export_rows_remaining?: number | null; created_at: string; synthetic?: boolean };
/** GET /organization/credits (documented). */
export type CreditStatus = { record_limit: number | null; records_used: number; remaining: number | null; reset_period?: string; synthetic?: boolean };
/** Intent export filters: field names MUST come from /intent/feeds/filters/{consumer|business}/fields (never hard-coded). */
export type IntentFilter = { field: string; operator: string; value: unknown };
export type SafeExportOptions = { lookback_days: number; max_rows: number; page_size?: number; require_contact_id?: boolean; match_confidence?: "all" | "probabilistic" | "deterministic"; consumer_filters?: IntentFilter[]; business_filters?: IntentFilter[]; enrichment_bundles?: string[] };
export type ExportStatus = "building" | "ready" | "expired" | "failed" | "source_expired";
export type ExportJob = { export_id: string; status: ExportStatus; total_rows: number; total_pages: number; page_size: number; created_at: string; feed_id?: string | null; build_error?: string | null; synthetic?: boolean };
export type PreviewResult = { total_records: number; records_with_contact_id: number; sample: Record<string, unknown>[]; estimatedCredits: number; synthetic?: boolean };
export type ImportSummary = { exportId: string; accepted: number; rejected: number; duplicates: number; suppressed: number; reasons: Record<string, number>; dryRun: boolean };
