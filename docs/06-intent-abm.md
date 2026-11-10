# 06 — Intent-Data & Account-Based Acquisition Methodology

## Layers
| Layer | Source | Use | Residential | Commercial |
|---|---|---|---|---|
| 1 Demand capture | Google Search | Active intent | ✓ primary | ✓ capture net |
| 2 First-party engagement | Site (GA4, pixel), CRM | Retarget, score, sequence | ✓ | ✓ |
| 3 Permissioned intent audiences | **DataMoon**, **AudienceLab**, comparable providers | Prospecting audiences of in-market households/businesses | Pilot | Pilot |
| 4 B2B company intelligence | Apollo, ZoomInfo, Clay, LinkedIn Sales Navigator (evaluate) | Account lists, roles, contact data | — | ✓ primary |
| 5 LinkedIn research | Sales Navigator (manual) | Map buying committee | — | ✓ |
| 6 Public signals | Capital-plan PDFs, RFP portals (COMMBUYS in MA; county/university portals in FL), hotel renovation news, HOA reserve studies (when shared) | Trigger timing | — | ✓ |

> Vendor capabilities, pricing and data sourcing for DataMoon and AudienceLab must be confirmed in a demo. Treat every claim as unverified until the pilot below.

## Signal taxonomy
**Residential:** tile/grout restoration research, shower repair, stone polishing, bathroom renovation research (restoration is the cheaper alternative), home-listing intent, recent move/new-mover, apartment improvement.
**Commercial:** facility renovation, restroom maintenance, flooring-vendor research, hotel PIP/renovation cycles, university capital/deferred maintenance, procurement postings for floor care/tile/grout.

## Data-use rules
- Use only data the vendor certifies as consented/permissioned for marketing and lawful in MA and FL. Get the DPA and data-source disclosure in writing.
- **Do not** target or segment on sensitive or protected characteristics (race, religion, health, sexual orientation, familial status, disability, national origin, age as proxy for housing).
- Residential intent data → ad audiences (hashed upload / vendor-side activation). **No cold SMS or robocalls** to residential intent lists. Email only where the vendor provides opt-in provenance and CAN-SPAM compliance is maintained; prefer ads.
- B2B: organisation + professional-role data for business contacts is fine for email and calls (CAN-SPAM; honour opt-outs). No scraping of LinkedIn or other sites in breach of their terms; no automation tools on LinkedIn.
- Retain vendor data only as long as the contract allows; purge on opt-out.

## Vendor comparison criteria (score 1–5)
| Criterion | Weight |
|---|---|
| Data provenance & consent documentation | 20% |
| Geographic depth (Greater Boston ZIPs; Palm Beach/Broward) | 15% |
| Signal relevance (home-improvement/tile/bath; facilities) | 15% |
| Match rate to Meta/Google audiences | 10% |
| B2B role accuracy (facility director, EVS, GM, PM) | 10% |
| Activation options (direct ad-platform push, CSV, API → GHL) | 10% |
| Price per record / per audience / minimums | 10% |
| Contract terms (term length, exclusivity, DPA) | 10% |

## Pilot design (each vendor, 30 days)
1. **Hypothesis:** intent audience lowers cost per *qualified* lead ≥20% vs. broad geo.
2. **Setup:** Meta ad set A (broad geo) vs. B (vendor intent audience), identical creative/budget ($750 each, Boston only). Google: Customer Match list from vendor as *observation* audience for bid adjustments.
3. **Tagging:** UTM `utm_content=intent_{vendor}`; GHL tag `src:intent:{vendor}`.
4. **Readout:** CPL, qualified rate, booked rate, cost per booked estimate. Decide continue/kill at day 30.

## Account-based workflow (multi-building organisations)
| Stage | Activity | Tooling | Exit criteria |
|---|---|---|---|
| 1 Tier accounts | Build list: hospitals, universities, school districts, hotels (100+ keys), HOAs/condos (100+ units), PM firms (500+ units) per market | Company intel + public lists | Tier A (≥5 buildings or ≥50 restrooms), B, C |
| 2 Map committee | Facility director, EVS director, ops VP, procurement; hotels: GM, chief engineer; HOA: manager + board president | Sales Navigator (manual) | 2–4 contacts/account |
| 3 Warm | LinkedIn connect + capabilities share; commercial retargeting ads to account visitors | LinkedIn, Meta/Google remarketing | Engagement or 2 weeks |
| 4 Sequence | Segment email sequence (docs/07) + calls | GHL / sending domain | Reply or 21 days |
| 5 Meet | 20-minute discovery: inventory, constraints, timing | GHL calendar | Site walk booked |
| 6 Site walk | Inventory, photos, access rules | SmartOps / checklist | Scope |
| 7 Pilot | 1–3 areas, documented | SmartOps | Approved vendor |
| 8 Expand | Program across buildings; QBRs | CRM | Renewal |

Account record lives in GHL (company + contacts, `Commercial` pipeline starts at **Target Account**). Intent spikes or site visits from an account trigger a BDR task.
