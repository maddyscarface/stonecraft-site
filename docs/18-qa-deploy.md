# 18 — QA, Testing & Deployment

## Verified in the build sandbox (2026-11-02)
- `npm run typecheck` — clean (TypeScript 5.9; Next 15.5 is not compatible with TypeScript 7's tsconfig handling — keep TS 5.x pinned).
- `npm test` — 24 unit tests: scheduling (zones, weekdays, timezone, flex holds/release, booked/past slots, FL peak season, priority override, conflicts, off-day block, gap warnings), pricing (min charges, ZIP modifiers, deposits, commercial custom, volume, customer view stripping, roommate split to the cent), work orders (conditions, no pricing leak, qty rules, qualification gaps, epoxy block), leads (validation, landlord-detail stripping, honeypot, routing, scoring, ZIP fallback), CRM keys, GHL payload, CAPI hashing.
- `npm run build` — 70+ routes (26 city pages, 8 service, 5 commercial segments, 3 articles).
- `npm run e2e` — 56 checks (Playwright): all pages 200 with H1; FL noindex; canonical; no AggregateRating; sitemap/robots; residential flow with photo upload → lead → thank-you; exactly one `generate_lead` with shared event_id; no fire on reload; UTM+GCLID persisted; roommate calculator; renter API + idempotent duplicate; invalid commercial rejected; FL lead tagged pre-launch; commercial UI flow with segment prefill → hot tier; admin API blocked without token; admin quote/schedule/dashboard; zero console errors.

## Not verified (requires real accounts)
GHL live writes · Supabase uploads · Resend delivery · Meta CAPI/Test Events · GA4 MP · Google Ads tags/offline import · GTM container · Turnstile · domain/SSL · Vercel deploy · room scan model calls.

## Run locally
```bash
npm install
cp .env.example .env.local   # fill what you have; everything else runs in dry-run
npm run dev                  # http://localhost:3000
npm test
npm run build && ALLOW_LOCAL_UPLOADS=true ADMIN_TOKEN=<24+ chars> npx next start -p 3100
ADMIN_TOKEN=<same> npm run e2e   # needs Playwright + Chromium
python3 scripts/build-assets.py  # regenerate .docx/.pdf/og.png after copy edits
```

## Deploy (Vercel)
1. Import repo → Framework: Next.js → Node 20.
2. Add env vars (docs/16) for Preview and Production separately; staging uses `META_TEST_EVENT_CODE`.
3. Deploy preview → run docs/08 + docs/12 test protocols → promote.
4. Add domain; set `NEXT_PUBLIC_SITE_URL`; submit sitemap in Search Console.

## Pre-launch checklist
- [ ] Gates G1–G8 cleared or consciously deferred (FL stays pre-launch)
- [ ] Phone numbers and emails real in env
- [ ] `verified` flags reflect documents on file; founder credentials checked
- [ ] Privacy/terms reviewed by counsel
- [ ] Price sheet approved
- [ ] Gallery: only permissioned photos
- [ ] Lighthouse mobile: Performance ≥85, SEO ≥95, Accessibility ≥90 (run on production URL)
- [ ] Test submissions from iOS Safari and Android Chrome with real photos (HEIC from iPhone)
- [ ] Consent banner: accept/decline paths
- [ ] Dead-letter queue empty; owner alert email received
