import type { MetadataRoute } from "next";
import { abs, isNoindexEnv } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  // Staging / preview deployments: block everything.
  if (isNoindexEnv()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [
    { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/thank-you"] },
    // ChatGPT ads review + ChatGPT search must be able to read landing pages.
    { userAgent: ["OAI-AdsBot", "OAI-SearchBot"], allow: "/", disallow: ["/admin", "/api"] },
  ], sitemap: abs("/sitemap.xml") };
}
