/**
 * SYNTHETIC FIXTURES — not DataMoon data. Invented ids/names/emails (example.test) for testing the pipeline
 * without credentials. Topic names are illustrative hypotheses, NOT confirmed DataMoon topic ids.
 */
import type { CreditStatus, FeedSummary, Topic } from "./types";

export const FIXTURE_LABEL = "Synthetic fixture — not real DataMoon data";

export const fixtureTopics: Topic[] = [
  { kind: "b2c", id: "fx-b2c-3001", name: "Bathroom remodeling and refresh (hypothesis)", category: "Home & Garden", synthetic: true },
  { kind: "b2c", id: "fx-b2c-3002", name: "Tile and grout cleaning (hypothesis)", category: "Home & Garden", synthetic: true },
  { kind: "b2c", id: "fx-b2c-3003", name: "Marble and natural stone care (hypothesis)", category: "Home & Garden", synthetic: true },
  { kind: "b2c", id: "fx-b2c-3004", name: "Home improvement contractors (hypothesis)", category: "Home & Garden", synthetic: true },
  { kind: "b2b", id: "fx-b2b-4001", name: "Facilities management (hypothesis)", category: "Real Estate", synthetic: true },
  { kind: "b2b", id: "fx-b2b-4002", name: "Commercial floor care and janitorial (hypothesis)", category: "Business Services", synthetic: true },
  { kind: "b2b", id: "fx-b2b-4003", name: "Hospitality property operations (hypothesis)", category: "Hospitality", synthetic: true },
];

export const fixtureFeeds: FeedSummary[] = [
  { id: "5ca7f1d0-1a2b-4c3d-8e9f-5c000000f001", description: "[SYNTHETIC] MA/FL consumers researching tile & stone restoration", output_type: "consumer", lookback_days: 14, export_row_limit: 5000, export_rows_used: 0, export_rows_remaining: 5000, created_at: "2026-11-01T00:00:00Z", synthetic: true },
  { id: "5ca7f1d0-1a2b-4c3d-8e9f-5c000000f002", description: "[SYNTHETIC] MA/FL facilities & property managers", output_type: "business", lookback_days: 14, export_row_limit: null, export_rows_used: null, export_rows_remaining: null, created_at: "2026-11-01T00:00:00Z", synthetic: true },
];
/** Feed owned by another brand — used to prove cross-brand feed injection is rejected. */
export const FOREIGN_FEED_ID = "5ca7f1d0-1a2b-4c3d-8e9f-5c000000dc01";

export const fixtureCredits: CreditStatus = { record_limit: 10000, records_used: 0, remaining: 10000, reset_period: "lifetime", synthetic: true };

const hex = (n: number) => n.toString(16).padStart(16, "0");
/** Deterministic synthetic export rows (documented default columns + ext-style fields). */
export function fixtureRows(n = 6): Record<string, string>[] {
  const states = ["ma", "fl", "ma", "fl", "ny", "fl"];
  const zips = ["02116", "33480", "02139", "33301", "10001", "33432"];
  return Array.from({ length: n }, (_, i) => ({
    contact_id: `id_${hex(0xa11ce000 + i)}`,
    md5: "", sha1: "", sha2: "",
    match_confidence: i % 2 ? "probabilistic" : "deterministic",
    first_name: `Test${i + 1}`, last_name: "Synthetic",
    personal_emails: `prospect${i + 1}@example.test`,
    personal_state: states[i % states.length], personal_zip: zips[i % zips.length], contact_country: "US",
  }));
}
