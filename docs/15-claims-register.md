# 15 — Claims Register, Unverified Assumptions & Launch Gates

Every public claim on the site, in ads, or in outbound must trace to a row here marked **Verified**. Anything else stays off. Owner signs off before launch.

## A. Launch gates (blocking)

| # | Gate | Why it blocks | Owner action |
|---|------|---------------|--------------|
| G1 | **Florida operating rights vs. Sir Grout franchise agreement** | You operate Sir Grout Southeast Florida. Most franchise agreements contain in-term non-competes covering the territory and similar services, plus confidentiality over methods, pricing and customer lists. A StoneCraft-branded tile/grout business in Palm Beach/Broward could breach it. | Franchise counsel reviews the agreement **before** any FL ad spend, GBP, or outbound. Until then `MARKET_FL_STATUS=pre-launch` (pages noindexed, excluded from sitemap, leads tagged and held). |
| G2 | **Healthcare project experience** | The healthcare restroom project referenced in the brief was inspected/quoted under Sir Grout SE Florida. It is that entity's experience, not StoneCraft's, and it can't be named. | Do not cite it as StoneCraft work. Case study stays `performedByStoneCraft: false`, `published: false`. Build StoneCraft's own commercial references (pilot projects). |
| G3 | **SOP independence** | The SmartOps spec's work-order steps and product names (e.g. specific branded cleaners/sealants, "ColorSeal") appear to come from franchisor training. Copying them into StoneCraft breaches confidentiality/IP. | The shipped step library is generic with bracketed product placeholders. A StoneCraft lead tech writes StoneCraft's SOP from manufacturer TDS/SDS, not franchise manuals. Set `LIBRARY_META.validated`. |
| G4 | **Legal entity, insurance, registrations** | Trust claims and commercial onboarding need them. | Confirm entity name; COI limits (GL, WC, umbrella); MA HIC applicability; FL BTRs. Flip `verified` flags in `src/config/site.ts`. |
| G5 | **Pricing approval** | Draft sheets are placeholders. | Owner sets real rates → `approved: true` in admin override. |
| G6 | **Privacy policy & terms** | Drafts only. | Counsel review (MA/FL, TCPA, CAN-SPAM). |
| G7 | **Brand availability** | "StoneCraft" is a common mark (stone fabricators, etc.). | USPTO/state search for "StoneCraft" in class 37; check domain `stonecraftsefl.com` (placeholder). Choose a fallback (e.g. "StoneCraft Restoration"). |
| G8 | **Phone numbers & GBP** | Placeholders `(617) 000-0000`, `(561) 000-0000`. | Buy tracking-capable numbers (GHL/LC Phone), set env vars. |

## B. Claims REMOVED from the source specs (do not reintroduce)

| Source claim | Problem | Replacement |
|---|---|---|
| "Boston hard water ruins grout faster than anywhere" / "highest mineral content in the northeast" | **Incorrect.** Boston and most MWRA communities receive soft water (Quabbin/Wachusett). Some well-water suburbs differ. | Talk about soap scum, body oils, cleaning-product residue, mildew in older ventilated-poorly baths. Hard-water messaging is accurate for **SE Florida** (limestone aquifers) — use it there. |
| "Greater Boston's #1 Rated Restoration", "4.9/5 — 180+ reviews" | No reviews exist yet. | Hidden (`flags.showReviews=false`); `aggregateRating` omitted from schema. |
| Placeholder testimonials (Sarah K, Marcus T…) | Fabricated. FTC rules (16 CFR 465) prohibit fake reviews. | Removed. Add only real, attributable reviews. |
| "Most-booked restoration team in Boston every September" | Unsupported. | Removed. September messaging uses "moving season" without superlatives. |
| "No renovation. No demolition. One visit." | Can't guarantee one visit. | "Many jobs finish in a day; some need a second visit." |
| "Photo assessment in under 1 hour" / "within 1 hour" | Untested SLA. | "Same business day" (`site.responsePromise`) — change only after 30 days of measured response times. |
| "Most landlords say yes within 24 hours" | Unsupported. | Removed. Approval process described neutrally. |
| "Room scan → quote in 3 minutes" | Untested. | Room scan is admin-only beta; outputs labelled provisional. |
| "Serving 25+ neighbourhoods" | Fine only if true operationally. | Site lists configured zones only. |
| Sir Grout footer disclaimer ("Not affiliated with Sir Grout") | Naming the franchisor on StoneCraft invites confusion and conflicts with the "zero references" rule. | "Independently owned and operated. Not a franchise." |
| `deckcraftboston.com` in spec footers/emails | Copy error. | Corrected to StoneCraft domains. |

## C. Unverified assumptions (non-blocking, track)

| Assumption | Where used | How to verify |
|---|---|---|
| ZIP lists per city | `src/config/cities.ts` | USPS ZIP lookup; confirm PO-box-only ZIPs excluded |
| Zone days (Mon Inner Core, Tue West, …) | `src/config/markets.ts` | First 60 days of booking density |
| Renter refresh ≈ $1,500 | Renter page copy | First 10 jobs' actual tickets |
| Boston public price ranges | `publicPriceRanges` | Owner confirms against cost model |
| Lead-score weights | `src/lib/leads/scoring.ts` | Compare score vs. won rate after 100 leads |
| Drive-time estimates (haversine × 1.35 @ 32 km/h) | Scheduling gap warnings | Replace with distance-matrix adapter when volume justifies |
| Commercial keyword volumes | docs/05 | Google Keyword Planner before spend |
| Meta Special Ad Category not required | docs/04 | Confirm in Ads Manager; switch to Housing if flagged |
| Room-scan accuracy | docs/10 | 20 tape-measured rooms; publish error bands internally |
| GHL custom-field `key` support on upsert | `src/lib/crm/ghl.ts` | Test against sandbox location |

## D. Founder credentials (display only when verified)

MA General Contractor licence (number), OSHA 30 (card), MS WPI, MBA Cornell — `founder.credentials[].verified` in `src/config/gallery.ts`. Licence type/number must match MA records before display.
