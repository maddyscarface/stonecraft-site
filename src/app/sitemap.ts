import type { MetadataRoute } from "next";
import { abs } from "@/lib/seo";
import { markets } from "@/config/markets";
import { coreCities } from "@/config/cities";
import { services } from "@/config/services";
import { commercialSegments } from "@/config/segments";
import { articles } from "@/config/resources";

export default function sitemap(): MetadataRoute.Sitemap {
  const live = new Set(markets.filter((m) => m.status === "live").map((m) => m.id));
  const paths = [
    "/", "/residential", "/renters", "/renters/landlord-approval", "/landlords", "/commercial", "/commercial/capabilities", "/bathroom-refresh", "/free-assessment", "/commercial-site-assessment", "/gallery", "/about", "/process", "/service-areas", "/resources", "/contact", "/privacy", "/terms",
    ...commercialSegments.map((s) => s.path),
    ...services.map((s) => `/services/${s.slug}`),
    ...articles.map((a) => `/resources/${a.slug}`),
    // Pre-launch markets are noindexed and excluded from the sitemap.
    ...markets.filter((m) => live.has(m.id)).flatMap((m) => [`/${m.slug}`, ...coreCities(m.id).map((c) => `/${m.slug}/${c.slug}`)]),
  ];
  return paths.map((p) => ({ url: abs(p), lastModified: new Date("2026-11-02"), changeFrequency: "monthly", priority: p === "/" ? 1 : p.includes("assessment") ? 0.9 : 0.7 }));
}
