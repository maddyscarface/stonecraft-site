# 24 — Phase 3 SEO / GEO / AEO checklist (StoneCraft)

Completed on `phase3-dev` (2026-11-13, Asia/Karachi). Staging remains noindex. Production was not changed.

## Technical SEO
- [x] Unique title, description, self-canonical, Open Graph/Twitter image per public route via `meta()`
- [x] `metadataBase` / canonicals use `NEXT_PUBLIC_CANONICAL_ORIGIN` (never a vercel.app staging host)
- [x] Staging/preview: `robots.txt` disallows `/`, HTML robots noindex, `X-Robots-Tag` on preview via `next.config`
- [x] Pre-launch Florida routes: `noindex` in metadata + `X-Robots-Tag` in middleware
- [x] Thank-you, `/admin`, `/api` send `X-Robots-Tag: noindex` and are excluded from the sitemap
- [x] Sitemap lists only canonical, indexable 200 pages; Florida pre-launch omitted; `lastModified` is a content date, not `new Date()` at build
- [x] Production sitemap/robots URLs point at the intended domain (`https://stonecraftpros.com`) pending owner confirmation
- [x] Optional `/llms.txt` facts index; no private/admin/API routes
- [x] `OAI-SearchBot` and `OAI-AdsBot` allowed in production robots, same private disallows
- [x] Brand favicon set + web manifest (`theme_color` `#25292B`) wired through Next metadata

## Schema
- [x] `Organization` + `ProfessionalService` + `WebSite` in the root layout (stable `@id`s)
- [x] `areaServed` lists **live** markets only (Greater Boston today)
- [x] `Service`, `WebPage`, `BreadcrumbList`, `FAQPage` (visible Q&A only), `Article` on guides
- [x] Pre-launch Florida hubs do not emit a live `ProfessionalService` business node
- [x] JSON-LD escapes `<` via `JsonLd`
- [x] No `AggregateRating`, review stars, invented street address, phone (until configured), or fake credentials

## Content / AEO
- [x] Homepage H1, eyebrow, lead and CTAs match the Phase 3 brief
- [x] Answer-first treatment of restore vs replace, colour seal vs clear seal, marble finish, photo vs onsite, commercial phasing
- [x] Region selector + site-wide banner tell the truth: Boston live, Florida confirming
- [x] Six material-specific guides published; no universal chemical prescriptions
- [x] Independently owned / not a franchise stated in footer, about, schema and `llms.txt`
- [x] Stock photography remains labelled Illustrative

## Still owner-gated
- [ ] Confirm production domain and set `NEXT_PUBLIC_INDEXABLE_SITE=true` (or attach the custom domain) before production indexing
- [ ] Search Console + GA4/GTM/Ads/Meta/OpenAI Ads IDs
- [ ] Do not set `MARKET_FL_STATUS=live` without staffing, licence and owner sign-off
- [ ] Approved project photography, reviews, licences, insurance, legal entity
