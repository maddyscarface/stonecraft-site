# 08 — GoHighLevel CRM Setup & Automation

## Locations
One GHL **sub-account per market** (`StoneCraft Boston`, `StoneCraft SE Florida`) under the agency account. Separate phone numbers, calendars, A2P 10DLC brand/campaign, email sending domains, pipelines and reporting. The site routes by ZIP to the right location (`GHL_LOCATION_ID_BOSTON` / `_FL`).

## Private Integration token
Settings → Private Integrations → create token with scopes: contacts (read/write), opportunities (read/write), notes (write), calendars (read/write), workflows (read). Store as `GHL_PRIVATE_TOKEN` in Vercel (never in code). Rotate quarterly.

## Pipelines (create in each location; copy stage IDs into env)
**Residential** — New Lead → Photos Requested → Photos Received → Qualified → Estimate Scheduled → Proposal Sent → Won → Job Scheduled → Work Complete → Paid → Review
**Commercial** — Target Account → Contact Identified → Outreach Started → Meeting Booked → Site Walk → Scope Development → Proposal → Procurement/Approval → Contract → Work Scheduled → Completed → Renewal
**Property Managers** — Partner Lead → Portfolio Review → Pilot Unit → Approved Vendor → Recurring Work → Expansion

Env pattern: `GHL_BOSTON_PIPELINE_RESIDENTIAL=…`, `GHL_BOSTON_STAGE_PHOTOS_RECEIVED=…` (stage name upper-snake). Web leads enter at: residential → *Photos Received* if photos else *New Lead*; commercial → *Contact Identified*; PM → *Partner Lead*.

## Custom fields (contact) — key → type
`sc_external_id` text · `sc_market` dropdown(boston, south-florida) · `sc_zone` text · `sc_customer_type` dropdown · `sc_lead_score` number · `sc_lead_tier` dropdown(hot,warm,cold) · `sc_source_page` text · `sc_photo_count` number · `sc_photo_links` large text · `sc_surfaces` text · `sc_utm_source/medium/campaign` text · `sc_gclid` text · `sc_fbclid` text · `sc_fbc` text · `sc_fbp` text · `sc_ga_client_id` text · `sc_landing_page` text · `sc_sms_consent` checkbox · `sc_event_id` text
Renter: `sc_roommates` number · `sc_landlord_approval` dropdown(not_asked, asked, approved, declined) · `sc_landlord_outreach_consent` checkbox · `sc_landlord_name` text · `sc_landlord_contact` text
Landlord: `sc_units` number · `sc_is_pm` checkbox · `sc_turn_date` date · `sc_property_type` dropdown
Commercial: `sc_segment` dropdown · `sc_buildings` number · `sc_restrooms` number · `sc_square_feet` number · `sc_surface_types` text · `sc_access_restrictions` large text · `sc_work_hours` dropdown · `sc_budget` dropdown · `sc_procurement` dropdown · `sc_decision_role` dropdown · `sc_decision_maker` text · `sc_timeline` dropdown

Tags written by the site: `market:*`, `type:*`, `variant:*`, `pipeline:*`, `zone:*`, `tier:*`, `photos:received|none`, `segment:*`, `renter:landlord-outreach-authorised`, `sms:opt-in|no-consent`, `market:pre-launch`.

## Calendars
Per zone (Round Robin or BDR-owned): `Estimate — Inner Core (Mon, Thu flex)`, `Estimate — West (Tue, Thu flex)`, `Estimate — North (Wed, Mon flex)`, `Estimate — MetroWest (Thu, Tue flex)`; FL zones likewise. Slots 10:00/11:30/13:00/14:30, 45-min, buffer 15. Separate **Commercial Site Walk** (60–90 min, any weekday, owner approval) and **Virtual Consult** (20 min, Zoom/Google Meet). Job calendars live in SmartOps once live; until then a `Jobs` calendar per tech.

## Workflows
| # | Trigger | Actions |
|---|---|---|
| W1 Speed-to-lead | Contact tag added `variant:*` (web lead) | If `sms:opt-in`: SMS "Hi {first}, it's StoneCraft—got your request{ and photos}. We'll reply today." · Email confirmation (site already sends one; disable here if duplicate) · Assign by round robin within market · Task: call within business hour · Internal SMS/email to owner if `tier:hot` |
| W2 Photo request | Stage = New Lead and `photos:none` | Wait 4h → SMS/email with upload link `/free-assessment?zip={zip}` (or reply-with-photos) · wait 24h → reminder · wait 3d → move to Photos Requested + BDR task |
| W3 Photos received | Stage → Photos Received | Notify BDR; create review task; offer virtual consult if scope is clear |
| W4 Renter approval | Tag `renter:landlord-outreach-authorised` | Task "Confirm with renter before contacting landlord" → on confirm, send approval email to landlord (template below) → wait 3d → follow-up → update `sc_landlord_approval` |
| W5 Quote follow-up | Stage → Proposal Sent | +48h email · +4d SMS (consented) · +7d call task · +14d "close the loop" |
| W6 Booking confirmation | Appointment booked | Confirmation + .ics, prep instructions, reminder 24h & 2h (SMS if consented) |
| W7 Conversion feedback | Opportunity stage changes to Qualified / Estimate Scheduled / Site Walk / Won / Contract / Paid | **Webhook** POST `https://{site}/api/crm/webhook` header `x-sc-webhook-secret`, body: `{stage, market, value, contactId, opportunityId, email, phone, firstName, lastName, zip, gclid, fbc, fbp, gaClientId}` (map custom fields) |
| W8 Review request | Stage → Paid | +2 days: SMS/email with direct GBP review link; +5 days reminder; stop on click |
| W9 Lost re-engagement | Stage → Lost (reason captured) | +90 days nurture email; exclude `landlord declined` |
| W10 Commercial sequences | Tag `seq:hospital` etc. | docs/07 sequences, stop on reply/meeting booked |
| W11 Pre-launch hold | Tag `market:pre-launch` | Do **not** auto-book; notify owner; send "confirming availability" email |
| W12 Opt-out hygiene | Reply STOP / unsubscribe | Set DND channel; tag `dnd:*`; remove from all sequences |

### Landlord approval email (W4)
Subject: *Approval request — bathroom surface refresh at {address}*
> Hello {landlord_name}, your tenant {first_name} {last_name} at {address} has asked StoneCraft to perform a non-structural refresh of the existing bathroom surfaces: cleaning, grout sealing and caulk replacement. No tile, plumbing or structural work is involved. The written scope is attached, along with a one-page approval form. We provide a certificate of insurance on request. Could you reply "approved" or return the signed form? Questions: {market_phone}. — StoneCraft

## Lead scoring
Site computes the score (editable via `/api/admin/config` key `scoring`) and writes `sc_lead_score`/`sc_lead_tier`. In GHL use tier for routing and SLA; optionally add GHL's native scoring for engagement (email opens/clicks).

## Quotes & payments
Until SmartOps payments are live: GHL Estimates/Invoices with Stripe connected per location; deposit rules from docs/14. **When SmartOps is live, disable GHL invoices** to avoid duplicate payment records — GHL then only receives stage updates (Paid) from SmartOps.

## Commercial account relationships
Use GHL **Companies**: one company per organisation; contacts associated (facility director, EVS, procurement). Opportunities attach to the primary contact and carry `sc_buildings`/`sc_restrooms`. For portfolios, one opportunity per property or program phase.

## Synchronisation with SmartOps (prevent duplicates)
| Object | Owner | Sync |
|---|---|---|
| Contact | GHL | SmartOps upserts by `sc_external_id` (hash of normalised email/phone) |
| Opportunity (pre-sale) | GHL | One open opportunity per contact per pipeline |
| Estimate appointment | GHL calendar → SmartOps mirror (Phase 1); SmartOps → GHL mirror (Phase 2) | Appointment id stored both sides |
| Job / work order / photos | SmartOps | GHL gets stage + job id |
| Payment | SmartOps (Stripe) | GHL gets Paid stage only |
| Review request | GHL | Triggered by Paid |
Idempotency: every cross-system write carries an idempotency key (`event_id` or `{external_id}:{object}:{stage}`).

## Testing checklist
1. Submit each form variant on staging → contact, tags, custom fields, note with photo links, opportunity at the right stage.
2. Re-submit same form → no duplicate contact or opportunity.
3. Move test opportunity to Qualified/Won → webhook 200, Meta Test Events shows event, `/api/admin/export` lists GCLID row.
4. STOP reply → DND set, sequences stop.
