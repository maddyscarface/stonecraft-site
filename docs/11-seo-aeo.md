# 11 — Local SEO & AEO (Answer-Engine Optimisation)

## Architecture
Hub-and-spoke per market: `/boston` → `/boston/{city}` (20) ; `/south-florida` → `/south-florida/{city}` (6). Services (`/services/*`) and segments (`/residential`, `/renters`, `/landlords`, `/commercial/*`) are shared across markets. Resources (`/resources/*`) answer questions and link down to services and up to assessment.

### Internal linking rules
- Every city page → all services + market hub + up to 6 same-zone neighbours.
- Every service page → assessment, commercial (if relevant), 2 related resources (add as articles publish).
- Every resource → one service + one segment + assessment CTA.
- Footer → all services and primary pages (already implemented).

### Schema (implemented)
| Page | Types |
|---|---|
| Market hubs | `HomeAndConstructionBusiness` (service-area: `areaServed` cities, no street address), `FAQPage` |
| City pages | `Service` (areaServed city), `FAQPage`, `BreadcrumbList` |
| Service pages | `Service`, `FAQPage`, `BreadcrumbList` |
| Segment pages | `FAQPage`, `BreadcrumbList` |
| Resources | `Article`, `BreadcrumbList` |
`AggregateRating`/`Review` schema is **omitted** until real first-party reviews exist (and never self-serving review markup for LocalBusiness). Note: Google shows FAQ rich results only for a limited set of sites; FAQ markup still helps answer engines parse Q&A.

### AEO practices
- Each page answers its core question in the first 2–3 sentences ("Most showers that look worn out aren't failing…").
- Q&A blocks with direct answers (FAQ components).
- Honest limits sections ("When restoration isn't the answer") — distinctive, quotable content.
- Consistent NAP-equivalent (name + phone + service area) across site, GBP and citations.

## Content clusters
**Massachusetts:** shower restoration Boston · grout repair Cambridge · marble polishing Newton · tile restoration Brookline · bathroom refresh for Boston rentals · commercial grout cleaning Greater Boston.
**Florida:** shower restoration Boca Raton · grout cleaning Delray Beach · marble restoration Palm Beach · commercial tile restoration Fort Lauderdale · condo floor grout restoration West Palm Beach · hotel restroom tile restoration Southeast Florida.

## 20 blog briefs (3 published at launch)
| # | Title | Primary query | Audience | Links to | Status |
|---|---|---|---|---|---|
| 1 | Restore or Replace? How to Tell What Your Bathroom Tile Actually Needs | tile repair vs replace | Homeowners | /services/shower-restoration | **Published** |
| 2 | A Renter's Guide to Getting Landlord Approval for a Bathroom Refresh | landlord approval bathroom | Renters | /renters | **Published** |
| 3 | Planning Restroom Tile & Grout Restoration in Occupied Facilities | restroom tile restoration facility | Facilities | /commercial | **Published** |
| 4 | Why Your Shower Caulk Keeps Getting Mouldy (and the Fix That Lasts) | moldy shower caulk | Homeowners/renters | /services/regrouting-caulking | Brief |
| 5 | Grout Colour Sealing vs Clear Sealing: Which One Do You Need? | grout color seal vs sealer | Homeowners | /services/grout-color-sealing | Brief |
| 6 | How to Remove Etching From Marble (and What Causes It) | marble etching removal | Homeowners | /services/marble-stone-restoration | Brief |
| 7 | Shower Restoration in Boston's Older Homes: Brownstones, Triple-Deckers and Victorians | shower restoration Boston | Boston | /boston, /boston/back-bay | Brief |
| 8 | Cambridge Rentals: Refreshing a Shared Bathroom the Right Way | grout cleaning Cambridge | Renters | /boston/cambridge, /renters | Brief |
| 9 | Pre-Listing Bathroom Checklist for Newton and Brookline Sellers | bathroom prep before selling Newton | Sellers | /boston/newton | Brief |
| 10 | Unit-Turn Bathroom Resets: A Landlord's Cost and Timeline Guide | unit turn bathroom | Landlords | /landlords | Brief |
| 11 | Travertine Care in South Florida Homes: Holes, Dull Spots and Sealing | travertine restoration Boca Raton | FL homeowners | /south-florida/boca-raton | Brief (post-G1) |
| 12 | Hard Water and Your Shower: A South Florida Owner's Guide | hard water shower Florida | FL | /south-florida | Brief (post-G1) |
| 13 | Condo Floor Grout Restoration in West Palm Beach: What Associations Need to Know | condo grout restoration West Palm Beach | HOAs | /commercial/hoa-condos | Brief (post-G1) |
| 14 | Hotel Restroom Tile Restoration Without Taking Rooms Offline | hotel bathroom grout restoration | Hotels | /commercial/hotels-hospitality | Brief |
| 15 | Residence Hall Bathrooms: Planning Summer Restoration | dorm bathroom tile restoration | Universities | /commercial/universities-schools | Brief |
| 16 | Marble Restoration on Palm Beach: Caring for Estate Stone | marble restoration Palm Beach | FL luxury | /south-florida/palm-beach | Brief (post-G1) |
| 17 | Commercial Grout Cleaning in Greater Boston: Scope, Schedule, Documentation | commercial grout cleaning Boston | Facilities | /services/commercial-restoration | Brief |
| 18 | Does Quartz Need Sealing? Countertop Care by Material | do quartz countertops need sealing | Homeowners | /services/countertop-sealing | Brief |
| 19 | How Much Does Shower Restoration Cost in Greater Boston? | shower restoration cost Boston | Homeowners | /services/shower-restoration | Brief (needs approved pricing) |
| 20 | Moving Season in Boston: What to Check in Your New Apartment Bathroom | September 1 Boston apartment | Renters | /renters | Brief |

**Brief template (each):** 900–1,400 words · answer in first 100 words · H2s from real questions (People Also Ask) · one real job photo (permissioned) or a labelled diagram · 1 internal link up (service/segment), 1 sideways (related article), CTA to assessment · local references only where genuinely relevant (no fabricated "we did a job here") · `Article` schema with date.

## Google Business Profile
Eligible only with a real business address where you can receive mail **and** staff are present, or as a **service-area business** (hide address) based where the business operates. Rules:
- Boston: one GBP, service-area business, address hidden, service areas = configured towns (≤20). Category: primary *Tile contractor* or *Contractor* (confirm best available category), secondary e.g. *Floor refinishing service* where accurate (VERIFY available categories).
- Florida: **no GBP until Gate G1**; then one SAB profile if a legitimate base exists. Never create virtual-office or UPS-box profiles.
- Services list mirrors site services; products/posts from real jobs; photos with permission.
- UTM on GBP website link: `?utm_source=google&utm_medium=organic&utm_campaign=gbp_{market}`.

## Local citation plan (consistent name + phone + website; address hidden where SAB)
Tier 1: Apple Business Connect, Bing Places, Yelp, Facebook page, Nextdoor business page, BBB (if pursued), Angi/HomeAdvisor (evaluate lead costs), Houzz, Thumbtack (evaluate). Tier 2: Chamber of commerce (Boston, Cambridge, Newton; FL chambers post-G1), local landlord associations (e.g. SPOA/MassLandlords), BOMA/IFMA chapters for commercial. Track in a citation sheet: platform, URL, login owner, NAP exact text, date.

## Review generation (FTC-compliant)
- Ask **every** completed customer (no gating by sentiment) via GHL W8, T+2 days, direct GBP link.
- No incentives for reviews; no employee/family reviews; no review "gating".
- Respond to every review within 2 business days.
- Display reviews on site only after `flags.showReviews=true` using real, attributable reviews (name/initial + town with permission) — never edited to change meaning.
