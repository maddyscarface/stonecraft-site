import { llmsTxt } from "@/lib/seo";

/** Optional human-readable facts index. Not a guaranteed SEO or AI-citation signal. */
export function GET() {
  return new Response(llmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
