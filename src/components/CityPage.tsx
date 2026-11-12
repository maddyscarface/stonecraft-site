import Link from "next/link";
import { notFound } from "next/navigation";
import { Checklist, Faq, FinalCta, Heading, JsonLd, PageHero, PriceGuide, Section, ServiceGrid } from "@/components/blocks";
import { LeadForm } from "@/components/LeadForm";
import { getMarket, markets } from "@/config/markets";
import { coreCities, findCity, type MarketId } from "@/config/cities";
import { breadcrumbSchema, faqSchema, meta, serviceSchema } from "@/lib/seo";

export const cityParams = (market: string) => coreCities(market as MarketId).map((c) => ({ city: c.slug }));

function load(market: string, city: string) {
  const m = getMarket(market);
  const c = m ? findCity(m.id as MarketId, city) : undefined;
  return m && c && c.tier === "core" ? { m, c } : null;
}

export function cityMetadata(market: string, city: string) {
  const d = load(market, city);
  if (!d) return {};
  return meta({ title: `Tile, Grout & Stone Restoration in ${d.c.name}, ${d.c.state} | ${d.m.brandName}`, description: `Shower, grout, tile and marble restoration in ${d.c.name}, ${d.c.state} for homeowners, renters, landlords and facilities. Free photo assessment.`, path: `/${d.m.slug}/${d.c.slug}`, noindex: d.m.status !== "live" });
}

export function CityPage({ market, city }: { market: string; city: string }) {
  const d = load(market, city);
  if (!d) notFound();
  const { m, c } = d;
  const zone = m.zones.find((z) => z.citySlugs.includes(c.slug));
  const nearby = coreCities(m.id).filter((x) => x.slug !== c.slug && zone?.citySlugs.includes(x.slug)).slice(0, 6);
  const faq = [
    { q: `Do you serve ${c.name}?`, a: `Yes${m.status === "pre-launch" ? ", subject to scheduling availability we're confirming now" : ""}. ${c.name} is part of our ${zone?.name ?? m.name} service area.` },
    { q: `What surface problems are common in ${c.name}?`, a: `${c.housing} The issues we're most often asked about are: ${c.commonIssues.join("; ").toLowerCase()}.` },
    { q: "How soon can you come out?", a: "We start with photos, so you can get an assessment without a visit. Appointment availability depends on the scheduling day for your area; we'll offer the next openings when we reply." },
    { q: "Do you work in condos and managed buildings?", a: "Yes. Tell us about building rules—work hours, elevator reservations, insurance certificates—and we'll plan around them." },
  ];
  return (
    <>
      <JsonLd data={serviceSchema({ name: "Tile, grout and stone restoration", description: c.intro, path: `/${m.slug}/${c.slug}`, areaServed: [`${c.name}, ${c.state}`] })} />
      <JsonLd data={faqSchema(faq)} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: m.name, path: `/${m.slug}` }, { name: c.name, path: `/${m.slug}/${c.slug}` }])} />
      <PageHero image={m.id === "boston" ? "boston-brownstone-autumn" : "florida-palm"} eyebrow={m.brandName} title={`Tile, Grout & Stone Restoration in ${c.name}, ${c.state}`} sub={c.intro} primary={{ label: "Get a Photo Assessment", href: "#get-started" }} secondary={{ label: "Commercial Property Services", href: "/commercial" }} note={m.status === "pre-launch" ? m.statusNote : undefined} />
      <Section>
        <div className="grid gap-10 md:grid-cols-2">
          <div><Heading eyebrow={`${c.name} properties`} title="What we see most often" sub={c.housing} /><Checklist items={c.commonIssues} /></div>
          <div className="space-y-5">
            {c.neighborhoods && <div className="rounded-lg bg-white p-6 shadow-card"><p className="font-semibold">Areas within {c.name}</p><p className="mt-2 text-sm">{c.neighborhoods.join(" · ")}</p></div>}
            <PriceGuide show={m.showPriceRanges} />
            {c.localProof?.length ? <div className="rounded-lg bg-white p-6 shadow-card"><p className="font-semibold">Recent local work</p><ul className="mt-2 list-disc pl-5 text-sm">{c.localProof.map((p) => <li key={p}>{p}</li>)}</ul></div> : null}
          </div>
        </div>
      </Section>
      <Section tone="white"><Heading eyebrow="Services" title={`Services in ${c.name}`} /><ServiceGrid /></Section>
      <Section id="get-started"><div className="grid gap-10 md:grid-cols-[1fr_1.4fr]"><Heading eyebrow="Free assessment" title={`Send photos from your ${c.name} property`} sub="Takes about two minutes." /><LeadForm town={c.name} zip={c.zips.length === 1 ? c.zips[0] : undefined} sourcePage={`/${m.slug}/${c.slug}`} /></div></Section>
      <Section tone="white"><Heading center title={`${c.name} FAQ`} /><Faq items={faq} />
        {nearby.length > 0 && <div className="mt-10 text-center"><p className="text-sm text-hunter/70">Nearby:</p><div className="mt-2 flex flex-wrap justify-center gap-2">{nearby.map((n) => <Link key={n.slug} href={`/${m.slug}/${n.slug}`} className="rounded-full border border-hunter px-3 py-1 text-sm hover:bg-hunter hover:text-white">{n.name}</Link>)}</div></div>}
      </Section>
      <FinalCta />
    </>
  );
}
