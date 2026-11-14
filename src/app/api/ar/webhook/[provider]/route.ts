import { arAdapters } from "@/lib/ar/adapters";
import { arProviders, type ArProviderId } from "@/lib/ar/contract";

export const runtime = "nodejs";
const h = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

/** AR provider webhooks — contract only. Every provider is disabled, so this always answers 404 without reading state. */
export async function POST(_req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!(arProviders as readonly string[]).includes(provider) || arAdapters[provider as ArProviderId].status() !== "configured_unverified") {
    return new Response(JSON.stringify({ ok: false, error: "AR provider disabled" }), { status: 404, headers: h });
  }
  return new Response(JSON.stringify({ ok: false, error: "Not implemented" }), { status: 501, headers: h });
}
