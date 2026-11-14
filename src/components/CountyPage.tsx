import Link from "next/link";
import { notFound } from "next/navigation";
import { Checklist, Faq, FinalCta, Heading, JsonLd, PageHero, PriceGuide, Section, ServiceGrid } from "@/components/blocks";
import { LeadForm } from "@/components/LeadForm";
import { getMarket } from "@/config/markets";
import { FL_AREA_CITIES, flCounty } from "@/config/florida-areas";
import { breadcrumbSchema, businessSchema, faqSchema, meta, serviceSchema, webPageSchema } from "@/lib/seo";

/** Southeast Florida county landing pages (/south-florida/palm-beach-county, /south-florida/broward-county). */
export const isCountySlug = (slug: string) => Boolean(flCounty(slug) && flCounty(slug)!.slug === slug);

export function countyMetadata(slug: string) {
  const k = flCounty(slug), m = getMarket("south-florida");
  if (!k || !m) return {};
  return meta({ title: `Tile, Grout & Stone Restoration in ${k.name}, FL | ${m.brandName}`, description: `Shower, grout, tile and marble restoration across ${k.name}, Florida for homes, condos, rentals and commercial facilities. Free photo assessment.`, path: `/${m.slug}/${k.slug}`, noindex: m.status !== "live" });
}

export function CountyPage({ slug }: { slug: string }) {
  const k = flCounty(slug), m = getMarket("south-florida");
  if (!k || !m || k.slug !== slug) notFound();
  const list = FL_AREA_CITIES.filter((c) => c.county === k.id);
  const paged = list.filter((c) => c.page), listed = list.filter((c) => !c.page);
  const path = `/${m.slug}/${k.slug}`;
  const faq = [
    { q: `Do you serve all of ${k.name}?`, a: `We serve ${k.name} as part of our Southeast Florida market. The main towns are listed on this page; send your ZIP code with your photos and we'll confirm the scheduling day for your street.` },
    { q: "Do you work in condominiums and HOA communities?", a: "Yes. Tell us about association rules—work hours, elevator reservations, vendor insurance certificates—and we'll plan around them." },
    { q: "Can you work while a seasonal residence is unoccupied?", a: "Often, yes. Access arrangements are agreed in writing before any work is booked." },
    { q: "How is pricing set?", a: "From your photos or guided walkthrough and, if needed, a short video call or site check. You receive a written, owner-approved scope and price before anything is booked." },
  ];
  return (
    <>
      <JsonLd data={webPageSchema({ title: `Tile, Grout & Stone Restoration in ${k.name}, FL`, description: k.intro, path })} />
      <JsonLd data={serviceSchema({ name: "Tile, grout and stone restoration", description: k.intro, path, areaServed: [`${k.name}, FL`, ...paged.map((c) => `${c.name}, FL`)] })} />
      {m.status === "live" && <JsonLd data={{ ...businessSchema(m, list.map((c) => c.name), [k.name]), "@id": undefined }} />}
      <JsonLd data={faqSchema(faq)} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: m.name, path: `/${m.slug}` }, { name: k.name, path }])} />
      <PageHero image={k.id === "broward" ? "florida-coastal-building" : "florida-palm"} eyebrow={m.brandName} title={`Tile, Grout & Stone Restoration in ${k.name}, FL`} sub={k.intro} primary={{ label: "Get a Photo Assessment", href: "#get-started" }} secondary={{ label: "Commercial Property Services", href: "/commercial" }} />
      <Section>
        <div className="grid gap-10 md:grid-cols-2">
          <div><Heading eyebrow={`${k.name} properties`} title="What we see most often" sub={k.housing} /><Checklist items={k.commonIssues} /></div>
          <div className="space-y-5">
            <div className="rounded-lg bg-white p-6 shadow-card" data-testid="county-cities">
              <p className="font-semibold">Major towns in {k.name}</p>
              <div className="mt-3 flex flex-wrap gap-2">{paged.map((c) => <Link key={c.slug} href={`/${m.slug}/${c.slug}`} className="rounded-full border border-hunter px-3 py-1 text-sm hover:bg-hunter hover:text-white">{c.name}</Link>)}
                {listed.map((c) => <span key={c.slug} className="rounded-full border border-cream-dark px-3 py-1 text-sm text-hunter/70">{c.name}</span>)}</div>
              <p className="mt-3 text-xs text-hunter/60">Not listed? Send your ZIP code and we&apos;ll confirm.</p>
            </div>
            <PriceGuide />
          </div>
        </div>
      </Section>
      <Section tone="white"><Heading eyebrow="Services" title={`Services in ${k.name}`} /><ServiceGrid /></Section>
      <Section id="get-started"><div className="grid gap-10 md:grid-cols-[1fr_1.4fr]"><Heading eyebrow="Free assessment" title={`Send photos from your ${k.name} property`} sub="Takes about two minutes. Prefer a step-by-step guide? Use the guided walkthrough link we send after you submit." /><LeadForm sourcePage={path} /></div></Section>
      <Section tone="white"><Heading center title={`${k.name} FAQ`} /><Faq items={faq} /></Section>
      <FinalCta />
    </>
  );
}
