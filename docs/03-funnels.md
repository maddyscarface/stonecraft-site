# 03 — Funnels (Residential · Renter · Landlord · Hospital · University · Hospitality/HOA)

Each funnel = ad/entry → landing page → qualification → CRM pipeline → booking → job → review/renewal. Pipelines are in docs/08.

## 1. Residential (homeowners)
**Entry:** Meta (shower, grout, marble, pre-sale), Google Search (service + city), organic city pages.
**Landing:** `/residential`, `/services/*`, `/boston/[city]`.
**Qualification (form):** surfaces, duration, tried cleaning, goal (refresh/selling/moving in), timing, photos.
**Routing:** ZIP → market → zone. Score: active zone +15, photos +15/+10, ASAP +15, selling +15, multi-surface +10.
**Speed-to-lead:** GHL workflow — instant SMS (if consented) + email; BDR call task within the business hour; photo-request sequence at +4h/+24h if no photos.
**Booking:** BDR uses zone-first script from `/admin/scheduling` (or GHL calendar per zone).
**Close:** written quote (PDF) → deposit per rules → job → review request T+2 days.

## 2. Renter / roommate — "1–2 Day Bathroom Refresh"
**Flow:** Ad → `/renters` → photo assessment (renter variant) → **landlord approval** → quote → booking → restoration.

| Step | Mechanism | Guardrail |
|---|---|---|
| Interest | Renter ads (Boston moving season Aug–Sep; FL year-round), roommate calculator | Interest/geo targeting only — no age, family status, income, or other sensitive proxies |
| Assessment | Renter form: roommates, approval status, optional outreach authorisation | Landlord details discarded unless authorised |
| Quote | Fixed written scope; illustrative ticket ≈ $1,500 | Never "guaranteed $1,500" |
| Approval | Template (`/renters/landlord-approval`, .docx) or StoneCraft contacts landlord **after confirming with renter** | **No booking without written approval on file** (work-order step blocks start) |
| Payment | One payer or split links per roommate (Stripe via SmartOps) | Cost-sharing ≠ approval |

**Consent-based landlord workflow (GHL):** tag `renter:landlord-outreach-authorised` → task "Confirm with renter before contacting landlord" → BDR sends approval email (template in docs/08) → status field `sc_landlord_approval` → `approved` unlocks booking. Declined → renter notified, opportunity Lost (reason: landlord declined).

## 3. Landlord / property manager
**Entry:** `/landlords`, LinkedIn/email to small landlords, Google "unit turn bathroom".
**Qualification:** units, property type, PM flag, turn date, occupancy. ≥5 units or PM → **Property Manager pipeline**.
**Motion:** Pilot unit → approved vendor → recurring work → expansion. Per-unit completion note + photos for deposit documentation.

## 4. Hospital / healthcare facilities
**Entry:** ABM outbound (docs/06–07), `/commercial/hospitals`, capabilities PDF.
**Qualification:** buildings, restrooms, sq ft, surfaces, access/ICRA constraints, permitted hours, budget, procurement (PO/RFP/approved vendor), decision role.
**Sales path:** Meeting → site walk with Facilities/EVS (+ Infection Prevention where required) → scope by restroom with phasing → pilot (1–3 restrooms) → proposal → vendor onboarding (COI, W-9, background checks if required) → phased program → renewal.
**Proof:** StoneCraft's own pilots. *Do not reference the Sir Grout-era healthcare job (docs/15 G2).*

## 5. Universities, colleges & schools
**Timing:** sell Jan–Apr for summer work; Sep–Oct for winter break.
**Motion:** sample-room pilot → per-room price → building rollout. Many campuses require vendor registration and insurance minimums; K-12 public may require public bidding and prevailing wage (VERIFY per district before quoting).

## 6. Hospitality, HOAs & condos
**Hotels:** pilot rooms to set per-room time; schedule by floor with housekeeping; lobby/pool stone care. Seasonal: FL work in summer low season.
**HOAs/condos:** manager-led site walk → board-ready proposal → common areas first → optional resident program (association approval required). FL condo ZIPs in Broward/Boca route to commercial.

## Case studies (template — `src/config/gallery.ts`)
Fields: existing conditions · facility requirements · permitted hours · surface restoration scope · phased restroom access · documentation · outcome. Publishing requires: `approvals.client = true`, contracting entity approval (or `n/a`), `performedByStoneCraft = true`, no names/logos/images/staff details unless the written approval covers them.

## Funnel metrics to watch (see docs/13)
Lead → photos received (target ≥55%), photos → qualified, qualified → booked, booked → won, won → reviewed; commercial: accounts contacted → meetings → site walks → proposals → contracts.
