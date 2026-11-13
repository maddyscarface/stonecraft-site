import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BeforeAfter, MacroCompare, RoommateCalculator, ServiceSelector } from "@/components/interactive";
import { Checklist, Editorial, Faq, FinalCta, Heading, JsonLd, ProcessSteps, RestoreVsReplace, Section, SegmentGrid, ServiceGrid, TrustBar } from "@/components/blocks";
import { Photo } from "@/components/Photo";
import { beforeAfterPairs, marketImage, type PhotoKey } from "@/config/photos";
import { markets } from "@/config/markets";
import { coreCities } from "@/config/cities";
import { flags, site } from "@/config/site";
import { founder, publishableCaseStudies, publishableGallery } from "@/config/gallery";
import { faqSchema, meta, webPageSchema } from "@/lib/seo";
import { RegionSelector } from "@/components/RegionSelector";

export const metadata = meta({
  title: "Tile & Grout Restoration in Boston | StoneCraft",
  description: "Restore showers, tile, grout and natural stone in Greater Boston. Submit photos for a restoration assessment.",
  path: "/",
});

const FAQ = [
  { q: "How does the free photo assessment work?", a: "Send 3–4 photos through our form. We review them and reply with what we think is possible, what it would involve and an estimated price range. If we need to see it in person, we'll say so." },
  { q: "Can every bathroom be restored instead of replaced?", a: "No. If tile is loose, walls are soft or there's water damage behind the tile, restoration isn't the right answer. We'll tell you before you spend anything." },
  { q: "How long does a typical job take?", a: "Many residential jobs are completed in a day; some need a second visit for curing or repairs. Your quote states the expected schedule." },
  { q: "Do you work with renters?", a: "Yes, with written landlord approval before any work is booked. We can coordinate with your landlord if you authorise us to." },
  { q: "Do you serve commercial facilities?", a: "Yes. We scope hospitals, universities, hotels, HOAs and multifamily properties by area, schedule work into permitted windows and document completion." },
  { q: "Which areas do you serve?", a: "Greater Boston is currently served, including Boston, Cambridge, Brookline, Newton, MetroWest and nearby towns listed on our service-area pages. Southeast Florida (Palm Beach and Broward counties) is pre-launch: availability is being confirmed, and a landing page does not mean that market is already live." },
  { q: "Can stained grout be restored, or does it need replacement?", a: "Stained grout can often be cleaned and colour-sealed if the joints are sound. Regrouting is needed when grout is crumbling, missing, or stays damp because of a leak. Photos usually show which path is realistic; loose tile or soft walls mean restoration is not the answer." },
  { q: "What is the difference between grout colour sealing and regular sealing?", a: "A clear or impregnating sealer helps resist stains but leaves the existing colour, including blotches. Colour sealing applies a pigmented, protective coating so grout lines look uniform. Colour sealants generally will not bond reliably to epoxy grout; we confirm grout type from photos or a test area." },
  { q: "Can scratched marble be refinished without a high-gloss finish?", a: "Yes. Honing can remove light scratches and etching and leave a matte or satin finish. Polishing is optional and only used when a higher sheen is requested and suitable for the stone. We set the finish from a test area rather than forcing a glossy look." },
  { q: "How do photo-based estimates work, and when is an onsite review required?", a: "Most residential assessments start with 3–4 photos and a written range. An onsite review is required when photos cannot confirm substrate condition, hollow tile, moisture, unusual materials, or a complex commercial scope. We never promise that complex work can be priced or completed from photos alone." },
  { q: "How do commercial restoration projects stay operational during work?", a: "We scope by area, phase restroom or corridor closures so an alternative remains available, and schedule into permitted windows such as nights, weekends or academic breaks. Cure times are built into the plan. Facility rules are written into the scope after a site walk." },
];

export default function HomePage() {
  const gallery = publishableGallery().slice(0, 3);
  const cases = publishableCaseStudies();
  const problems: [string, string, PhotoKey][] = [
    ["Embedded soil & film", "Deep cleaning with surface-appropriate products and extraction lifts what mopping leaves behind.", "tile-scrub-cleaning"],
    ["Blotchy grout", "Colour sealing evens out grout lines and adds a protective, cleanable coating.", "bath-mosaic"],
    ["Failed caulk", "Old caulk comes out completely; new caulk goes onto clean, dry joints so it actually bonds.", "bath-tub-shower"],
    ["Etched marble", "Honing and polishing remove etching and dull spots and bring back an even finish.", "texture-marble-white"],
  ];
  return (
    <>
      <JsonLd data={webPageSchema({ title: "Tile & Grout Restoration in Boston | StoneCraft", description: "Restore showers, tile, grout and natural stone in Greater Boston. Submit photos for a restoration assessment.", path: "/" })} />
      <JsonLd data={faqSchema(FAQ)} />
      {/* 1 Hero */}
      <section className="relative isolate overflow-hidden bg-basalt text-white">
        <div className="absolute inset-0 -z-10"><Photo k="vanity-dark-marble" priority sizes="100vw" /><div className="photo-shade-side absolute inset-0" /></div>
        <div className="container-sc pt-16 pb-28 md:py-36">
          <p className="eyebrow mb-7 text-bronze-light"><span className="rule-bronze" /><span className="inline-block">StoneCraft</span> · <span className="inline-block">Restore more. Replace less.</span></p>
          <h1 className="max-w-4xl font-serif text-[36px] leading-[1.02] text-bone sm:text-[48px] md:text-[72px]">Tile, Grout and Stone Restoration in Greater Boston</h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-bone/85">StoneCraft restores showers, grout, tile and natural stone for homeowners and managed properties. Share photos for a written assessment, or request a commercial site walkthrough where service is available.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/free-assessment" className="btn btn-linen" data-testid="hero-cta">Get a Photo Assessment <ArrowRight size={15} /></Link>
            <Link href="/commercial-site-assessment" className="btn btn-ghost" data-testid="hero-cta-commercial">Commercial Site Walkthrough</Link>
          </div>
          <RegionSelector markets={markets.map((m) => ({ id: m.id, slug: m.slug, shortName: m.shortName, name: m.name, status: m.status, statusNote: m.statusNote }))} />
          <dl className="mt-16 grid max-w-3xl grid-cols-1 gap-6 border-t border-white/15 pt-8 text-sm sm:grid-cols-3">
            {[["Step one", "Send 3–4 photos. No visit needed to start."], ["Before any work", "A written scope and price you approve."], ["Our advice", "Restore first — and we say so when it can't be."]].map(([t, d]) => (
              <div key={t}><dt className="eyebrow text-bronze-light">{t}</dt><dd className="mt-2 text-bone/80">{d}</dd></div>
            ))}
          </dl>
        </div>
        <span className="stock-note absolute bottom-20 right-4 md:bottom-3">Illustrative photo</span>
      </section>

      {/* Two journeys (spec §1): residential photo estimate vs commercial walkthrough / program */}
      <section className="border-b border-basalt/10 bg-white">
        <div className="container-sc grid md:grid-cols-2">
          {[
            { k: "Residential", t: "Request a photo-based estimate", d: "Homes, condos, renters and landlords. Send a few photos; get an honest read and a written range before anyone visits.", href: "/free-assessment", cta: "Get a Photo Assessment", img: "shower-marble-glass" as PhotoKey },
            { k: "Commercial", t: "Request a walkthrough or recurring program", d: "Restrooms, lobbies and corridors for property managers, hospitality, education and healthcare facilities, scoped by area and scheduled around operations.", href: "/commercial-site-assessment", cta: "Request a Site Walkthrough", img: "restroom-elegant" as PhotoKey },
          ].map((j, n) => (
            <Link key={j.k} href={j.href} data-testid={`journey-${j.k.toLowerCase()}`} className={`group grid grid-cols-[96px_1fr] items-center gap-6 py-9 md:grid-cols-[132px_1fr] ${n === 0 ? "border-b border-basalt/10 md:border-b-0 md:border-r md:pr-10" : "md:pl-10"}`}>
              <div className="relative aspect-square overflow-hidden bg-basalt"><div className="absolute inset-0 transition duration-700 group-hover:scale-[1.06]"><Photo k={j.img} sizes="132px" /></div></div>
              <div>
                <p className="eyebrow text-sage-ink">{j.k}</p>
                <h2 className="mt-2 font-serif text-[26px] leading-tight md:text-[30px]">{j.t}</h2>
                <p className="mt-2 text-sm leading-relaxed text-basalt/70">{j.d}</p>
                <span className="link-arrow mt-4 text-bronze">{j.cta} <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 2 Studio intro + market selection */}
      <Section tone="white">
        <div className="grid gap-14 md:grid-cols-[1fr_1.1fr] md:items-end">
          <Heading eyebrow="A restoration company" title="Most tired bathrooms don't need a remodel. They need the right restoration." sub="Grout, caulk, soap film, etching and worn sealant are usually the problem — not the tile underneath. We restore what's sound, repair what's failing, and tell you plainly when replacement is the honest answer." />
          <div className="grid gap-5 sm:grid-cols-2">
            {markets.map((m) => (
              <Link key={m.id} href={`/${m.slug}`} className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden bg-basalt p-6 text-white">
                <div className="absolute inset-0 transition duration-700 group-hover:scale-[1.04]"><Photo k={marketImage[m.id]} sizes="(min-width:768px) 25vw, 50vw" /></div>
                <div className="photo-shade absolute inset-0" />
                <div className="relative">
                  {m.status === "pre-launch" && <p className="mb-3 inline-block bg-bronze-light px-2 py-1 text-[12px] font-bold uppercase tracking-[0.16em] text-basalt">Availability being confirmed</p>}
                  <p className="font-serif text-3xl leading-tight text-bone">{m.name}</p>
                  <p className="mt-2 text-sm text-bone/75">{m.serviceAreaLabel}</p>
                  <span className="link-arrow mt-4 text-bronze-light">Explore <ArrowUpRight size={14} /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Section>

      {/* 3 Verified trust */}
      <TrustBar />

      {/* 4 Before/after */}
      <Section tone="hunter">
        <div className="grid gap-12 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div>
            <Heading light eyebrow="In the detail" title="What wears out is rarely the tile." sub="Grout joints, caulk lines, glaze and polish carry the wear. Drag across each surface to see the kind of change restoration makes." />
            <p className="-mt-4 max-w-md text-xs leading-relaxed text-bone/60">These comparisons are illustrative: licensed stock photography with simulated wear, shown at the same camera angle. Real StoneCraft project photos appear only with the customer&apos;s written permission.</p>
          </div>
          {gallery.length ? (
            <div className="grid gap-6">{gallery.map((g) => <div key={g.id}><BeforeAfter before={g.before} after={g.after} alt={g.alt} /><p className="mt-2 text-sm text-bronze-light">{g.permission.allowsTown ? g.town : ""} · {g.service}</p></div>)}</div>
          ) : <MacroCompare dark pairs={beforeAfterPairs} />}
        </div>
        <div className="mt-16 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map(([t, b, img]) => (
            <div key={t} className="group relative min-h-[300px] overflow-hidden bg-basalt">
              <div className="absolute inset-0 opacity-40 transition duration-700 group-hover:scale-[1.04] group-hover:opacity-55"><Photo k={img} sizes="(min-width:1024px) 25vw, 50vw" /></div>
              <div className="absolute inset-0 bg-gradient-to-t from-basalt via-basalt/70 to-transparent" />
              <div className="relative flex h-full flex-col justify-end p-6"><h3 className="font-serif text-[26px] text-bone">{t}</h3><p className="mt-2 text-sm leading-relaxed text-bone/70">{b}</p></div>
            </div>
          ))}
        </div>
        <Link href="/gallery" className="link-arrow mt-10 text-bronze-light">View the gallery <ArrowRight size={14} /></Link>
      </Section>

      {/* 5 Residential services */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-6"><Heading eyebrow="Residential" title="Every hard surface in your home" /><Link href="/residential" className="link-arrow mb-12 text-basalt">For homeowners <ArrowRight size={14} /></Link></div>
        <ServiceGrid filter="residential" />
      </Section>

      {/* 6 Commercial services */}
      <section className="relative isolate overflow-hidden bg-basalt text-white">
        <div className="grid md:grid-cols-2">
          <div className="relative min-h-[360px] md:min-h-full"><Photo k="hotel-foyer-marble" sizes="(min-width:768px) 50vw, 100vw" note /></div>
          <div className="px-5 py-20 md:px-16 md:py-28">
            <Heading light eyebrow="Commercial" title={site.commercialPositioning} sub="Restrooms, tiled floors and hard surfaces restored through organised programs, documented scopes and scheduling around your operations." />
            <ul className="border-t border-white/15">
              {[["Hospitals & healthcare", "/commercial/hospitals"], ["Universities & schools", "/commercial/universities-schools"], ["Hotels & hospitality", "/commercial/hotels-hospitality"], ["HOAs & condos", "/commercial/hoa-condos"], ["Property management", "/commercial/property-management"], ["Commercial restoration programs", "/services/commercial-restoration"]].map(([l, h]) => (
                <li key={h}><Link href={h} className="group flex items-center justify-between border-b border-white/15 py-4 font-serif text-2xl text-bone transition hover:text-bronze-light">{l}<ArrowUpRight size={18} className="text-bronze-light transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link></li>
              ))}
            </ul>
            <Link href="/commercial-site-assessment" className="btn btn-linen mt-10">Request a Commercial Site Assessment</Link>
          </div>
        </div>
      </section>

      {/* 7 Who we serve */}
      <Section>
        <Heading eyebrow="Who we serve" title="Homeowners. Renters. Landlords. Facilities." />
        <SegmentGrid ids={["homeowners", "renters", "landlords"]} />
      </Section>

      {/* 8 Bathroom Refresh offer */}
      <Section tone="linen">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="eyebrow text-bronze"><span className="rule-bronze" />The Bathroom Refresh</p>
            <h2 className="mt-5 font-serif text-[34px] leading-[1.08] md:text-[48px]">A one-to-two-day refresh for tired bathrooms</h2>
            <p className="mt-5 leading-relaxed text-basalt/80">Tile and grout restoration, shower cleaning, and caulk and grout repair where appropriate—scoped from your photos with a fixed written price. Built for renters, landlords between tenants, and homeowners who want a fresh bathroom without a remodel.</p>
            <p className="mt-3 text-sm text-basalt/60">Final scope and price depend on your bathroom. Some projects need more than two days.</p>
            <Link href="/bathroom-refresh" className="btn btn-hunter mt-8">See what&apos;s included</Link>
          </div>
          <RoommateCalculator compact />
        </div>
      </Section>

      {/* 9 Photo assessment process */}
      <Section>
        <Editorial image="bath-marble-bright">
          <Heading eyebrow="How it works" title="Photos first. No pressure." sub="Most assessments start and finish on your phone. If we need to see something in person, we'll say so — and why." />
          <Link href="/free-assessment" className="btn btn-hunter">Start with a free photo assessment <ArrowRight size={15} /></Link>
        </Editorial>
        <div className="mt-16"><ProcessSteps /></div>
      </Section>

      {/* 10 Interactive selector */}
      <Section tone="white">
        <div className="grid gap-12 md:grid-cols-[1fr_1.3fr] md:items-start">
          <Heading eyebrow="Not sure what you need?" title="Find the right service in two taps" sub="Pick the surface and the problem. We'll point you to the right service—or tell you when restoration isn't the answer." />
          <ServiceSelector />
        </div>
      </Section>

      {/* 11 Restoration vs replacement */}
      <Section>
        <Heading eyebrow="Restore or replace?" title="Replacement isn't always necessary. Sometimes it is." />
        <RestoreVsReplace />
      </Section>

      {/* 12 Commercial maintenance programs */}
      <Section tone="hunter">
        <div className="grid gap-12 md:grid-cols-2">
          <Heading light eyebrow="Maintenance programs" title="Planned restoration across buildings and properties" sub="Instead of waiting for surfaces to fail, set a schedule by building, floor or restroom—with a documented record after every visit." />
          <Checklist light items={["Site walk and written scope by area", "Phased closures so restrooms stay available", "Work in permitted hours: nights, weekends, breaks", "Before/after photo log and completion report", "Pilot first, then roll out", "Per-property or per-cost-code invoicing"]} />
        </div>
      </Section>

      {/* 13 Verified case studies (only when approved) */}
      {flags.showCaseStudies && cases.length > 0 && (
        <Section>
          <Heading eyebrow="Case studies" title="Documented project results" />
          <div className="grid gap-5 md:grid-cols-2">{cases.map((c) => <div key={c.id} className="bg-white p-7 shadow-card"><h3 className="font-serif text-2xl">{c.title}</h3><p className="mt-2 text-sm">{c.outcome}</p></div>)}</div>
        </Section>
      )}

      {/* 14 Founder / company */}
      <Section tone="white">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-bronze">About StoneCraft</p>
          <h2 className="mt-5 font-serif text-[34px] leading-tight md:text-[44px]">{site.independenceStatement}</h2>
          <p className="mt-6 font-serif text-2xl italic leading-relaxed text-basalt/80">&ldquo;{founder.bio}&rdquo;</p>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em]">{founder.name} · {founder.role}</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2 text-xs">{founder.credentials.filter((c) => c.verified).map((c) => <li key={c.label} className="bg-cream px-3 py-1">{c.label}</li>)}</ul>
          <Link href="/about" className="btn btn-outline mt-8">More about us</Link>
        </div>
      </Section>

      {/* 15 Reviews: render only when real reviews exist (flags.showReviews) — intentionally omitted */}

      {/* 16 Answer-first questions + FAQ */}
      <Section>
        <Heading center eyebrow="Straight answers" title="What homeowners and facility teams usually ask" />
        <div className="mx-auto mb-16 grid max-w-5xl gap-8 md:grid-cols-2">
          {FAQ.filter((f) => f.q !== "Which areas do you serve?" && f.q !== "Do you work with renters?" && f.q !== "How long does a typical job take?").slice(0, 6).map((f) => (
            <article key={f.q} className="border-t border-basalt/15 pt-5">
              <h2 className="font-serif text-[22px] leading-snug md:text-[24px]">{f.q}</h2>
              <p className="mt-3 text-sm leading-relaxed text-basalt/75">{f.a}</p>
            </article>
          ))}
        </div>
        <Heading center eyebrow="Questions" title="Frequently asked" />
        <Faq items={FAQ} />
      </Section>

      {/* Service areas preview */}
      <Section tone="white" className="!py-16">
        <Heading eyebrow="Where we work" title="Greater Boston is served now. Southeast Florida is being confirmed." />
        {markets.map((m) => (
          <div key={m.id} className="mt-8 first:mt-0">
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <h3 className="font-serif text-2xl">{m.name}</h3>
              <p className="text-sm text-basalt/60">{m.status === "live" ? m.serviceAreaLabel : "Availability being confirmed — a page here is not a launch announcement."}</p>
            </div>
            <div className="flex flex-wrap gap-2">{coreCities(m.id).map((c) => <Link key={c.slug} href={`/${c.market}/${c.slug}`} className="border border-basalt/20 px-4 py-2 text-sm transition hover:border-basalt hover:bg-basalt hover:text-bone">{c.name}</Link>)}</div>
          </div>
        ))}
      </Section>

      {/* 17 Final conversion */}
      <FinalCta />
    </>
  );
}
