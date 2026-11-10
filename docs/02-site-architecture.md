# 02 — Site Architecture & Page Map

Next.js 15 App Router · TypeScript · Tailwind v4 · deployed on Vercel. Public site and SmartOps app are separate deployables sharing contracts (docs/09).

| Route | Purpose | Primary CTA | Form variant | Index |
|---|---|---|---|---|
| `/` | 18-section homepage + audience selector | Send Photos — Free Assessment | — | ✓ |
| `/boston`, `/south-florida` | Market hubs, LocalBusiness-type schema | Assessment | residential | Boston ✓ / FL noindex until G1 |
| `/boston/[city]` (20) · `/south-florida/[city]` (6) | Local pages, unique intros | Assessment (town prefilled) | residential | as above |
| `/residential` | Homeowners | Assessment | residential | ✓ |
| `/renters` | Renter funnel + roommate calc + approval | Assessment (renter) | renter | ✓ |
| `/renters/landlord-approval` | Printable template (+ .docx) | Print / download | — | ✓ |
| `/landlords` | Unit-turn funnel | Unit-turn quote | landlord | ✓ |
| `/commercial` | Commercial hub + capabilities | Site assessment | commercial | ✓ |
| `/commercial/{hospitals, universities-schools, hotels-hospitality, hoa-condos, property-management}` | Segment funnels | Site assessment (segment prefilled) | commercial | ✓ |
| `/commercial/capabilities` | Capabilities statement (+ PDF) | Download | — | ✓ |
| `/services/{8}` | Service pages w/ honest limits | Assessment | residential | ✓ |
| `/bathroom-refresh` | 1–2 day offer | Assessment | residential | ✓ |
| `/free-assessment` | Core photo lead engine (`?type=`, `?zip=`) | Submit | residential/renter/landlord | ✓ |
| `/commercial-site-assessment` | Commercial intake (`?segment=`, `?program=`) | Submit | commercial | ✓ |
| `/gallery` | Permissioned before/after only | Assessment | — | ✓ |
| `/about`, `/process`, `/service-areas`, `/resources`, `/resources/[slug]`, `/contact` | Trust, education, SEO | Assessment | compact on contact | ✓ |
| `/thank-you` | Post-submit next steps (no conversion firing) | — | — | noindex |
| `/privacy`, `/terms` | Drafts — counsel review | — | — | ✓ |
| `/admin/*` | Dashboard, scheduling, pricing, work orders, room scan | — | — | blocked |

## Lead capture points
Header CTA · mobile sticky bar (Call/Text + Send Photos) · homepage hero/selector · every segment page (form section) · service pages · city pages · contact (compact) · thank-you (photo follow-up prompt) · resources CTA blocks.

## Form system (`src/components/LeadForm.tsx`)
Four steps (contact → space/facility → photos/approvals → notes & consent). Customer-type cards switch the variant live (homeowner → renter → landlord). Commercial variant collects every field in the brief: buildings, restrooms, sq ft, surface types, access restrictions, work hours, budget, procurement, decision role/decision-maker, timeline, scope photos. Renter variant records approval status and **only keeps landlord details when the renter ticks the outreach-authorisation box** (enforced server-side in the schema transform).

Consent: contact consent required; SMS consent separate, optional, unticked, with STOP/HELP language.

## Content rules
City pages have unique intros, housing notes and common-issue lists; no claimed offices or jobs. Supporting FL cities are listed but not paged until there is content and proof. FL tree is noindexed and excluded from sitemap while `pre-launch`.
