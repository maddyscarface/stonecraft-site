# Phase 2 — StoneCraft handoff (branch `phase2-dev`)

Staging: https://stonecraft-staging.vercel.app (Vercel **preview** deployment, `noindex` via
`X-Robots-Tag`, robots `Disallow: /` and robots meta). Production (`stonecraft-site-rho.vercel.app`)
was not touched.

## What changed
- **Identity "Honed"**: basalt / bone / bronze palette, Cormorant Garamond display + Manrope body,
  square corners, tile monogram wordmark. Legacy token names are aliased so every route inherits it.
- **Photography**: 28 free-licensed Pexels photos (`src/config/photos.ts`, credits in
  `docs/20-photo-credits.md`). All are flagged `stock: true` and labelled "Illustrative photo"
  on the page; the footer states photography is licensed stock, not StoneCraft projects. The
  gallery shows no stock photos. Replace with real before/after photos when available.
- **Contact**: `info@stonecraftpros.com` everywhere (`NEXT_PUBLIC_CONTACT_EMAIL`). No phone number is
  shown and no `tel:` links render until a real number is set (`NEXT_PUBLIC_PHONE_BOSTON` / `NEXT_PUBLIC_PHONE_FL`,
  optional `_DISPLAY`; placeholder patterns such as 000-0000 are rejected).
- **Markets**: Boston live, Southeast Florida pre-launch (`MARKET_FL_STATUS`).

## Integrations: all inactive until the env vars are set
| Area | Behaviour without env | Activate with |
|---|---|---|
| GoHighLevel | Logs `[ghl:dry-run]` with the tags, pipeline/stage and follow-up plan; lead still stored | `GHL_PRIVATE_TOKEN`, `GHL_LOCATION_ID_BOSTON` / `_FL`, `GHL_<MKT>_PIPELINE_RESIDENTIAL/_COMMERCIAL`, `GHL_<MKT>_STAGE_<RES|COM>_<STAGE>` (full list in `.env.example`), `GHL_<MKT>_TEAM_USER_ID`, `GHL_<MKT>_CALENDAR_RESIDENTIAL/_COMMERCIAL`, `GHL_CUSTOM_FIELD_IDS` |
| Follow-up hooks | Planned only (returned in dry-run log) | `GHL_<BOSTON\|FL>_WORKFLOW_<HOOK>` (workflow IDs built inside GHL) |
| GTM / GA4 / Google Ads tag | Nothing loads | `NEXT_PUBLIC_GTM_ID`, or direct gtag `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL` |
| GA4 server (MP) | Off | `GA4_MEASUREMENT_ID`, `GA4_API_SECRET` |
| Meta Pixel + CAPI | Off | `NEXT_PUBLIC_META_PIXEL_ID`, `META_PIXEL_ID`, `META_CAPI_TOKEN` |
| OpenAI (ChatGPT) ads | Off; validate-only | `NEXT_PUBLIC_OPENAI_PIXEL_ID`, `OPENAI_ADS_*` |
| Google Ads offline conversions | Queued (`gads_offline`) instead of uploaded | `GOOGLE_ADS_DEVELOPER_TOKEN`, `_CLIENT_ID`, `_CLIENT_SECRET`, `_REFRESH_TOKEN`, `_CUSTOMER_ID`, `_CONVERSION_ACTIONS` (verify `GOOGLE_ADS_API_VERSION`) |
| Revenue attribution | Stored per lead (first + last touch, click IDs) for 400 days; won/paid CRM stages with a value create a revenue record | `/api/crm/webhook` + `CRM_WEBHOOK_SECRET`; read at `/api/admin/revenue` (admin token) |
| DataMoon / AudienceLab | Webhook returns 404, pixel never loads | `INTENT_PROVIDER`, `INTENT_WEBHOOK_SECRET`, `NEXT_PUBLIC_INTENT_ENABLED=true`, `NEXT_PUBLIC_INTENT_PIXEL_SRC`. Field names in `src/lib/intent/providers.ts` are marked VERIFY. Intent contacts are tagged `intent:no-auto-sms`. |
| Durable storage | In-memory (staging only) | Upstash/Supabase vars in `.env.example` |

All browser tags are consent-gated; ad tags respect Global Privacy Control.

## Tests
- `npm run typecheck`, `npm test` (53 unit tests incl. `tests/phase2.test.ts`), `npm run build`.
- `BASE_URL=https://stonecraft-staging.vercel.app node scripts/e2e-staging.mjs` (full lead flow,
  dedup, attribution, intent/admin guards). It submits QA leads, so never run it against production.
- `scripts/e2e.mjs` predates the estimate-qualifier (budget & visit) step; its photo-step selector no longer
  matches the form flow, so use `scripts/e2e-staging.mjs` for the full flow.

## Rollback
Staging: re-point `stonecraft-staging.vercel.app` to `dpl_5M4EzQFDRFSLKn9KKJUurhL8qjKs` (the
previous staging deployment). Code: `main` is untouched at `f5e7f61`.

## Owner inputs still needed
Phone numbers; GHL token, location IDs, pipelines/stages/workflows, custom field IDs; GTM/GA4/Ads/Meta
IDs; Google Ads API credentials; intent provider account and docs; confirmed price ranges; real
project photos; production domain (stonecraftpros.com) connection; Upstash/Supabase for durability.
