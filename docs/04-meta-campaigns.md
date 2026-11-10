# 04 — Meta (Facebook/Instagram) Campaigns: Massachusetts & Florida

## Account structure
Two ad accounts or one account with market-prefixed campaigns. Recommended: **one Business Manager, one ad account per market** (clean billing + reporting), **one shared Pixel/dataset** with a `market` parameter on every event (browser and CAPI must use the same dataset ID for deduplication; segment reporting with custom conversions filtered on `market`). Florida campaigns stay **off** until Gate G1.

Naming: `{MKT}_{OBJ}_{SEGMENT}_{AUDIENCE}_{YYMM}` → `BOS_LEADS_SHOWER_BROAD_2611`.

| Campaign group | Objective | Optimisation event | Audience | Landing |
|---|---|---|---|---|
| Residential bathroom restoration | Leads (website) | `Lead` (browser + CAPI, dedup by event_id) | Geo radius of active zones, broad (no age/gender narrowing; let Advantage+ work) | `/services/shower-restoration`, `/free-assessment` |
| Marble & stone restoration | Leads | `Lead` | Geo (premium ZIPs inside zones) + interests: interior design, luxury homes | `/services/marble-stone-restoration` |
| Rental bathroom refresh | Leads | `Lead` | Geo (Cambridge/Somerville/Allston/Brighton/Boston; FL: WPB/FTL), interests: apartment living, home décor | `/renters` |
| Home sellers & landlords | Leads | `Lead` | Geo + interests: real estate investing, property management; seller intent (home-selling interests) | `/landlords`, `/residential` |
| Commercial facility education | Traffic → Leads | `ViewContent` (capabilities) then `Lead` | Job-title/industry targeting is limited on Meta; use interests (facility management, hospitality management) + LinkedIn for precision | `/commercial`, `/commercial/capabilities` |
| Commercial retargeting | Leads | `Lead` | Visitors to `/commercial*` 60d, capabilities viewers | `/commercial-site-assessment` |
| Residential retargeting | Leads | `Lead` | Assessment page viewers 30d (exclude leads 60d), video 50% viewers | `/free-assessment` |

**Special Ad Category:** restoration service ads are not housing-opportunity ads, so Housing is not expected. If Meta flags renter/landlord ads as Housing, comply (no age/gender/ZIP-exclusion targeting, ≥15-mile radius). Never target or exclude by protected characteristics.

**Sizing:** Advantage+ placements; 1:1 feed, 4:5 feed, 9:16 Reels/Stories. 3–5 ads per ad set; refresh creative every 3–4 weeks.

## Budget scenarios (planning assumptions — replace with actuals after 30 days)
| Scenario | Boston / month | Florida / month (post-G1) | Split |
|---|---|---|---|
| Test | $2,500 | $1,500 | 60% residential prospecting · 20% renter · 20% retargeting |
| Growth | $6,000 | $4,000 | 50% residential · 15% renter · 15% landlord/seller · 10% commercial · 10% retargeting |
| Scale | $12,000 | $8,000 | Re-weight to the segments with lowest cost per **qualified** lead |

Kill rule: pause an ad set after spend ≥ 3× target CPL with zero qualified leads. Judge on **qualified lead / booked estimate** (CRM feedback via CAPI `QualifiedLead`/`Schedule`), not raw leads.

---

## Copy — 5+ variations per segment
Format: **Headline** · Primary text. Use the same copy for MA and FL unless a market line is marked. FL lines may reference hard water and humidity; **Boston lines must not reference hard water**.

### A. Shower restoration
1. **Your Shower Doesn't Need a Full Remodel. It Needs the Right Restoration.** · Dark grout, cracked caulk, film that won't scrub off—most showers that look worn out are surface problems. Send 3 photos. We'll tell you honestly what's possible.
2. **Before You Replace the Tile, See What Restoration Can Do.** · Deep clean, grout repair, new caulk and sealing—usually done in a day or two. Free photo assessment.
3. **Same Tile. Like-New Shower.** · We restore the grout, caulk and finish on showers across [Greater Boston/Palm Beach & Broward]. Photos first, no pressure.
4. **Stop Re-Caulking Over Old Caulk.** · Mildew keeps coming back because the old caulk never came out. We remove it completely, dry-test the joint, and seal it right.
5. **Is Your Shower Fixable? Find Out From Your Phone.** · Snap a wide shot and two close-ups. Get an honest assessment the same business day.
6. *(FL)* **Hard Water Film? Mildew in the Caulk?** · South Florida water and humidity are tough on showers. We clean, repair, recaulk and seal—no remodel.

### B. Grout cleaning & colour sealing
1. **Your Grout Isn't Supposed to Be That Colour.** · Mopping pushes dirt into porous grout. Extraction cleaning lifts it out—and colour sealing keeps it even.
2. **One Colour. Every Grout Line.** · Blotchy floors look uniform again with professional colour sealing. Free photo assessment.
3. **Change Your Grout Colour Without Regrouting.** · Go from dingy to a clean neutral with a coloured, stain-resistant seal.
4. **Kitchen Floor Looks Dirty Right After You Clean It?** · It's the grout. We deep-clean, extract and seal so it stays cleaner, longer.
5. **Restore the Floor You Already Have.** · Tile is sound? Then it probably doesn't need replacing. Send photos to find out.

### C. Marble & natural stone
1. **Etched Rings on Your Marble? They Can Usually Be Removed.** · Honing and polishing restore the finish—using stone-safe methods only.
2. **Bring Back the Shine Without Replacing the Stone.** · Marble, travertine and limestone restored and sealed.
3. **Your Cleaner May Be Dulling Your Marble.** · Acids etch natural stone. We reverse the damage and show you how to prevent it.
4. **Travertine With Dirty Holes and Dull Patches?** · Clean, fill, hone and seal. Free photo assessment.
5. **Stone Deserves a Specialist.** · Vanities, floors, thresholds and countertops—restored to the finish you want.

### D. Caulk & grout repair
1. **Cracked Caulk Lets Water In.** · Replace failed caulk before it becomes a bigger repair. Fast, tidy, done right.
2. **Missing Grout Lines? Fix Them Before the Tile Loosens.** · Cut-out and regrout, colour-matched.
3. **The 2-Hour Fix That Protects Your Shower.** · Many caulk-and-grout repairs take a few hours. Photos first.
4. **Mildew Back Again Already?** · New caulk over old caulk fails. We remove, dry-test and reseal.
5. **Small Repair. Big Difference.** · Clean lines, sealed joints, no remodel.

### E. Bathroom restoration before selling
1. **Listing Soon? Fix the Bathroom Buyers Notice.** · Grout, caulk and stone restored before photos—usually in a day or two.
2. **Don't Remodel Before You Sell. Restore.** · A fresh bathroom without a contractor timeline.
3. **Make Your Listing Photos Count.** · Clean grout, crisp caulk and polished marble photograph better.
4. **Agents: Get Bathrooms Photo-Ready Fast.** · Pre-listing refresh with a fixed written price. *(also target agents)*
5. **Small Refresh, Better First Impression.** · Send photos; we'll tell you what's worth doing—and what isn't.

### F. Apartment & renter bathroom refresh
1. **Your Apartment Bathroom Should Feel as Good as the Rest of Your Home.** · A 1–2 day refresh of grout, shower and caulk. Landlord approval coordinated before any work.
2. **Moved In and the Bathroom Didn't Get the Memo?** · Send photos for a free assessment. We'll help you ask your landlord.
3. **Split It With Your Roommates.** · Get a fixed written price, then share it however you agree. *(Approval from your landlord is required first.)*
4. **Stuck With a Dingy Shared Bathroom?** · Restoration, not renovation—tile stays, grime goes.
5. **Ask Your Landlord With Our Free Template.** · We'll give you a written scope to send for approval.
6. *(Boston, Aug–Sep)* **Moving Season? Start With the Bathroom.** · New lease, fresh start—photos first, no pressure.

### G. Landlord turnover restoration
1. **Turn Units Faster. Skip the Bathroom Remodel.** · Grout, caulk, shower and floor reset between tenants.
2. **Better Listing Photos This Turn.** · Bathroom resets with per-unit before/after documentation.
3. **One Vendor for Every Unit Turn.** · Standard scopes, portfolio pricing, scheduled to your turn dates.
4. **Restore, Don't Replace, Between Tenants.** · When tile is sound, a reset costs a fraction of a remodel.
5. **Pilot One Unit.** · See the result and the timeline before you commit the portfolio.

### H. Commercial facility education (Meta → mostly retargeting)
1. **Restrooms That Look as Clean as They Are.** · Phased tile and grout restoration with documented scopes. Download the capabilities statement.
2. **Restore Your Surfaces. Reduce Disruption.** · Work in permitted windows, one restroom at a time.
3. **Facility Teams: Defer the Retile.** · Restoration can extend surface life where tile is sound—documented by area.
4. **Summer Break Is Closer Than It Looks.** · Plan residence-hall and locker-room restoration now. *(universities, Jan–Apr)*
5. **Hotel Bathrooms Showing Up in Reviews?** · Room-by-room grout and caulk restoration around occupancy.

---

## Creative briefs (produce from real jobs; illustrations labelled)
| # | Concept | Format | Shot list | Overlay |
|---|---|---|---|---|
| CB1 | Slider reveal | 4:5 static + 9:16 video | Same angle before/after, tripod, natural light | "Same tile. Restored." |
| CB2 | Grout line macro | 9:16 video | Macro of brush in grout line → extraction water in bucket | "This is what mopping leaves behind." |
| CB3 | Caulk removal | 9:16 | Old caulk peeled out in one strip → dry test → new bead tooled | "Never caulk over caulk." |
| CB4 | Roommate split | 1:1 carousel | Calculator screen; roommates in kitchen (models, release) | "$1,500 ÷ 3 = $500 each*" + "*after landlord approval" |
| CB5 | Marble raking light | 4:5 | Raking light shows etch rings → polished | "Etching removed, not hidden." |
| CB6 | Commercial documentation | 1:1 | Tech with tablet photo log, restroom row (no logos) | "Documented by area." |
| CB7 | Restore vs replace | 4:5 | Split frame: demolition debris vs restored shower | "Restore when you can. Replace when you must." |

## UGC concepts (creators via SideShift or local; disclose paid partnership)
1. **"I tried everything"** — homeowner shows failed DIY products, StoneCraft visit, reveal.
2. **"Renter bathroom glow-up"** — tenant explains approval template, roommates split, reveal. *Must show approval step.*
3. **"Landlord walkthrough"** — investor walks a turned unit, before/after on phone.
4. **"What the tech sees"** — tech POV explaining soap scum vs stained grout.
5. **"Marble myth-buster"** — "vinegar is ruining your marble."
Creator brief must include: no claims of results on their own home unless it was their home; no "guaranteed"; FTC disclosure.

## Video scripts
**15s — Shower (Reels)**
0–3s: Close-up dark grout. VO: "Your shower probably doesn't need a remodel."
3–10s: Fast cuts: scrub, caulk strip, seal, slider reveal. VO: "Deep clean, new caulk, sealed grout—usually done in a day or two."
10–15s: Phone snapping photo → CTA card. VO: "Send three photos for a free assessment." Super: StoneCraft · Send Photos.

**15s — Renter**
0–3s: Roommate opens shower curtain, grimaces. Text: "Move-in day bathroom."
3–10s: Calculator split; landlord approval email "Approved". VO: "Get a written quote, get your landlord's OK, split it."
10–15s: Reveal. Super: "The 1–2 Day Bathroom Refresh · landlord approval required."

**30s — Restore vs replace (homeowner/seller)**
0–5s: Demolition sound over black → "Before you tear it out…"
5–15s: Tech inspects: taps tile (sound), presses wall (firm). VO: "If the tile is sound, the problem is usually the grout, the caulk or the finish."
15–25s: Process montage + slider.
25–30s: VO: "If it does need replacing, we'll tell you. Send photos." CTA.

**30s — Commercial**
0–5s: Busy corridor → restroom door "Closed for maintenance — open next door". VO: "Restoring restrooms without closing the floor."
5–20s: Night shift, barriers, phased closure board, tablet photo log.
20–30s: VO: "Scoped by area. Scheduled around operations. Documented." CTA: "Request a site assessment."

## Pixel / CAPI events used for optimisation
`PageView`, `ViewContent` (service, assessment, capabilities), `Contact` (tel clicks), `Lead` (form — browser + CAPI with shared `event_id`), CRM-driven `QualifiedLead` (custom), `Schedule`, `Purchase` (won value). Custom audiences: assessment viewers 30d, leads 60d (exclude/seed lookalike), video 50% 30d, commercial visitors 60d.
