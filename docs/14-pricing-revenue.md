# 14 — Pricing & Revenue Logic

## Principles
- Editable tables, never hard-coded public promises. Public site shows **guidance ranges (Boston only)** from the StoneCraft spec; Florida shows "priced after assessment".
- Separate **internal cost**, **markup/margin**, **customer price** and **technician compensation** (each a distinct field in `PriceRow`).
- Commercial and property-manager pricing is always **custom** after site review (access, scheduling, restrictions, scope).
- No franchise price sheet is imported or applied (docs/15 G1/G3).

## Price sheet model (`src/lib/pricing/types.ts`)
`rows[] {service, unit(sqft|linear_ft|each|flat), rate, minCharge, internalCostPerUnit, techPay(per_job|percent|per_unit)}` · `zipModifiers[] {match (5-digit or prefix), pct}` · `customerTypeModifiers {homeowner, renter, landlord, hnw, commercial:"custom"}` · `volumeDiscount {thresholdSqft, pct}` · `seasonalUplift {months, pct, active}` · `projectMinimum` · `depositRules[] {min, max, pct, required}` · `commercialDepositPct` · `approved`.

## Calculation order
1. Line subtotal = `rate × qty` (or flat) → `max(subtotal, minCharge)`.
2. Sum lines → subtotal.
3. Modifiers (additive % of subtotal): ZIP (longest match), customer type, HNW, volume (negative), seasonal.
4. Project minimum.
5. Deposit by total band.
6. Internal: cost = Σ internalCostPerUnit × qty; tech pay per rule; gross margin = total − cost − tech pay.

Worked example (draft Boston sheet): shower restoration (1 × $1,200) + caulk (10 ft × $10 → $200 minimum) = $1,400; Back Bay ZIP +10% = $1,540; deposit 25% = $385. *(Draft numbers — set real ones before use.)*

## Draft sheets
`src/config/pricing.ts` — Boston & Florida, `approved: false`. Owner override via admin API (`PUT /api/admin/config` with `pricing:boston`) after setting real rates from StoneCraft's own labour, materials and overhead.

### How to set rates (owner worksheet)
For each service: target crew hours per unit × loaded labour rate + materials per unit + consumables + travel allocation (by zone) + overhead % → cost; price = cost ÷ (1 − target gross margin). Check against the public range; adjust minimum charges so the smallest job still covers a half-day trip.

## Packages
| Package | Unit | Notes |
|---|---|---|
| 1–2 Day Bathroom Refresh | flat (scope-capped) | Illustrative ≈ $1,500; scope sheet defines what's in; overage lines quoted separately |
| Unit-turn reset | per unit by bathroom size | Portfolio tiering by annual unit volume |
| Commercial program | per restroom / per sq ft / per phase | Custom; pilot priced separately |

## Deposits (draft)
$0–999: none · $1,000–1,999: 25% required · $2,000+: 50% required · Commercial: 30% or per contract terms (Net 30 common with POs).

## Tech compensation
Per job (flat) or % of line subtotal; commercial premium and large-job bonus configurable in SmartOps (`operator_payment_settings.tech_pay_defaults`). Techs see only their own pay, never price or margin.
