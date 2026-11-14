import "server-only";
import { dmConfig } from "./config";
import { DataMoonError, dmRequest, type Fetcher } from "./http";
import type { AudienceRun, BuildAudienceRequest, Topic, TopicKind } from "./types";

/**
 * Main REST client (app.datamoon.com/api/v2). Module/ext audience routes use `X-Api-Key` (DATAMOON_MAIN_MODULE_KEY).
 * Topic search is public (no key). Legacy enrichment (`api_key`) is intentionally NOT wired in this phase.
 * Every method throws DataMoonError("disabled") unless DATAMOON_ENABLED and DATAMOON_MAIN_API_ENABLED are on.
 */
export function mainClient(fetcher?: Fetcher) {
  const c = dmConfig();
  const guard = (needsKey: boolean) => {
    if (!c.enabled || !c.mainEnabled) throw new DataMoonError("disabled", 0, "DataMoon main API is disabled by feature flag");
    if (needsKey && !process.env.DATAMOON_MAIN_MODULE_KEY) throw new DataMoonError("disabled", 0, "DATAMOON_MAIN_MODULE_KEY not set");
  };
  const auth = () => ({ "X-Api-Key": process.env.DATAMOON_MAIN_MODULE_KEY! });
  const tier = `/${c.mainTier}`; // "/m" (module) or "/ext"
  return {
    /** Documented: GET /v2/b2b-topics/search | /v2/b2c-topics/search, query keywords (min 3), mode auto|keyword|semantic. */
    async listTopics(kind: TopicKind, keywords: string, mode: "auto" | "keyword" | "semantic" = "auto"): Promise<Topic[]> {
      guard(false);
      if (keywords.trim().length < 3) throw new DataMoonError("validation", 422, "keywords must be at least 3 characters");
      const r = await dmRequest<{ success?: boolean; error?: string; data?: unknown[] }>({ base: c.mainBase, path: `/${kind}-topics/search`, method: "GET", query: { keywords, mode }, fetcher });
      if (r?.error === "catalog_unavailable") throw new DataMoonError("server", 503, "Topic catalog unavailable");
      // UNVERIFIED item shape: accept {id,name,...} objects; ignore anything without an id.
      return (r?.data ?? []).flatMap((x) => (x && typeof x === "object" && "id" in (x as object) ? [{ kind, id: (x as { id: string | number }).id, name: String((x as { name?: unknown }).name ?? (x as { topic?: unknown }).topic ?? ""), category: (x as { category?: string }).category, subcategory: (x as { subcategory?: string }).subcategory }] : []));
    },
    /** Documented: POST /v2/{m|ext}/audiences/build → "Audience is being built." (async). */
    async buildAudience(req: BuildAudienceRequest) {
      guard(true);
      return dmRequest<{ message: string; data?: unknown }>({ base: c.mainBase, path: `${tier}/audiences/build`, method: "POST", headers: auth(), body: req, fetcher });
    },
    /** Documented: GET /v2/{m|ext}/audiences/fetch/{id} — poll until status: completed. */
    async pollAudience(id: string | number): Promise<AudienceRun> {
      guard(true);
      const r = await dmRequest<{ status: string; counts?: Record<string, number> }>({ base: c.mainBase, path: `${tier}/audiences/fetch/${encodeURIComponent(String(id))}`, method: "GET", headers: auth(), fetcher });
      return { id: String(id), status: r.status === "completed" ? "completed" : r.status === "in_progress" ? "in_progress" : "failed", counts: r.counts };
    },
    /** Documented: GET /v2/{m|ext}/audiences/fetch — list. */
    async listAudiences() { guard(true); return dmRequest<{ success: boolean; data: unknown[] }>({ base: c.mainBase, path: `${tier}/audiences/fetch`, method: "GET", headers: auth(), fetcher }); },
    /** Documented: POST /v2/{m|ext}/audiences/manage/{id}/export. ext is limited to 13 output fields (422 + allowed_fields otherwise). Billable. */
    async exportAudience(id: string | number, fields: string[]) {
      guard(true);
      return dmRequest<string>({ base: c.mainBase, path: `${tier}/audiences/manage/${encodeURIComponent(String(id))}/export`, method: "POST", headers: auth(), body: { fields }, fetcher });
    },
  };
}

/** ext-tier output fields (documented list of 13). */
export const EXT_OUTPUT_FIELDS = ["first_name", "last_name", "personal_emails", "personal_phone", "linkedin_url", "personal_address", "personal_address_2", "personal_city", "personal_state", "personal_zip", "personal_zip4", "contact_country", "business_email"] as const;
