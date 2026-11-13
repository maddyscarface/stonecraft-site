"use client";
import Link from "next/link";
import { useMarket } from "./MarketContext";

export type BannerMarket = { id: "boston" | "south-florida"; name: string; status: "live" | "pre-launch"; statusNote?: string };

/** Drop a trailing "Send photos…" clause so the banner can attach that sentence once, as a link. */
export function marketBannerIntro(statusNote?: string, name = "This market") {
  const raw = statusNote ?? `${name} availability is being confirmed.`;
  return raw.replace(/\s*Send photos and we'll tell you when we can serve your address\.?\s*/i, " ").replace(/\s+/g, " ").trim();
}

/** Shown site-wide when a pre-launch market is selected, so a landing page never implies that market is already live. */
export function MarketStatusBanner({ markets }: { markets: BannerMarket[] }) {
  const { market } = useMarket();
  const m = markets.find((x) => x.id === market);
  if (!m || m.status === "live") return null;
  const intro = marketBannerIntro(m.statusNote, m.name);
  return (
    <div className="no-print border-b border-basalt/10 bg-linen px-4 py-2.5 text-sm text-basalt" data-testid="market-status-banner" role="status">
      <p className="mx-auto max-w-3xl text-pretty text-center leading-relaxed">
        {intro}{" "}
        <Link href="/free-assessment" className="whitespace-nowrap font-semibold underline underline-offset-2">Send photos</Link>
        {" "}and we&apos;ll tell you when we can serve your address.{" "}
        <Link href="/boston" className="whitespace-nowrap font-semibold underline underline-offset-2">Greater Boston is currently served</Link>.
      </p>
    </div>
  );
}
