"use client";
import Link from "next/link";
import { useMarket } from "./MarketContext";

export type RegionOption = {
  id: "boston" | "south-florida";
  slug: string;
  shortName: string;
  name: string;
  status: "live" | "pre-launch";
  statusNote?: string;
};

/**
 * Truthful market selector for the homepage hero. Selecting a region is remembered
 * for UI (hours, email, wordmark) but does not change CRM routing — leads are routed
 * from the property ZIP.
 */
export function RegionSelector({ markets }: { markets: RegionOption[] }) {
  const { market, setMarket } = useMarket();
  return (
    <div className="mt-10 max-w-xl" data-testid="region-selector">
      <p className="eyebrow text-bronze-light">Where we work</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-label="Service region">
        {markets.map((m) => {
          const selected = m.id === market;
          const live = m.status === "live";
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMarket(m.id)}
              aria-pressed={selected}
              data-testid={`region-${m.id}`}
              className={`min-h-11 rounded-sm border px-4 py-3 text-left transition ${
                selected ? "border-bronze-light bg-bronze-light text-basalt" : "border-white/25 bg-basalt/40 text-bone hover:border-bronze-light/70"
              }`}
            >
              <span className="block font-serif text-lg leading-tight">{m.name}</span>
              <span className={`mt-1 block text-[12px] font-bold uppercase tracking-[0.14em] ${selected ? "text-basalt/70" : "text-bronze-light"}`}>
                {live ? "Now serving" : "Availability being confirmed"}
              </span>
            </button>
          );
        })}
      </div>
      {markets.map((m) =>
        m.id === market ? (
          <p key={m.id} className="mt-3 text-sm leading-relaxed text-bone/75">
            {m.status === "live"
              ? `${m.name} is currently served. `
              : m.statusNote ?? `${m.name} is not a launched service area yet. `}
            <Link href={`/${m.slug}`} className="underline decoration-bronze-light/70 underline-offset-4 hover:decoration-bronze-light">
              View {m.shortName} details
            </Link>
            .
          </p>
        ) : null,
      )}
    </div>
  );
}
