"use client";
import Link from "next/link";
import { useMarket } from "./MarketContext";

export type BannerMarket = { id: "boston" | "south-florida"; name: string; status: "live" | "pre-launch"; statusNote?: string };

/** Shown site-wide when a pre-launch market is selected, so a landing page never implies that market is already live. */
export function MarketStatusBanner({ markets }: { markets: BannerMarket[] }) {
  const { market } = useMarket();
  const m = markets.find((x) => x.id === market);
  if (!m || m.status === "live") return null;
  return (
    <div className="no-print border-b border-basalt/10 bg-linen px-4 py-2.5 text-center text-sm text-basalt" data-testid="market-status-banner" role="status">
      {m.statusNote ?? `${m.name} availability is being confirmed.`}{" "}
      <Link href="/free-assessment" className="font-semibold underline underline-offset-2">Send photos</Link>
      {" "}and we&apos;ll tell you when we can serve your address.{" "}
      <Link href="/boston" className="font-semibold underline underline-offset-2">Greater Boston is currently served</Link>.
    </div>
  );
}
