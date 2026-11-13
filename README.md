# StoneCraft — Multi-Market Acquisition Site + SmartOps Front End

Greater Boston and Southeast Florida tile, grout, shower and natural stone restoration: residential, renter, landlord and commercial acquisition, wired to GoHighLevel, server-side conversion tracking, and the shared engines SmartOps will run on (scheduling, pricing, work orders).

**Status:** built and tested in sandbox. No live accounts connected. Florida is `pre-launch` (noindexed) pending franchise counsel — read **docs/15** first.


## Preview and hosting package

- **Staging / review:** https://stonecraft-staging.vercel.app (noindex; production is unchanged at https://stonecraft-site-rho.vercel.app)
- **Run locally:** `npm ci --include=dev && cp .env.example .env.local && npm run dev`
- **Quality check:** `npm run typecheck && npm test && npm run build`
- **Host this build:** see [HOSTING.md](HOSTING.md) for Vercel upload, Netlify, a generic Node/pm2 VPS, and cPanel. A static HTML export is not supported — the site has API routes.

## What's here
| Area | Location |
|---|---|
| Site (Next.js 15, TS, Tailwind v4) | `src/app` — 70+ routes incl. 26 city pages, 5 commercial segments, 8 services |
| Config (edit here, not in pages) | `src/config` — `site.ts` (claims/flags), `markets.ts` (zones), `cities.ts`, `services.ts`, `segments.ts`, `pricing.ts`, `gallery.ts` (permissioned media + case studies), `resources.ts`, `capabilities.ts` |
| Lead engine | `src/components/LeadForm.tsx`, `src/app/api/leads`, `src/lib/leads/*` |
| Photo uploads | `src/components/PhotoUpload.tsx`, `src/app/api/uploads/*`, `src/lib/photos.ts` (Supabase) |
| CRM | `src/lib/crm/ghl.ts` (adapter, dry-run without token), `src/lib/crm/sync.ts` (ownership + dedupe), `src/app/api/crm/webhook` |
| Tracking | `src/components/Tracking.tsx`, `src/lib/tracking/client.ts` (consent, attribution, dataLayer, pixel), `src/lib/tracking/server.ts` (CAPI, GA4 MP) |
| SmartOps engines | `src/lib/scheduling`, `src/lib/pricing`, `src/lib/workorder` (pure, unit-tested) |
| Admin | `/admin` → dashboard (exec/ops), scheduling, pricing & quotes, work orders, room scan beta |
| Downloads | `public/downloads/landlord-approval-request.docx`, `stonecraft-commercial-capabilities.pdf` (regenerate: `python3 scripts/build-assets.py`) |
| Tests | `tests/engines.test.ts` (24), `scripts/e2e.mjs` (56 checks) |

## Docs
01 Brand system · 02 Site architecture · 03 Funnels · 04 Meta campaigns (MA/FL, copy ×5 per segment, briefs, UGC, scripts) · 05 Google Search (keywords, intent, negatives, RSAs, mapping, budgets, retargeting) · 06 Intent data & ABM · 07 Commercial outbound playbook · 08 GoHighLevel setup & automation · 09 SmartOps integration architecture · 10 AI estimating & work orders · 11 SEO/AEO + 20 blog briefs · 12 Tracking plan · 13 Dashboards · 14 Pricing & revenue logic · **15 Claims register & launch gates** · 16 Connections checklist · 17 90-day plan · 18 QA & deploy

## Quick start
```bash
npm install
cp .env.example .env.local
npm run dev
npm test && npm run typecheck && npm run build
```

## Implementation checklist
1. [ ] Clear launch gates G1–G8 (docs/15)
2. [ ] Connect systems in docs/16 order (Vercel → Upstash → Supabase → Resend → GHL → GTM/GA4/Ads/Meta)
3. [ ] Build GHL pipelines/fields/workflows (docs/08); paste stage IDs into env
4. [ ] Approve pricing (`/admin/pricing`, docs/14)
5. [ ] Replace phone numbers; verify trust claims (`src/config/site.ts`)
6. [ ] Validate work-order step library with StoneCraft's own SOP (docs/10)
7. [ ] Seed gallery with permissioned photos; enable reviews when real (`flags.showReviews`)
8. [ ] Run staging test protocols (docs/08, docs/12) → deploy production
9. [ ] Launch Boston Search + Meta at Test budgets (docs/04, 05); start commercial ABM (docs/06, 07)
10. [ ] Follow docs/17; begin SmartOps Phase 1 (docs/09)
