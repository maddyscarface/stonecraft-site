# 05 — Google Search Campaigns: Massachusetts & Florida

## Structure
Separate campaigns per market (location targeting = **Presence**: "people in or regularly in" — not "interested in"). Florida paused until Gate G1.

| Campaign | Ad groups | Landing | Bidding (start → scale) |
|---|---|---|---|
| `BOS_SRCH_SHOWER` | shower restoration · shower regrouting · shower caulk repair | `/services/shower-restoration`, `/services/regrouting-caulking` | Max Conversions (Lead) → tCPA after 30 conv |
| `BOS_SRCH_GROUT` | tile & grout cleaning · grout restoration · grout colour sealing | `/services/tile-grout-restoration`, `/services/grout-color-sealing` | same |
| `BOS_SRCH_STONE` | marble restoration · marble polishing · natural stone polishing · travertine | `/services/marble-stone-restoration` | same |
| `BOS_SRCH_RENTAL` | bathroom refresh · landlord unit turn | `/bathroom-refresh`, `/landlords` | same |
| `BOS_SRCH_COMM` | commercial tile restoration · commercial grout cleaning · hospital restroom floor · hotel grout restoration | `/commercial/*`, `/services/commercial-restoration` | Manual CPC / Max Clicks capped → Max Conversions once volume exists |
| `BOS_SRCH_BRAND` | StoneCraft brand | `/` | Max clicks, low cap |
| `FL_SRCH_*` | mirror of above | `/south-florida/*`, service pages | — |

Use city-level ad customisers or location assets; send city-intent queries ("grout cleaning newton") to the matching city page via ad-group-level final URL where the city has a page.

**Validate commercial volumes in Keyword Planner before major spend.** Expect low volume; commercial search is a capture net, not the primary commercial channel (ABM/outbound is).

## Keyword lists (phrase `"..."` and exact `[...]`; avoid broad until conversion data exists)

### Shower
`"shower restoration"` · `"shower regrouting"` · `"regrout shower"` · `"shower grout repair"` · `"shower caulk repair"` · `"recaulk shower"` · `"shower tile cleaning"` · `"shower grout cleaning"` · `"moldy shower caulk"` · `[shower restoration near me]` · `"shower refinishing tile"` (watch: may mean tub reglazing)

### Grout & tile
`"tile and grout cleaning"` · `"grout cleaning service"` · `"grout restoration"` · `"grout sealing"` · `"grout color sealing"` · `"grout recoloring"` · `"change grout color"` · `"tile floor cleaning"` · `"kitchen tile grout cleaning"` · `[grout cleaning near me]`

### Stone
`"marble restoration"` · `"marble polishing"` · `"marble floor polishing"` · `"marble etching removal"` · `"natural stone polishing"` · `"travertine cleaning"` · `"travertine restoration"` · `"limestone cleaning"` · `"granite countertop sealing"`

### Rental / landlord
`"bathroom refresh"` · `"apartment bathroom refresh"` · `"unit turn bathroom"` · `"rental bathroom update"` · `"make ready bathroom"`

### Commercial
`"commercial tile restoration"` · `"commercial grout cleaning"` · `"restroom tile restoration"` · `"restroom grout cleaning"` · `"hospital restroom floor maintenance"` · `"hotel grout restoration"` · `"hotel bathroom tile restoration"` · `"locker room tile cleaning"` · `"condo lobby marble polishing"` · `"hoa common area floor restoration"`

Each list duplicated with geo modifiers for core cities (e.g. `"grout cleaning cambridge"`, `"marble polishing palm beach"`).

## Search-intent classification
| Intent | Examples | Treatment |
|---|---|---|
| **Transactional — service** | "shower regrouting near me", "grout cleaning service newton" | Highest bids; assessment landing |
| **Transactional — commercial** | "commercial grout cleaning boston" | Commercial landing; call extension |
| **Problem-aware** | "moldy shower caulk", "dark grout won't come clean" | Moderate bids; service page with education; also SEO targets |
| **Comparison** | "regrout vs replace tile", "grout sealing cost" | Low bids or SEO only (resources) |
| **DIY / product** | "grout cleaner", "how to regrout" | **Negative** |
| **Employment / training** | "grout cleaning jobs", "franchise" | **Negative** |

## Negative keywords (account-level list)
`diy, how to, how do i, youtube, video, tutorial, homemade, vinegar, baking soda, bleach, best grout cleaner, grout pen, home depot, lowes, amazon, walmart, rent machine, rental machine, steam cleaner, buy, sale, product, kit, jobs, job, hiring, career, salary, training, course, certification, franchise, franchising, sir grout, grout medic, groutsmith, free, cheap tiles, tile store, tile shop, tile installer, tile installation, new tile, retile, bathroom remodel cost, contractor license, wholesale, supply, epoxy grout kit, grout float, msds, sds`

Notes: competitor brands are negatives (no competitor-conquesting while a franchise relationship exists — Gate G1). Review search-terms report weekly; add "reglazing/refinishing tub" as negative if it attracts tub-reglaze intent.

## Responsive search ads (RSA)
Pin H1 position 1 only for brand/legal lines; otherwise unpinned. 15 headlines (≤30 chars), 4 descriptions (≤90 chars).

### RSA — Shower (Boston)
Headlines: Shower Restoration Boston · Restore Your Shower Grout · Regrouting & Recaulking · Skip the Shower Remodel · Free Photo Assessment · Send Photos, Get a Quote · Written Price Before Work · Many Showers Done in a Day · Cambridge · Newton · Brookline · Mildewed Caulk Replaced · Deep Clean + Grout Seal · Independently Owned · Restoration, Not Renovation · Honest Repair-or-Replace Call
Descriptions:
1. Deep clean, grout repair, new caulk and sealing. Send 3 photos for a free assessment.
2. If the tile is sound, it likely doesn't need replacing. We'll tell you honestly.
3. Written scope and price before anything is booked. Serving Greater Boston.
4. Old caulk removed completely, joints dry-tested, then resealed the right way.

### RSA — Grout
Headlines: Tile & Grout Cleaning · Grout Colour Sealing · Make Grout One Colour Again · Change Grout Colour · Deep Extraction Cleaning · Kitchen & Bath Floors · Free Photo Assessment · Written Price First · Sealed to Resist Stains · Serving {LOCATION(City)} · Restore, Don't Retile · Same-Day Reply · Homes & Rentals · Independently Owned · Get a Quote From Photos
Descriptions:
1. Professional cleaning lifts what mopping leaves in grout. Colour sealing keeps it even.
2. Send photos of your floor for a free assessment and a written estimate.
3. Uniform, stain-resistant grout without regrouting. Homes, rentals and condos.
4. Replies the same business day. No obligation, no pressure.

### RSA — Marble & stone
Headlines: Marble Restoration · Marble Polishing Experts · Remove Marble Etching · Travertine Restoration · Stone-Safe Methods Only · Hone, Polish & Seal · Free Photo Assessment · Vanities, Floors, Counters · Restore the Shine · Natural Stone Care · Written Quote First · Palm Beach Marble Care (FL) · Back Bay Marble Care (BOS) · No Acid on Stone · Restoration Specialists
Descriptions:
1. Etching and dullness removed with honing and polishing—stone-safe products only.
2. Marble, travertine and limestone restored and sealed. Free photo assessment.
3. We test first and set honest expectations before any work begins.
4. Homes, condos and building lobbies. Written scope and price before booking.

### RSA — Commercial
Headlines: Commercial Tile Restoration · Restroom Grout Restoration · Phased, Low-Disruption Work · Nights & Weekends Available · Documented by Area · Hospitals · Universities · Hotels · HOA & Condo Common Areas · Request a Site Assessment · Multi-Building Programs · Before/After Photo Logs · Defer the Retile · Pilot Area Available · Capabilities Statement
Descriptions:
1. Restroom and hard-surface restoration scheduled into permitted work windows.
2. Scope by area, phased closures and completion reports for facility records.
3. Pilot a few restrooms, then roll out across buildings with one vendor.
4. Request a site assessment—share counts, constraints and timing.

### RSA — Rental / landlord
Headlines: Unit-Turn Bathroom Reset · Bathroom Refresh in 1–2 Days · Skip the Remodel · Better Listing Photos · Portfolio Pricing · Per-Unit Documentation · Renter Refresh, Landlord-OK · Fixed Written Price · Free Photo Assessment · Grout, Caulk & Shower · Scheduled to Turn Dates · Pilot One Unit · Property Managers · Greater Boston · Restoration, Not Renovation
Descriptions:
1. Reset bathrooms between tenants: grout, caulk, shower and floor restoration.
2. Fixed per-unit scope and price, before/after photos for your records.
3. Renters: we coordinate written landlord approval before booking.
4. Send unit photos for a quote. Volume pricing for portfolios.

**Assets:** sitelinks (Free Assessment, Bathroom Refresh, Renters, Commercial, Service Areas), callouts (Written Price First · Photos-First Quotes · Independently Owned · Nights/Weekends for Facilities), structured snippets (Services: Shower Restoration, Grout Sealing, Regrouting, Caulking, Marble Polishing), call asset with tracking number, image assets from real jobs only. Lead-form asset optional (pipe via Zapier/GHL webhook).

## Landing page mapping
| Ad group | Final URL |
|---|---|
| shower restoration / regrouting | `/services/shower-restoration` |
| shower caulk repair | `/services/regrouting-caulking` |
| grout cleaning | `/services/tile-grout-restoration` |
| grout colour sealing | `/services/grout-color-sealing` |
| marble / stone | `/services/marble-stone-restoration` |
| countertop sealing | `/services/countertop-sealing` |
| bathroom refresh | `/bathroom-refresh` |
| unit turn / landlord | `/landlords` |
| commercial (generic) | `/commercial` |
| hospital restroom | `/commercial/hospitals` |
| hotel grout | `/commercial/hotels-hospitality` |
| condo / hoa | `/commercial/hoa-condos` |
| `{city}` modified | `/boston/{city}` |

## Conversion actions (Google Ads)
Primary: `generate_lead` (GA4 import or Ads tag via GTM, with **enhanced conversions** from `user_data_ready`), `qualified_lead` and `job_won` via **offline conversion import** (CSV from `/api/admin/export` or GHL native integration) using GCLID/GBRAID/WBRAID stored on the contact. Secondary (observe only): `phone_click`, `photo_upload_success`.

## Budget scenarios (planning assumptions)
| Scenario | Boston / month | FL / month | Allocation |
|---|---|---|---|
| Test | $2,000 | $1,500 | Shower 35% · Grout 30% · Stone 20% · Rental 10% · Brand 5% |
| Growth | $5,000 | $3,500 | + Commercial 10% carved from Grout |
| Scale | $10,000 | $7,000 | Shift to ad groups with lowest cost per booked estimate |

Re-evaluate weekly on cost per qualified lead and per booked estimate; monthly on won revenue (offline conversions).

## Retargeting logic (cross-channel)
| Audience | Window | Message | Exclude |
|---|---|---|---|
| Assessment page viewers, no lead | 14d | "Still deciding? Send photos—no obligation." | Leads 60d |
| Service page viewers | 30d | Service-specific proof + process | Leads 60d |
| Renter page viewers | 30d | Approval template + roommate split | Leads 60d |
| Commercial page/capabilities viewers | 90d | Capabilities + site assessment | Commercial leads 180d |
| Leads without photos (CRM list) | 7d | "Add photos to get your estimate" | Photos received |
| Won customers | 365d | Annual reseal / maintenance (exclude from prospecting) | — |
Consent: remarketing lists only include users with ad consent granted (Consent Mode v2 handles this for Google tags; Meta pixel respects `fbq('consent')`).
