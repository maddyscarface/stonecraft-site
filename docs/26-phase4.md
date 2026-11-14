# Phase 4 — Southeast Florida live, guided walkthrough, private estimator, ops admin, DataMoon, AR contracts

Status: staging only (`stonecraft-staging.vercel.app`, noindex). Production untouched. All vendor/AR flags OFF.

## 1. Southeast Florida (owner-confirmed LIVE)
- `src/config/markets.ts`: FL is `live`. The Phase 2 switch `MARKET_FL_STATUS` is retired and ignored — the Vercel
  project still has `MARKET_FL_STATUS=pre-launch` on Production + Preview (one shared variable); remove it when Phase 4
  is promoted (Ops › Integrations shows `legacyFlStatusEnvIgnored`). Emergency kill switch: `MARKET_FL_PAUSED=true`
  (restores the old notice, noindex, sitemap exclusion and "do not book" CRM flags without a code change).
- One editable list drives everything: `src/config/florida-areas.ts` (`FL_COUNTIES`, `FL_AREA_CITIES`). Every city
  has `ownerConfirmed: false` and an admin note until the owner confirms the exact cities (Jupiter: "only if
  operationally served"). Edit the list → county pages, city pages, sitemap, llms.txt, schema `areaServed`, routing
  and the admin Service-areas tab all follow.
- Pages: `/south-florida/palm-beach-county`, `/south-florida/broward-county` (CountyPage) + 16 city pages, each with
  the lead form (`#get-started`), "Illustrative" labelled imagery, county-specific schema (Service + BreadcrumbList,
  `areaServed` AdministrativeArea), no licence/staffing/address claims, no prices.
- ZIP → market → county: ZIP3 in config + per-ZIP owner overrides (Ops › Service areas, KV `areas:zip-overrides`).
- GHL: FL leads go to the FL location/pipelines (`GHL_FL_*`), tags `region:southeast-florida`, `county:<id>`,
  `ghl-path:fl-residential|fl-commercial`, custom field `sc_county`; analytics `generate_lead` carries `county`.

## 2. Guided mobile walkthrough (`/walkthrough`; `WALKTHROUGH_ENABLED` on unless "false"; self-start opt-in `WALKTHROUGH_SELF_START=true`)
- Templates (`src/config/walkthrough-templates.ts`): shower (overview, pan, each wall, grout, caulk, leaks), floors
  (per room, tile type, joint condition, transitions, problems), stone (overview, each run/island, edges, etch/stain),
  commercial (property, each restroom/lobby/corridor, closure constraints & safety).
- Invite links are created by staff (Ops › Walkthroughs), shown once, never sent by the system. Tokens: 256-bit,
  SHA-256 hash stored only, expiring, revocable, not consumed by GET; travel in the URL fragment then a header;
  page is noindex/no-store/no-referrer. Optional self-start from the thank-you page (`WALKTHROUGH_SELF_START`).
- Uploads: signed PUT → magic-byte MIME check → JPEG/PNG/WebP metadata stripped server-side (client also re-encodes
  on canvas); HEIC/video metadata cannot be stripped server-side and is flagged "metadata retained" for staff.
  IndexedDB queue + retries resume after a dropped connection (true chunked/TUS resumable upload is a follow-up).
  A per-walkthrough KV lock serialises parallel writes.
- Measurements: ft/in or m/cm, "I don't know" and "estimate" flags, normalised to mm/m², versioned (staff
  corrections need a reason). Measurements never carry prices.
- Escalations (leak, loose/hollow tile, stone uncertainty, safety-sensitive commercial work) → suggested outcome:
  ready for remote quote / targeted follow-up / live video walkthrough / site check. Staff set the final outcome.
- Corrections: staff send steps back with a note; the customer sees it on the same link and resubmits.
- Public responses go through `publicView` (allowlist test in `tests/phase4-walkthrough.test.ts`).

## 3. Private estimator (Ops › Estimator)
- Owner-only rate books per region (Boston / SE Florida) × service × surface; ship blank (NULL). Optimistic
  versioning. No customer-visible prices anywhere (public price ranges, typical ranges and budget bands removed;
  commercial form uses budget status, not dollar brackets; roommate splitter has no pre-filled price).
- Proposals: manual lines or fill-from-rate-book; total stays blank until every line is priced; stale-revision
  protection; owner approval bound to a revision (any edit clears it); owner-only private DOCX/PDF export to the
  private store with signed short-lived links; "marked sent externally" is a manual record. There is no send path.

## 4. Ops admin (`/admin/ops`)
Roles owner, manager, marketer, estimator, operator, legal_reviewer, read_only (deny by default; `OPS_STAFF_JSON`
with token SHA-256; ADMIN_TOKEN = owner). Tabs: overview, records (search, market/county filters, PII masking,
CSV allowlist + formula guard), projects (tasks, notes, links, private documents), walkthroughs, estimator,
service areas, CRM outbox (retry/idempotency), DataMoon, opt-outs, reports (market/county/source/month,
walkthrough outcomes, proposal status; values owner-only), staff, AR (disabled), integrations health, hash-chained
audit log. Without Upstash the store is process memory (flagged; not durable on serverless).

## 5. DataMoon (flags OFF, synthetic fixtures only)
Same adapter as BuildGhana, adapted: markets `boston` (MA) and `south-florida` (FL, Palm Beach/Broward ZIP3 only),
four recipe templates (Boston homeowners, Boston facilities, FL condo/stone owners, FL HOAs/hospitality),
prohibited-targeting guard (ethnicity, diaspora, protected traits), market-locked GHL destinations, owner approvals
for export and CRM sync, record ceiling/budget guards, webhook 404 while unset. API facts are UNVERIFIED.

## 6. Native AR adapters (disabled)
`src/lib/ar/contract.ts` defines capability, session, job correlation, status/webhook, normalised measurements
(accuracy always "unverified"), evidence, cancel and fallback (`manual_walkthrough`) for ARKit, RoomPlan, ARCore,
Hover and CubiCasa. Every adapter refuses; a flag alone yields `not_configured`; `/api/ar/webhook/*` is 404.

## 7. Persistence
`migrations/0004_phase4_stonecraft.{up,down}.sql` — additive Postgres/Supabase schema (parsed with pglast; not yet
applied to a live database).

## 8. Tests
`npm test` (vitest), `scripts/e2e.mjs`, `scripts/e2e-responsive.mjs`, `tests/e2e-chatgpt-ads`,
`tests/e2e-phase4/walkthrough.mjs` (375/390/768), `tests/e2e-phase4/admin-smoke.mjs`, `scripts/leak-scan.mjs`
(after `next build`: no dollar amounts or prelaunch copy in public HTML/JS).
