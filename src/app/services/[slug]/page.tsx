import { PricingViewBeacon } from "@/components/estimate/PricingViewBeacon";
import { serviceImage } from "@/config/photos";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Checklist, Faq, FinalCta, Heading, JsonLd, PageHero, PriceGuide, Section } from "@/components/blocks";
import { LeadForm } from "@/components/LeadForm";
import { TrackView } from "@/components/TrackView";
import { findService, services, publicPriceRanges, PRICE_RANGES_OWNER_REVIEWED } from "@/config/services";
import { articles } from "@/config/resources";
import { liveAreaServed } from "@/config/markets";
import { breadcrumbSchema, faqSchema, meta, serviceSchema, webPageSchema } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() { return services.map((s) => ({ slug: s.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const s = findService((await params).slug);
  return s ? meta({ title: s.seoTitle, description: s.metaDescription, path: `/services/${s.slug}` }) : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const s = findService((await params).slug);
  if (!s) notFound();
  const commercial = s.category === "commercial";
  const range = s.priceRangeKey && PRICE_RANGES_OWNER_REVIEWED ? publicPriceRanges[s.priceRangeKey] : undefined;
  return (
    <>
      <JsonLd data={webPageSchema({ title: s.seoTitle, description: s.metaDescription, path: `/services/${s.slug}` })} />
      <JsonLd data={serviceSchema({ name: s.name, description: s.intro, path: `/services/${s.slug}`, areaServed: liveAreaServed() })} />
      <JsonLd data={faqSchema(s.faq)} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Services", path: "/services/shower-restoration" }, { name: s.name, path: `/services/${s.slug}` }])} />
      <TrackView event="view_service" params={{ service: s.slug }} meta="ViewContent" />
      <PageHero image={serviceImage[s.slug]} eyebrow="Service" title={s.h1} sub={s.short} primary={commercial ? { label: "Request a Commercial Site Assessment", href: "/commercial-site-assessment" } : { label: "Get a Photo Assessment", href: "#get-started" }} secondary={commercial ? undefined : { label: "Commercial Property Services", href: "/commercial" }} />
      <Section>
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-lg leading-relaxed">{s.intro}</p>
            <h2 className="mt-8 font-serif text-2xl">What's included</h2>
            <div className="mt-3"><Checklist items={s.included} /></div>
            <h2 className="mt-8 font-serif text-2xl">Typical timing</h2>
            <p className="mt-2">{s.typicalDuration}</p>
          </div>
          <aside className="space-y-5">
            <div className="rounded-lg bg-white p-6 shadow-card"><h3 className="font-semibold">A good fit when…</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{s.goodFit.map((g) => <li key={g}>{g}</li>)}</ul></div>
            <div className="rounded-lg border border-amber bg-linen-pale p-6"><h3 className="font-semibold">When restoration isn't the answer</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{s.notFit.map((g) => <li key={g}>{g}</li>)}</ul><p className="mt-2 text-xs">We'll tell you if we see any of these.</p></div>
            {range && <div className="rounded-lg bg-white p-5 text-sm shadow-card"><PricingViewBeacon where={`service-${s.slug}`} /><p className="font-semibold">Greater Boston guidance: {range.range}</p><p className="mt-1 text-xs text-hunter/60">Guidance only; your written quote is the price. SE Florida priced after assessment.</p></div>}
          </aside>
        </div>
      </Section>
      {!commercial && <Section tone="white" id="get-started"><div className="grid gap-10 md:grid-cols-[1fr_1.4fr]"><Heading eyebrow="Free assessment" title={`Send photos of your ${s.name.toLowerCase()} project`} sub="We'll reply with what's possible and an honest estimate." /><LeadForm variant="residential" sourcePage={`/services/${s.slug}`} /></div></Section>}
      {commercial && <Section tone="white"><PriceGuide show={false} /><Link href="/commercial" className="btn btn-hunter mt-6">See commercial programs</Link></Section>}
      <Section><Heading center eyebrow="Questions" title={`${s.name} FAQ`} /><Faq items={s.faq} /></Section>
      <Section tone="white">
        <Heading eyebrow="Guides" title="Read before you decide" sub="Material-specific explanations. Technical choices still depend on a technician's review and the product instructions." />
        <ul className="grid gap-4 md:grid-cols-3">{articles.filter((a) => {
          const map: Record<string, string[]> = {
            "shower-restoration": ["restore-or-replace-shower-grout", "safe-cleaning-after-restoration", "grout-cleaning-vs-color-sealing"],
            "tile-grout-restoration": ["grout-cleaning-vs-color-sealing", "glazed-tile-and-high-gloss-finishes", "restore-or-replace-bathroom-tile"],
            "grout-color-sealing": ["grout-cleaning-vs-color-sealing", "glazed-tile-and-high-gloss-finishes", "safe-cleaning-after-restoration"],
            "regrouting-caulking": ["restore-or-replace-shower-grout", "safe-cleaning-after-restoration", "restore-or-replace-bathroom-tile"],
            "marble-stone-restoration": ["marble-etching-vs-staining", "safe-cleaning-after-restoration", "restore-or-replace-bathroom-tile"],
            "commercial-restoration": ["commercial-restroom-tile-maintenance-planning", "commercial-restroom-maintenance-after-restoration", "glazed-tile-and-high-gloss-finishes"],
          };
          return (map[s.slug] ?? ["grout-cleaning-vs-color-sealing", "restore-or-replace-bathroom-tile", "safe-cleaning-after-restoration"]).includes(a.slug);
        }).map((a) => <li key={a.slug}><Link href={`/resources/${a.slug}`} className="block rounded-lg bg-cream p-5 shadow-card transition hover:-translate-y-0.5"><h3 className="font-serif text-xl leading-snug">{a.title}</h3><p className="mt-2 text-sm text-basalt/70">{a.description}</p></Link></li>)}</ul>
      </Section>
      <FinalCta commercial={commercial} />
    </>
  );
}
