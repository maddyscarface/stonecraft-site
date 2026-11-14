import type { Metadata } from "next";
import { site } from "@/config/site";
import { CONTACT_EMAIL, type Market, liveAreaServed, liveMarkets, isMarketLive } from "@/config/markets";
import { FL_COUNTIES } from "@/config/florida-areas";
import type { FAQ } from "@/config/services";

/**
 * Intended production origin. Owner must confirm the custom domain before go-live
 * canonicals and Search Console. Never publish a Vercel staging host as the canonical.
 */
export const INTENDED_PRODUCTION_ORIGIN = "https://stonecraftpros.com";

/** Content date used in the sitemap for Phase 3 updates (not `new Date()` at build time). */
export const CONTENT_UPDATED = "2026-11-14";

export function canonicalOrigin(): string {
  const explicit = (process.env.NEXT_PUBLIC_CANONICAL_ORIGIN ?? "").replace(/\/$/, "");
  if (explicit && !explicit.includes("vercel.app")) return explicit;
  const fromSite = (process.env.NEXT_PUBLIC_SITE_URL ?? site.primaryDomain ?? INTENDED_PRODUCTION_ORIGIN).replace(/\/$/, "");
  if (!fromSite || fromSite.includes("vercel.app")) return INTENDED_PRODUCTION_ORIGIN;
  return fromSite;
}

export const abs = (path: string) => `${canonicalOrigin()}${path.startsWith("/") ? path : `/${path}`}`;

export function isPreviewOrForcedNoindex() {
  return process.env.SITE_NOINDEX === "true" || process.env.VERCEL_ENV === "preview";
}

/**
 * Production indexing is allowed only on a confirmed launch: an explicit custom-domain
 * env value that is not a vercel.app host, or NEXT_PUBLIC_INDEXABLE_SITE=true when
 * production still uses vercel.app. We inspect the raw env values (not the remapped
 * canonical) so a fallback to the intended domain cannot silently enable indexing.
 * Preview/staging is never indexable. Local `next start` is treated as indexable so SEO
 * checks can run against a production-like build.
 */
export function configuredPublicOrigin() {
  return (process.env.NEXT_PUBLIC_CANONICAL_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

export function isIndexableProduction() {
  if (isPreviewOrForcedNoindex()) return false;
  if (process.env.NEXT_PUBLIC_INDEXABLE_SITE === "true" && process.env.VERCEL_ENV === "production") return true;
  if (process.env.VERCEL_ENV === "production") {
    const configured = configuredPublicOrigin();
    return Boolean(configured) && !configured.includes("vercel.app");
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "development") return false;
  return !canonicalOrigin().includes("vercel.app");
}

/** True on staging/preview or unapproved production hosts: every page is noindex and robots.txt blocks all. */
export const isNoindexEnv = () => !isIndexableProduction();

export function meta(opts: { title: string; description: string; path: string; noindex?: boolean }): Metadata {
  const noindex = isNoindexEnv() || Boolean(opts.noindex);
  const url = abs(opts.path);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: isNoindexEnv() ? false : true } : { index: true, follow: true },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      type: "website",
      siteName: "StoneCraft",
      images: [{ url: abs("/og.png"), width: 1200, height: 630, alt: "StoneCraft — tile, grout and stone restoration" }],
    },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description, images: [abs("/og.png")] },
  };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "ProfessionalService"],
    "@id": abs("/#organization"),
    name: "StoneCraft",
    url: abs("/"),
    email: CONTACT_EMAIL,
    description: site.supporting,
    slogan: site.positioning,
    areaServed: liveAreaServed().map((name) => ({ "@type": "AdministrativeArea", name })),
    address: { "@type": "PostalAddress", addressRegion: "MA", addressCountry: "US" },
    knowsAbout: [
      "Tile restoration",
      "Grout cleaning",
      "Grout colour sealing",
      "Shower restoration",
      "Marble restoration",
      "Natural stone honing and polishing",
      "Caulk replacement",
    ],
    additionalProperty: {
      "@type": "PropertyValue",
      name: "Ownership",
      value: site.independenceStatement,
    },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": abs("/#website"),
    url: abs("/"),
    name: "StoneCraft",
    description: site.supporting,
    publisher: { "@id": abs("/#organization") },
    inLanguage: "en-US",
  };
}

export function webPageSchema(opts: { title: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": abs(`${opts.path}#webpage`),
    url: abs(opts.path),
    name: opts.title,
    description: opts.description,
    isPartOf: { "@id": abs("/#website") },
    about: { "@id": abs("/#organization") },
  };
}

/**
 * Service-area business schema for a live market only. No street address is published
 * (no storefront). areaServed lists configured cities. aggregateRating is omitted until
 * real review data exists. Callers must not emit this for pre-launch markets.
 */
export function businessSchema(m: Market, cityNames: string[], countyNames: string[] = []) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": abs(`/${m.slug}#business`),
    name: m.brandName,
    url: abs(`/${m.slug}`),
    ...(m.phoneE164 ? { telephone: m.phoneE164 } : {}),
    email: m.email,
    description: site.supporting,
    areaServed: [
      ...countyNames.map((name) => ({ "@type": "AdministrativeArea", name: `${name}, ${m.state}` })),
      ...cityNames.map((name) => ({ "@type": "City", name: `${name}, ${m.state}` })),
    ],
    address: { "@type": "PostalAddress", addressRegion: m.state, addressCountry: "US" },
    parentOrganization: { "@id": abs("/#organization") },
    knowsAbout: ["Tile restoration", "Grout cleaning", "Grout colour sealing", "Shower restoration", "Marble restoration", "Natural stone polishing", "Caulk replacement"],
  };
}

export function serviceSchema(opts: { name: string; description: string; path: string; areaServed?: string[] }) {
  const areas = opts.areaServed && opts.areaServed.length ? opts.areaServed : liveAreaServed();
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": abs(`${opts.path}#service`),
    serviceType: opts.name,
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    provider: { "@id": abs("/#organization"), "@type": "ProfessionalService", name: "StoneCraft", url: abs("/") },
    areaServed: areas.map((a) => ({ "@type": "AdministrativeArea", name: a })),
  };
}

export function faqSchema(faq: FAQ[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function articleSchema(a: { title: string; description: string; path: string; date: string; dateModified?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": abs(`${a.path}#article`),
    headline: a.title,
    description: a.description,
    url: abs(a.path),
    datePublished: a.date,
    dateModified: a.dateModified ?? a.date,
    author: { "@type": "Organization", name: "StoneCraft", url: abs("/") },
    publisher: { "@id": abs("/#organization") },
    mainEntityOfPage: { "@id": abs(`${a.path}#webpage`) },
  };
}

export function llmsTxt(): string {
  const origin = canonicalOrigin();
  return `# StoneCraft

> Tile, grout, shower and natural stone restoration in Greater Boston and Southeast Florida (Palm Beach County and Broward County). Independently owned and operated. Not a franchise.

- Website: ${origin}/
- Contact: ${origin}/contact
- Email: ${CONTACT_EMAIL}
- Services: See the public services linked from the website navigation.
- Geography: ${liveMarkets().map((m) => m.id === "south-florida" ? "Southeast Florida (Palm Beach County and Broward County)" : m.name).join(" and ")} are served. Exact streets are confirmed by ZIP code at assessment. See ${origin}/service-areas.
- Accuracy: No prices are published; every price is a written quote after owner review. No legal or engineering clearance is implied unless explicitly documented. Licensed stock photography is illustrative, not project photography.

## Public information
- Home: ${origin}/
- Photo assessment: ${origin}/free-assessment
- Commercial site walkthrough: ${origin}/commercial-site-assessment
- Services: ${origin}/services/shower-restoration
- Resources and guides: ${origin}/resources
- Process: ${origin}/process
- Service areas: ${origin}/service-areas
${liveMarkets().map((m) => `- ${m.name}: ${origin}/${m.slug}`).join("\n")}
${isMarketLive("south-florida") ? FL_COUNTIES.map((k) => `- ${k.name}, FL: ${origin}/south-florida/${k.slug}`).join("\n") + "\n" : ""}- About: ${origin}/about

Link only to canonical, verified public pages from sitemap.xml. Staging hosts are not canonical.

## Exclusions
Private cases, customer files, internal admin dashboards, API endpoints and customer inquiries are not public reference material.
`;
}
