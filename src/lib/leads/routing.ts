import { cityByZip } from "@/config/cities";
import { markets, type Market } from "@/config/markets";
import { detectZone } from "@/lib/scheduling/engine";
import type { LeadInput } from "./schema";

export type Pipeline = "residential" | "commercial" | "property_manager";

export type Routing = {
  market: Market | null;
  marketId: string | null;
  zoneId: string | null;
  zoneName: string | null;
  inMarket: boolean;
  inActiveZone: boolean;
  marketStatus: Market["status"] | null;
  pipeline: Pipeline;
  city: string | null;
  tags: string[];
};

/** Determine market from ZIP. FL ZIPs begin 32–34, MA ZIPs 010–027. */
export function marketForZip(zip: string): Market | null {
  const z = zip.slice(0, 5);
  for (const m of markets) {
    if (m.zones.some((zone) => detectZone({ zip: z }, [zone], { includeInactive: true }))) return m;
  }
  const n = Number(z.slice(0, 3));
  if (n >= 10 && n <= 27) return markets.find((m) => m.id === "boston") ?? null;
  if (n >= 320 && n <= 349) return markets.find((m) => m.id === "south-florida") ?? null;
  return null;
}

export function routeLead(lead: LeadInput): Routing {
  const market = marketForZip(lead.zip);
  const activeZone = market ? detectZone({ zip: lead.zip, town: lead.town }, market.zones) : null;
  const anyZone = market ? detectZone({ zip: lead.zip, town: lead.town }, market.zones, { includeInactive: true }) : null;
  const city = cityByZip(lead.zip)?.name || lead.town || null;

  const pipeline: Pipeline =
    lead.variant === "commercial" ? (lead.segment === "property-management" ? "property_manager" : "commercial")
    : lead.variant === "landlord" && (lead.isPropertyManager || lead.units >= 5) ? "property_manager"
    : "residential";

  const tags = [
    `market:${market?.id ?? "unknown"}`,
    `type:${lead.customerType}`,
    `variant:${lead.variant}`,
    `pipeline:${pipeline}`,
    activeZone ? `zone:${activeZone.id}` : anyZone ? `zone:${anyZone.id}:inactive` : "zone:none",
    market?.status === "pre-launch" ? "market:pre-launch" : "",
    lead.photoKeys.length ? "photos:received" : "photos:none",
    lead.variant === "commercial" ? `segment:${lead.segment}` : "",
    lead.variant === "renter" && lead.landlordOutreachConsent ? "renter:landlord-outreach-authorised" : "",
    lead.smsConsent ? "sms:opt-in" : "sms:no-consent",
  ].filter(Boolean);

  return {
    market, marketId: market?.id ?? null,
    zoneId: activeZone?.id ?? null, zoneName: activeZone?.name ?? null,
    inMarket: !!market, inActiveZone: !!activeZone,
    marketStatus: market?.status ?? null,
    pipeline, city, tags,
  };
}
