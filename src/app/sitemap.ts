import type { MetadataRoute } from "next";
import { abs, CONTENT_UPDATED } from "@/lib/seo";
import { markets } from "@/config/markets";
import { coreCities } from "@/config/cities";
import { FL_COUNTIES } from "@/config/florida-areas";
import { services } from "@/config/services";
import { commercialSegments } from "@/config/segments";
import { articles } from "@/config/resources";

export default function sitemap(): MetadataRoute.Sitemap {
  const live = new Set(markets.filter((m) => m.status === "live").map((m) => m.id));
  const paths: { path: string; lastModified: string; priority: number }[] = [
    { path: "/", lastModified: CONTENT_UPDATED, priority: 1 },
    { path: "/residential", lastModified: CONTENT_UPDATED, priority: 0.8 },
    { path: "/renters", lastModified: "2026-11-02", priority: 0.7 },
    { path: "/renters/landlord-approval", lastModified: "2026-11-02", priority: 0.6 },
    { path: "/landlords", lastModified: "2026-11-02", priority: 0.7 },
    { path: "/commercial", lastModified: CONTENT_UPDATED, priority: 0.8 },
    { path: "/commercial/capabilities", lastModified: "2026-11-02", priority: 0.6 },
    { path: "/bathroom-refresh", lastModified: "2026-11-02", priority: 0.7 },
    { path: "/free-assessment", lastModified: CONTENT_UPDATED, priority: 0.9 },
    { path: "/commercial-site-assessment", lastModified: CONTENT_UPDATED, priority: 0.9 },
    { path: "/gallery", lastModified: "2026-11-02", priority: 0.5 },
    { path: "/about", lastModified: CONTENT_UPDATED, priority: 0.6 },
    { path: "/process", lastModified: "2026-11-02", priority: 0.6 },
    { path: "/service-areas", lastModified: CONTENT_UPDATED, priority: 0.7 },
    { path: "/resources", lastModified: CONTENT_UPDATED, priority: 0.7 },
    { path: "/contact", lastModified: "2026-11-02", priority: 0.6 },
    { path: "/privacy", lastModified: "2026-11-02", priority: 0.3 },
    { path: "/terms", lastModified: "2026-11-02", priority: 0.3 },
    ...commercialSegments.map((s) => ({ path: s.path, lastModified: CONTENT_UPDATED, priority: 0.7 })),
    ...services.map((s) => ({ path: `/services/${s.slug}`, lastModified: CONTENT_UPDATED, priority: 0.8 })),
    ...articles.map((a) => ({ path: `/resources/${a.slug}`, lastModified: a.date, priority: 0.7 })),
    // Pre-launch markets are noindexed and excluded from the sitemap.
    ...markets.filter((m) => live.has(m.id)).flatMap((m) => [
      { path: `/${m.slug}`, lastModified: CONTENT_UPDATED, priority: 0.8 },
      ...(m.id === "south-florida" ? FL_COUNTIES.map((k) => ({ path: `/${m.slug}/${k.slug}`, lastModified: CONTENT_UPDATED, priority: 0.75 })) : []),
      ...coreCities(m.id).map((c) => ({ path: `/${m.slug}/${c.slug}`, lastModified: CONTENT_UPDATED, priority: 0.7 })),
    ]),
  ];
  return paths.map((p) => ({
    url: abs(p.path),
    lastModified: new Date(p.lastModified),
    changeFrequency: p.path === "/" ? "weekly" : "monthly",
    priority: p.priority,
  }));
}
