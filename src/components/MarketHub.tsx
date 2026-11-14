import Link from "next/link";
import { marketImage } from "@/config/photos";
import { notFound } from "next/navigation";
import { Faq, FinalCta, Heading, JsonLd, PageHero, PriceGuide, ProcessSteps, Section, SegmentGrid, ServiceGrid, TrustBar } from "@/components/blocks";
import { LeadForm } from "@/components/LeadForm";
import { getMarket, markets } from "@/config/markets";
import { citiesFor, coreCities } from "@/config/cities";
import { FL_COUNTIES } from "@/config/florida-areas";
import { businessSchema, faqSchema, meta, webPageSchema } from "@/lib/seo";


export function hubMetadata(slug: string) {
  const m = getMarket(slug);
  if (!m) return {};
  return meta({ title: `Tile, Grout & Stone Restoration in ${m.name} | ${m.brandName}`, description: `Shower, tile, grout, marble and stone restoration for homes, rentals and commercial properties across ${m.name}. Free photo assessment.`, path: `/${m.slug}`, noindex: m.status !== "live" });
}

export function MarketHub({ slug }: { slug: string }) {
  const m = getMarket(slug);
  if (!m) notFound();
  const all = citiesFor(m.id);
  const core = coreCities(m.id);
  const faq = [
    { q: `Which parts of ${m.name} do you serve?`, a: m.status === "pre-launch" ? `${m.statusNote ?? "Scheduling availability is being confirmed."} ${m.serviceAreaLabel} describes the area we intend to serve if and when this market is approved — it is not a claim that coverage is already live.` : `${m.serviceAreaLabel}. If your town isn't listed, send your ZIP code and we'll confirm.` },
    { q: "Do you have a showroom or office I can visit?", a: "No. We're a service-area business: we come to you, and assessments start with photos." },
    { q: "How is pricing set?", a: "From your photos and, if needed, a short video call or site check. We don't publish price lists; you'll receive a written, owner-approved scope and price before anything is booked." },
  ];
  return (
    <>
      <JsonLd data={webPageSchema({ title: `Tile, Grout & Stone Restoration in ${m.name} | ${m.brandName}`, description: `Shower, tile, grout, marble and stone restoration for homes, rentals and commercial properties across ${m.name}.`, path: `/${m.slug}` })} />
      {m.status === "live" && <JsonLd data={businessSchema(m, all.map((c) => c.name), m.id === "south-florida" ? FL_COUNTIES.map((k) => k.name) : [])} />}
      <JsonLd data={faqSchema(faq)} />
      <PageHero image={marketImage[m.id]} eyebrow={m.brandName} title={`Tile, Grout & Stone Restoration Across ${m.name}`} sub={`Professional restoration for homeowners, renters, landlords and commercial facilities. ${m.serviceAreaLabel}.`} primary={{ label: "Get a Photo Assessment", href: "#get-started" }} secondary={{ label: "Commercial Property Services", href: "/commercial" }} note={m.status === "pre-launch" ? m.statusNote : undefined} />
      <TrustBar />
      <Section><Heading eyebrow="Services" title={`What we restore in ${m.name}`} /><ServiceGrid /></Section>
      <Section tone="white"><Heading eyebrow="Who we serve" title="Find your path" /><SegmentGrid ids={["homeowners", "renters", "landlords"]} /></Section>
      <Section><Heading eyebrow="Where we work" title={`${m.name} service area`} />
        <div className="flex flex-wrap gap-2">{core.map((c) => <Link key={c.slug} href={`/${m.slug}/${c.slug}`} className="rounded-full border border-hunter px-3.5 py-1.5 text-sm hover:bg-hunter hover:text-white">{c.name}</Link>)}
        {all.filter((c) => c.tier === "supporting").map((c) => <span key={c.slug} className="rounded-full border border-cream-dark px-3.5 py-1.5 text-sm text-hunter/70">{c.name}</span>)}</div>
        {m.id === "south-florida" && <div className="mt-8 grid gap-4 sm:grid-cols-2" data-testid="fl-county-links">{FL_COUNTIES.map((k) => <Link key={k.id} href={`/${m.slug}/${k.slug}`} className="group block border border-hunter/30 bg-white p-5 hover:border-hunter"><p className="font-serif text-2xl">{k.name}</p><p className="mt-1 text-sm text-hunter/70">{k.housing}</p><span className="mt-3 inline-block text-sm font-semibold underline underline-offset-2">Explore {k.name}</span></Link>)}</div>}
        <div className="mt-8"><PriceGuide /></div>
      </Section>
      <Section tone="hunter"><Heading light eyebrow="How it works" title="Photos first. No pressure." /><ProcessSteps light /></Section>
      <Section id="get-started"><div className="mx-auto max-w-3xl"><LeadForm sourcePage={`/${m.slug}`} /></div></Section>
      <Section tone="white"><Heading center title="Questions" /><Faq items={faq} /></Section>
      <FinalCta />
    </>
  );
}
