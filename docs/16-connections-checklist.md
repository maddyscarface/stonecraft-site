# 16 — Administrator Setup: Every Connection Still Required

Nothing below is connected yet. In the sandbox every integration ran in dry-run/in-memory mode. All secrets go in Vercel environment variables (Production + Preview separately) — never in the repo.

| # | System | What to create | Env vars | Verify |
|---|---|---|---|---|
| 1 | **Domain/DNS** | Point `stonecraftboston.com` to Vercel; decide FL domain | `NEXT_PUBLIC_SITE_URL` | HTTPS, canonical URLs |
| 2 | **Vercel** | Project from repo, Node 20+, region iad1 | — | Build passes |
| 3 | **Upstash Redis** | Database (US-East) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Admin dashboard shows "Upstash" |
| 4 | **Supabase Storage** | Private bucket `assessment-photos`; no public policy | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PHOTO_BUCKET` | Upload on staging; link opens from GHL note |
| 5 | **GoHighLevel** | 2 locations, pipelines, custom fields, calendars, workflows W1–W12 (docs/08), Private Integration token | `GHL_PRIVATE_TOKEN`, `GHL_LOCATION_ID_BOSTON`, `GHL_LOCATION_ID_FL`, `GHL_BOSTON_PIPELINE_*`, `GHL_BOSTON_STAGE_*`, `GHL_FL_*` | docs/08 testing checklist |
| 6 | **A2P 10DLC** | Brand + campaign per location (consent language matches the form) | — | SMS deliverability |
| 7 | **Resend** | Verify sending domain (SPF/DKIM) | `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_TO_BOSTON`, `NOTIFY_TO_FL` | Owner alert + auto-reply received |
| 8 | **GTM** | Web container, tags per docs/12 | `NEXT_PUBLIC_GTM_ID` | Preview mode |
| 9 | **GA4** | Property, `market` custom dimension, key events, MP API secret | `GA4_MEASUREMENT_ID(_BOSTON/_FL)`, `GA4_API_SECRET(_BOSTON/_FL)` | DebugView |
| 10 | **Google Ads** | Accounts per market, conversion actions (Lead primary; qualified/won offline), enhanced conversions on, link GA4 | (in GTM) | Tag Assistant; CSV upload test |
| 11 | **Meta** | Business Manager, ad account per market, **one shared dataset/pixel** (custom conversions filtered by `market`), CAPI access token, domain verification | `NEXT_PUBLIC_META_PIXEL_ID`, `META_PIXEL_ID` (same value), `META_CAPI_TOKEN`, `META_TEST_EVENT_CODE` (staging only) | Test Events dedup |
| 12 | **Search Console** | Domain property; submit sitemap | — | Coverage report |
| 13 | **Call tracking** | Numbers per market (GHL LC Phone); optional per-channel numbers | `NEXT_PUBLIC_PHONE_BOSTON(_DISPLAY)`, `NEXT_PUBLIC_PHONE_FL(_DISPLAY)` | Calls land in GHL with source |
| 14 | **Cloudflare Turnstile** (optional, recommended once spam appears) | Site + secret keys; add widget to form | `TURNSTILE_SECRET_KEY` (+ site key in form) | Bot test |
| 15 | **CRM webhook** | Long random secret; GHL workflow W7 | `CRM_WEBHOOK_SECRET` | 200 on test stage change |
| 16 | **Admin** | 32+ char random token | `ADMIN_TOKEN` | `/admin` login |
| 17 | **Room scan beta** (optional) | Anthropic API key | `ROOM_SCAN_ENABLED=true`, `ANTHROPIC_API_KEY`, `ROOM_SCAN_MODEL` | Accuracy study (docs/10) |
| 18 | **Florida market switch** | Only after Gate G1 | `MARKET_FL_STATUS=live` | FL pages indexable, in sitemap |
| 19 | **Consent default** | Counsel decision | `NEXT_PUBLIC_CONSENT_DEFAULT=granted|denied` | Banner behaviour |
| 20 | **GBP / citations** | docs/11 | — | Profiles verified |

## Security notes
- Rotate `GHL_PRIVATE_TOKEN`, `META_CAPI_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` on staff changes.
- Service-role key is server-only (never `NEXT_PUBLIC_`).
- Admin is a stop-gap single token; replace with SmartOps Supabase Auth roles (owner, BDR, tech) in Phase 1.
- Lead log in KV contains limited PII (no email/phone stored in the log record; contact data lives in GHL). Dead-letter entries do contain the full lead — review and clear after recovery.
