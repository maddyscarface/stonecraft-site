# 10 — AI-Assisted Estimating & Work-Order Workflows

## Two estimating modes
### Mode A — Photo assessment (live now)
Customer uploads photos via the site → photos in private storage, links on the GHL contact → estimator reviews → quote built in `/admin/pricing` (or SmartOps) from the price sheet → human sends.
Optional AI assist (Phase 4): a vision model drafts *condition tags* (soap scum, mildew, etched marble, missing grout) and a suggested service list for the estimator. It never prices or contacts the customer.

### Mode B — AI-assisted room scan (admin beta)
`/admin/room-scan` → device camera (`getUserMedia`, rear camera) → 2–6 frames → `/api/admin/room-scan` → model returns `{floor_sqft, wall_tile_sqft, shower_sqft, confidence, assumptions}`.
Rules enforced in code and UI:
- Output is **provisional** (`provisional: true, fieldVerified: false`).
- Low confidence → manual dimensions / add reference object and rescan.
- Editable: the estimator overrides any dimension before quoting.
- Quotes from scans are confirmed against tape measurement before issue.
- No "3-minute quote" claim until tested.

**Accuracy study before GA:** 20 rooms measured by tape; scan each with and without a reference object; record absolute % error per surface. Publish internal error bands (e.g. "floor ±X%") and set the confidence → action policy from the data. Re-test when the model version changes (`ROOM_SCAN_MODEL`).

## Quote workflow
1. Inputs: dimensions (manual, measured, or provisional scan), services, ZIP, customer type, HNW flag.
2. `buildQuote()` applies: per-unit rate, minimum charge per line, ZIP modifier (longest-prefix match), customer-type modifier, HNW, volume discount, seasonal uplift (if active), project minimum, deposit rule.
3. Commercial / property-manager → `kind: "custom"` (requires site review of access, scheduling, restrictions, scope).
4. `customerView()` strips internal cost, tech pay and margin.
5. `customerReady` is false until the price sheet is owner-approved.

## Work-order generation (scope → brief)
Inputs: job scope, surface type, grout type, area, existing conditions (notes + checkboxes), product selections, site access notes, customer restrictions, photos, technician qualifications.
Engine (`src/lib/workorder/engine.ts`) composes, deterministically:
- Opening section (arrival, access, protection, **before photos required**)
- Service sections from the step library
- Condition modifiers inserted before the relevant section (soap scum, wax/coating, mildew) and warnings (epoxy grout **blocks**; natural stone = no acids; loose tile; pre-1980 building materials; healthcare site rules)
- Materials list (quantities from area + 15% waste where a coverage rule exists)
- PPE (per SDS + condition-specific)
- Photo documentation requirements
- QC checklist
- Scope exclusions
- Closing section (after photos, walkthrough, care instructions)
Output flags: `fieldReady`, `reviewRequired[]`, `qualificationGaps[]`, `blocksProceeding`.

**Technicians never see** price, invoice total, margin or owner profitability (stripped in API; SmartOps enforces with a view + RLS).

## Human validation gates
| Gate | Who | When |
|---|---|---|
| Step library validated against manufacturer TDS/SDS and StoneCraft SOP | Lead technician + owner | Before first field use and on every library change |
| Hazardous-material review (pre-1980 buildings, mould beyond surface mildew, healthcare ICRA) | Owner | Per job when flagged |
| Product compatibility (stone type, grout type, sealer chemistry) | Estimator | Per job |
| Qualification match (e.g. stone polishing) | Dispatcher | Before assignment |

## Optional LLM use in work orders
An LLM may *suggest* conditions from scope notes/photos, or rewrite the brief in plainer language. It may not add procedures not in the validated library. Log the model, prompt version and output on the work order.
