import type { Metadata } from "next";
import { site } from "@/config/site";
import type { Market } from "@/config/markets";
import type { FAQ } from "@/config/services";

/** True on staging/preview deployments: every page is noindex and robots.txt blocks all. */
export const isNoindexEnv = () => process.env.SITE_NOINDEX === "true" || process.env.VERCEL_ENV === "preview";

export const abs = (path: string) => `${site.primaryDomain.replace(/\/$/, "")}${path}`;

export function meta(opts: { title: string; description: string; path: string; noindex?: boolean }): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: abs(opts.path) },
    robots: isNoindexEnv() ? { index: false, follow: false } : opts.noindex ? { index: false, follow: true } : undefined,
    openGraph: { title: opts.title, description: opts.description, url: abs(opts.path), type: "website", siteName: "StoneCraft", images: [{ url: abs("/og.png"), width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description },
  };
}

/**
 * Service-area business schema. No street address is published (no storefront);
 * areaServed lists the cities actually configured. aggregateRating is omitted until
 * real review data exists.
 */
export function businessSchema(m: Market, cityNames: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": abs(`/${m.slug}#business`),
    name: m.brandName,
    url: abs(`/${m.slug}`),
    ...(m.phoneE164 ? { telephone: m.phoneE164 } : {}),
    email: m.email,
    description: site.supporting,
    areaServed: cityNames.map((name) => ({ "@type": "City", name: `${name}, ${m.state}` })),
    address: { "@type": "PostalAddress", addressRegion: m.state, addressCountry: "US" },
    knowsAbout: ["Tile restoration", "Grout cleaning", "Grout colour sealing", "Shower restoration", "Marble restoration", "Natural stone polishing", "Caulk replacement"],
  };
}

export function serviceSchema(opts: { name: string; description: string; path: string; areaServed: string[] }) {
  return {
    "@context": "https://schema.org", "@type": "Service",
    serviceType: opts.name, name: opts.name, description: opts.description, url: abs(opts.path),
    provider: { "@type": "Organization", name: "StoneCraft", url: site.primaryDomain },
    areaServed: opts.areaServed.map((a) => ({ "@type": "AdministrativeArea", name: a })),
  };
}

export function faqSchema(faq: FAQ[]) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })) };
}

export function articleSchema(a: { title: string; description: string; path: string; date: string }) {
  return { "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.description, url: abs(a.path), datePublished: a.date, dateModified: a.date, author: { "@type": "Organization", name: "StoneCraft" }, publisher: { "@type": "Organization", name: "StoneCraft" } };
}
