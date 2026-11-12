# CRM mapping, funnel events and campaign naming (Build 04 §3–§5)

## 1. GHL pipelines (exact spec stages)
Code: `src/lib/crm/sync.ts → PIPELINES`. Stage ids come from env vars (`GHL_<MKT>_STAGE_<RES|COM>_<STAGE>`; the full list is in `.env.example`).

| Pipeline | Stages |
|---|---|
| Residential (homeowner, condo, renter, landlord-own-home) | New → Photos requested → Photos received → Qualified → Estimate visit → Proposal → Won / Lost → Scheduled → Completed |
| Commercial (facilities, hospitality, education, healthcare, property portfolios / PMs) | Inbound/outreach → Facility qualified → Site walkthrough → Scope → Bid/proposal → Awarded → Scheduled → Closeout → Recurring program |

**Entry stage:**
- Residential with photos → *Photos received*.
- Residential without photos → *New*. The `photos_missing` workflow asks for photos and the BDR moves the lead to *Photos requested*.
- Commercial → *Inbound/outreach*.
- Property managers / landlord portfolios go to the commercial pipeline with the tag `segment:property-portfolio`, so residential and commercial stay separable.

## 2. Geography teams
| Team | Markets / zones | Env | Status |
|---|---|---|---|
| Boston / Greater Boston (`greater-boston`) | All MA zones | `GHL_LOCATION_ID_BOSTON`, `GHL_BOSTON_TEAM_USER_ID`, `GHL_BOSTON_CALENDAR_RESIDENTIAL/_COMMERCIAL` | Live |
| Palm Beach / Broward (`palm-beach-broward`) | Southeast Florida zones | `GHL_LOCATION_ID_FL`, `GHL_FL_TEAM_USER_ID`, `GHL_FL_CALENDAR_RESIDENTIAL/_COMMERCIAL` | Pre-launch: waitlist, never auto-book |

- Routing is by ZIP (`src/lib/leads/routing.ts`) and adds the tags `team:<id>`, `market:<id>` and `zone:<id>`.
- The opportunity is assigned to `GHL_<MKT>_TEAM_USER_ID` when set.
- An out-of-area ZIP gets `team:unassigned` and the out-of-area reply.

## 3. Synced fields (case-safe, no free-text PII beyond the contact record)
| Field | Content |
|---|---|
| sc_location | City · ZIP · market |
| sc_team | geography team id |
| sc_material | ceramic / porcelain / marble / granite / travertine / other (commercial: floor and wall materials list) |
| sc_area | approximate area band (commercial: sq ft) |
| sc_service | requested treatments: cleaning, color_seal, regrout, recaulk, polish_hone, topical_finish |
| sc_budget | budget band |
| sc_lead_score | 0–100 score (plus `score:` and `tier:` tags) |
| sc_campaign | utm_campaign (last touch, falling back to first) |
| sc_status | entry stage, updated by GHL afterwards |
| sc_approver_role / sc_approval_verified | renter's stated approver. `sc_approval_verified` is always **false** from the website: a renter's statement is never treated as approval |
| sc_walkthrough_requested / window / constraints | commercial walkthrough + operational constraints |

SMS and marketing opt-outs: `sc_sms_consent` and `sc_marketing_consent` are synced, and workflows must branch on them.

## 4. Follow-up workflows (built inside GHL; ids in env)
| Hook | Trigger | Content |
|---|---|---|
| new_lead | every lead | acknowledgement and owner alert |
| hot_lead | tier hot | **fast response**: call task within 5 business minutes, missed-call text-back (SMS consent only) |
| photos_missing | residential without photos | request 3–4 photos |
| renter_landlord | renter | help with landlord / PM approval |
| property_manager / commercial | PM / commercial | walkthrough booking + capabilities |
| prelaunch_waitlist | Florida | launch list, no booking |
| **estimate_follow_up** | stage Proposal / Bid/proposal | day 2 / 5 / 10, stops on reply |
| **reactivation** | stage Completed / Closeout | care tips, then a 12-month reseal / repeat-restoration reminder (marketing permission only) |
| nurture / out_of_area | cold / out of area | education / polite decline |

## 5. Funnel events (spec §4)
| Event | Fired by | GA4 | Meta | Google Ads | Dedup key |
|---|---|---|---|---|---|
| assessment_start | browser, first form interaction | ✓ | n/a | n/a | one per form view |
| photos_received | browser on upload (count only) + CRM stage *Photos received* | ✓ | n/a | n/a | `crm_<contact>_photos_received` |
| qualified_lead | CRM stage Qualified / Facility qualified | ✓ | QualifiedLead | qualified_lead | `crm_<opp>_qualified_lead` |
| commercial_walkthrough_booked | CRM stage Site walkthrough | ✓ | Schedule | commercial_walkthrough_booked | `crm_<opp>_…` |
| estimate_sent | CRM stage Proposal / Bid/proposal | ✓ | EstimateSent | estimate_sent | `crm_<opp>_estimate_sent` |
| job_won | CRM stage Won / Awarded (+ value) | ✓ | Purchase | job_won | `crm_<opp>_job_won` |
| completed_revenue | CRM stage Completed / Closeout (+ value) | ✓ | CompletedRevenue | completed_revenue | `crm_<opp>_completed_revenue` |

- The lead itself still fires `generate_lead` (browser + server, shared `event_id`).
- **Consent:** browser pixels load only after consent; server events carry the consent state captured at lead time, and Meta/Google user data is only sent when `ad_user_data` was granted.
- **Click IDs and UTMs** (gclid, gbraid, wbraid, fbclid, msclkid, openai_oppref, plus first and last touch UTMs) are stored with the lead and joined at revenue time.
- **Photos never go to pixels.** Only a count is sent; photo URLs stay in Supabase/GHL.
- **Revenue reporting** (`/api/admin/revenue?basis=completed|won`) keeps booked (job_won) separate from delivered (completed_revenue), so nothing is double counted.

## 6. Campaign naming
`SC_<MKT>_<CHANNEL>_<TRACK>_<THEME>_<GEO>_<YYYYMM>`
- **MKT:** BOS or SFL. **CHANNEL:** GADS, META, DM (DataMoon pilot), AL (AudienceLab pilot), LI. **TRACK:** RES or COM.
- **UTMs:**
  - `utm_source` = google / meta / datamoon / audiencelab
  - `utm_medium` = cpc / paid_social / display
  - `utm_campaign` = the campaign name lower-cased, e.g. `sc_bos_gads_res_grout-cleaning_metro_202612`
  - `utm_content` = creative version id (docs/22)
  - `utm_term` = keyword

**Google Search:** separate Boston and SFL campaigns and landing pages, each with its own geo, budget and conversion actions.
| Campaign | Ad groups / keywords | Landing |
|---|---|---|
| SC_BOS_GADS_RES_GROUT_METRO | grout cleaning boston, grout cleaning near me, grout color sealing, tile grout color seal | /boston → /services/grout-color-sealing |
| SC_BOS_GADS_RES_SHOWER | shower regrouting, shower caulking, shower tile restoration | /services/shower-restoration |
| SC_BOS_GADS_RES_STONE | marble polishing near me, marble restoration, stone countertop sealing | /services/marble-stone-restoration |
| SC_BOS_GADS_COM_FACILITIES | commercial tile and grout restoration, restroom regrouting, lobby floor restoration | /commercial |
| SC_SFL_GADS_RES_* (pre-launch) | same themes + Palm Beach / Broward / Boca / Fort Lauderdale geo modifiers | /south-florida (waitlist) |

**Brand safety:** negative keywords for franchise / competitor brand names (e.g. "sir grout", "grout doctor"); no franchise wording in ads.

**Meta:** BOS and SFL ad sets separate.
- Themes: C1 grout discoloration, C2 caulk restoration, renter bathroom refresh (approved copy only), luxury shower renewal, C3 marble.
- Commercial outreach (property managers, facilities) is its own campaign: `SC_BOS_META_COM_PM_*`.

**DataMoon / AudienceLab:** these are **pilots**, not installed integrations.
- Test homeowner/condo intent audiences by geography and commercial facility/management buyer audiences.
- Suppress existing customers where legal.
- Check audience quality: match rate, and spot-check 20 records per segment.
- No clinical, health or sensitive inferred targeting.
- Report them in separate campaigns (`SC_BOS_DM_*`, `SC_BOS_AL_*`).

## 7. /admin status (spec §5)
| Page | Status | Notes |
|---|---|---|
| /admin/dashboard | Operational | lead + conversion logs; durable only with Upstash |
| /admin/scheduling | Prototype | zone/slot logic; not wired to GHL team calendars |
| /admin/pricing | Prototype | draft price sheets (approved: false); never customer-facing |
| /admin/workorder | Prototype | step library unvalidated ("Field-ready: NO") |
| /admin/room-scan | Prototype | off unless ROOM_SCAN_ENABLED |

**Security:**
- Middleware pre-check at the edge (no credential → redirect or 401).
- Authoritative `isAdmin()` check (HMAC session cookie or bearer `ADMIN_TOKEN`, timing-safe) in every page and API route.
- Login is rate-limited.
- Audit log (`audit` list: action and timestamp only, no customer data).
- noindex and no-store on every admin and API route.

**Storage guard:**
- On `VERCEL_ENV=production`, `LEAD_ALLOW_MEMORY_STORE` and `ALLOW_LOCAL_UPLOADS` are **ignored**.
- Without Upstash, lead intake returns 503, and `/api/health` reports `blocked` plus `production_override_ignored`. Without Supabase, uploads are blocked.
- Preview/staging may still use in-memory storage for testing.

> ⚠ Owner action before the next production deploy: the Vercel project currently sets `LEAD_ALLOW_MEMORY_STORE=1` for production as well. With this code, production lead intake will (correctly) **block** until Upstash Redis (`UPSTASH_REDIS_REST_URL/TOKEN`) and Supabase Storage are configured.
