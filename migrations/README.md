# Database migrations (StoneCraft)

The deployed app persists through `src/lib/store.ts` / `src/lib/server/kv.ts` (Upstash Redis REST when `UPSTASH_REDIS_REST_URL`/`TOKEN`
are set; process memory otherwise — **not durable**, flagged in Ops › Integrations, and production ops writes fail closed without Upstash).
Private files (walkthrough media, ops documents, proposal exports) use a Supabase **private** bucket when `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` are set, otherwise a local temp-dir sandbox (not durable).

`0004_phase4_stonecraft.up.sql` describes the same Phase 4 objects for Postgres/Supabase: leads, FL ZIP overrides, guided walkthroughs
(token hashes only, versioned measurements, media, corrections), owner rate books (rates NULL = blank), proposals (revision-bound approval,
private exports, "sent externally" record), ops projects/documents, CRM outbox, append-only audit log, suppressions and DataMoon vendor
tables — all brand-scoped with RLS. Apply with `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 0004_phase4_stonecraft.up.sql`; roll back with
the `.down.sql` file. Additive only: no Phase 2/3 object is altered.
