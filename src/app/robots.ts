import type { MetadataRoute } from "next";
import { abs, isNoindexEnv } from "@/lib/seo";

const PRIVATE = ["/admin", "/api", "/thank-you", "/portal/", "/private/"];

export default function robots(): MetadataRoute.Robots {
  // Staging, preview, or unapproved production hosts: block everything.
  // The XML sitemap URL always points at the intended production origin, never a vercel.app staging host.
  if (isNoindexEnv()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      // ChatGPT ads review + ChatGPT search must be able to read landing pages.
      { userAgent: ["OAI-AdsBot", "OAI-SearchBot"], allow: "/", disallow: PRIVATE },
    ],
    sitemap: abs("/sitemap.xml"),
  };
}
