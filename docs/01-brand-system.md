# 01 — StoneCraft Brand System

## Architecture
| Layer | Name | Use |
|---|---|---|
| Master brand | **StoneCraft** | Site-wide, commercial capabilities, multi-market materials |
| Market brand | **StoneCraft Boston** | Boston pages, GBP, Boston ads, email sender name |
| Market brand | **StoneCraft Southeast Florida** | FL pages/ads — *only after Gate G1* |
| Offer | **The Bathroom Refresh** (1–2 day) | Renter / landlord / homeowner productised offer |
| Programs | **StoneCraft Commercial Programs** | Recurring facility maintenance |

One master site (`stonecraftboston.com` today; consider `stonecraft…` master domain later). Market hubs at `/boston` and `/south-florida`, city pages under each. No regional subdomains → no duplicate content or split attribution. If a second domain is adopted for Florida, 301 the `/south-florida/*` tree and keep one GA4 property with a `market` dimension.

## Positioning
- **Line:** *Your Tile. Your Grout. Your Stone. Restored.*
- **Support:** Professional restoration of bathrooms, tile, grout, marble and natural stone—helping homeowners, renters and commercial properties renew existing surfaces without unnecessary replacement.
- **Commercial:** *Restore Your Surfaces. Reduce Disruption. Protect Your Property.*

### Message pillars
| Residential | Commercial |
|---|---|
| Appearance — it looks new again | Facility appearance — restrooms that look as clean as they are |
| Cleanliness — film, mildew and embedded soil gone | Maintenance planning — scheduled cycles, not emergencies |
| Protection — sealed, recaulked | Scheduling — permitted windows, phased closures |
| Value — fraction of a remodel | Documentation — scope by area, before/after log |
| Speed — usually 1–2 days | Lifecycle — extend surface life, defer capital spend |
| Honest alternative to replacement | Multi-location — one vendor, one standard |

### Guardrails (non-negotiable)
- Never guarantee replacement is avoidable or that work finishes in one visit.
- No superlatives without evidence ("#1", "most-booked", "best").
- No hard-water claims for Boston (see docs/15 §B).
- No Sir Grout or other franchisor names, marks, colours, price sheets, testimonials or customer info.
- Before/after images: real StoneCraft jobs with written permission only; illustrations labelled.

## Visual tokens (from StoneCraft spec — preserved)
| Token | Hex | Role |
|---|---|---|
| Hunter | `#1A3828` | Primary background, headings |
| Hunter mid | `#1F4030` | Cards on dark |
| Hunter light | `#2A5040` | Borders on dark |
| Linen | `#D4B896` | Primary CTA, accent text |
| Cream | `#F5F0E8` | Page background |
| Patina | `#4A7060` | Eyebrows, secondary accents |
| Amber | `#C8A46A` | Highlights, notices |

Type: **Playfair Display** (headings, 400/600/700) + **Inter** (body/UI). Self-hosted via `@fontsource` (no Google Fonts request — faster, no third-party data transfer).

Implemented in `src/app/globals.css` (`@theme`) and shared components (`.btn-linen`, `.btn-hunter`, `.eyebrow`, `.field`).

## Voice
Plain, specific, calm. Explain the *why* (grout is porous; caulk fails at change-of-plane joints). Say what we won't do. Short sentences. Commercial copy uses facility vocabulary: scope, phasing, work windows, documentation, procurement.

## Imagery direction
- **Residential:** bright restored showers, marble vanities, clean grout lines in natural light; raking-light shots for stone; before/after pairs from identical angles.
- **Commercial:** restroom rows, corridors, hotel baths, residence-hall showers; technicians in uniform with PPE; documentation (tablet with photo log). No identifiable facilities/logos without permission.
- Photo release form: customer name, address (town only for publication), images, channels, revocation clause.
