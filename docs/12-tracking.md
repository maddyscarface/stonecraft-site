# 12 — Conversion Tracking Plan

## Stack
GTM (web container) · GA4 (one property, `market` custom dimension; or one property per market if separate reporting is required by finance) · Google Ads (conversion tags via GTM + enhanced conversions + offline import) · Meta Pixel (browser) + Conversions API (server) · Google Search Console (domain property) · Consent Mode v2 · first-party attribution (localStorage 90 days) · call tracking (GHL/LC Phone numbers per market + per channel if needed).

## Event dictionary
| Event | Where fired | Params | GA4 | Google Ads | Meta |
|---|---|---|---|---|---|
| `page_view_sc` | every route change (client) | page_path, market | (use GA4 config page_view) | — | PageView |
| `view_service` | service pages | service | ✓ | — | ViewContent |
| `view_segment` / `view_assessment` / `view_commercial_assessment` | landing pages | segment | ✓ | — | ViewContent |
| `audience_select`, `service_selector`, `cta_click`, `phone_click` | interactions | location | ✓ | phone_click (secondary) | Contact (phone) |
| `form_start` | first field interaction | form_variant, source_page | ✓ | — | — |
| `form_step` | step advance | step | ✓ | — | — |
| `photo_upload_success` | each upload | count | ✓ | secondary | — |
| `generate_lead` | after `/api/leads` 200, once per event_id | event_id, form_variant, customer_type, market, lead_tier, photos, segment | ✓ key event | **primary** | Lead (browser, eventID) + **CAPI Lead** (server, same event_id) |
| `user_data_ready` | just before generate_lead (ad_user_data granted) | user_data {email, phone_number, address} | — | enhanced conversions | — |
| `appointment_booked` | CRM webhook (Estimate Scheduled / Site Walk) | value | MP ✓ | offline | Schedule (CAPI) |
| `qualified_lead` | CRM webhook (Qualified) | | MP ✓ | offline | QualifiedLead (CAPI custom) |
| `quote_sent` | CRM webhook (Proposal Sent) | value | MP ✓ | — | — |
| `job_won` | CRM webhook (Won / Contract) | value | MP ✓ | offline (value) | Purchase (CAPI) |
| `purchase` | CRM/SmartOps (Paid) | value | MP ✓ | offline | Purchase |

## Deduplication
- **Meta:** browser `fbq('track','Lead',…,{eventID})` and server CAPI share `event_id` = form's `lead_…` id. CRM events use deterministic `crm_{opportunity}_{event}` and a KV guard so retries never double-send.
- **GA4:** browser fires `generate_lead`; server MP is used only for CRM-stage events (never for generate_lead).
- **Google Ads:** one primary conversion per action; offline imports keyed by GCLID + conversion name + time.
- **Thank-you reload:** conversion is fired before redirect and guarded in `sessionStorage`; thank-you page fires nothing (E2E-tested).
- **Duplicate form submit:** `/api/leads` idempotency on event_id returns `duplicate: true`; client doesn't fire again.

## Consent
- Default from `NEXT_PUBLIC_CONSENT_DEFAULT` (`granted` for US opt-out model; set `denied` for opt-in). Global Privacy Control → ads denied.
- Banner: Accept / Decline advertising; "Your privacy choices" link in footer and privacy page resets.
- Consent Mode v2 `default` runs before GTM (`beforeInteractive`); `update` on choice. Meta pixel `consent grant/revoke`. Server CAPI skipped when the browser sent `adConsent: false`.
- Counsel to confirm the default for MA/FL and any state with opt-in requirements.

## Attribution persistence
Captured on landing: `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, landing page, referrer, first-seen; `_fbc` built from fbclid when cookie absent; `_fbp` read. Sent with every lead → GHL custom fields → returned in CRM webhooks → offline conversions. GA4 client id read from `_ga` on the server and stored for MP.

## GTM container (build list)
Tags: Google tag (GA4) · GA4 event — generate_lead (trigger CE `generate_lead`) with event params · GA4 events for the dictionary above · Google Ads conversion — Lead (CE `generate_lead`, enhanced conversions from `user_data` DL var) · Ads Conversion Linker · Ads remarketing (consent-gated) · Microsoft UET (optional).
Variables: DLV `event_id`, `market`, `form_variant`, `lead_tier`, `user_data`.
Triggers: Custom Event per dictionary.
Separate MA/FL: either one GA4 property with `market` dimension and Ads conversion actions per account, or GTM lookup table `market → Ads conversion ID/label`.

## Test protocol (staging and production)
1. GTM Preview: each event fires once with params.
2. GA4 DebugView: `generate_lead` once per submit; market dimension populated.
3. Meta Events Manager → Test Events (`META_TEST_EVENT_CODE`): browser + server Lead with same event_id show as **deduplicated**.
4. Google Ads: Tag Assistant shows conversion + enhanced-conversion user data (hashed by Google tag).
5. Consent: decline advertising → no Meta network calls, Ads tags in denied mode, CAPI skipped.
6. CRM webhook: move test opportunity → events in Meta Test Events + GA4 Realtime + `/api/admin/export` CSV row.
7. Reload thank-you; resubmit same form → no extra conversions.
