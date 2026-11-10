import Link from "next/link";
import { MapPin } from "lucide-react";
import { AudienceSelector, BeforeAfter, RoommateCalculator, ServiceSelector } from "@/components/interactive";
import { Checklist, Faq, FinalCta, Heading, JsonLd, ProcessSteps, RestoreVsReplace, Section, SegmentGrid, ServiceGrid, TrustBar } from "@/components/blocks";
import { markets } from "@/config/markets";
import { coreCities } from "@/config/cities";
import { flags, site } from "@/config/site";
import { founder, publishableCaseStudies, publishableGallery } from "@/config/gallery";
import { faqSchema, meta } from "@/lib/seo";

export const metadata = meta({
  title: "Tile, Grout & Stone Restoration — Greater Boston & Southeast Florida | StoneCraft",
  description: "Professional tile, grout, shower and natural stone restoration for homeowners, renters, property managers and commercial facilities. Send photos for a free assessment.",
  path: "/",
});

const FAQ = [
  { q: "How does the free photo assessment work?", a: "Send 3–4 photos through our form. We review them and reply with what we think is possible, what it would involve and an estimated price range. If we need to see it in person, we'll say so." },
  { q: "Can every bathroom be restored instead of replaced?", a: "No. If tile is loose, walls are soft or there's water damage behind the tile, restoration isn't the right answer. We'll tell you before you spend anything." },
  { q: "How long does a typical job take?", a: "Many residential jobs are completed in a day; some need a second visit for curing or repairs. Your quote states the expected schedule." },
  { q: "Do you work with renters?", a: "Yes, with written landlord approval before any work is booked. We can coordinate with your landlord if you authorise us to." },
  { q: "Do you serve commercial facilities?", a: "Yes. We scope hospitals, universities, hotels, HOAs and multifamily properties by area, schedule work into permitted windows and document completion." },
  { q: "Which areas do you serve?", a: "Greater Boston (Boston, Cambridge, Brookline, Newton, MetroWest and nearby towns) and Southeast Florida (Palm Beach and Broward counties), subject to scheduling availability." },
];

export default function HomePage() {
  const gallery = publishableGallery().slice(0, 3);
  const cases = publishableCaseStudies();
  return (
    <>
      <JsonLd data={faqSchema(FAQ)} />
      {/* 1 Hero */}
      <section className="bg-hunter text-white">
        <div className="container-sc grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <p className="eyebrow mb-4 text-linen">Tile · Grout · Shower · Natural stone</p>
            <h1 className="font-serif text-[40px] leading-[1.08] md:text-[56px]">{site.positioning}</h1>
            <p className="mt-6 max-w-xl text-lg text-sage">Professional tile, grout, shower and natural stone restoration for homeowners, renters, property managers and commercial facilities in Greater Boston and Southeast Florida.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/free-assessment" className="btn btn-linen" data-testid="hero-cta">Send Photos — Get a Free Assessment</Link>
              <Link href="/commercial" className="btn btn-ghost">Commercial Property Services</Link>
            </div>
          </div>
          <BeforeAfter illustration />
        </div>
      </section>

      {/* Hero selector */}
      <AudienceSelector />

      {/* 2 Market selection */}
      <Section tone="white" className="!py-12">
        <div className="grid gap-5 md:grid-cols-2">
          {markets.map((m) => (
            <Link key={m.id} href={`/${m.slug}`} className="flex items-start gap-4 rounded-lg border border-cream-dark p-6 transition hover:border-hunter">
              <MapPin className="mt-1 text-patina" />
              <div>
                <p className="font-serif text-2xl">{m.brandName}</p>
                <p className="mt-1 text-sm text-hunter/70">{m.serviceAreaLabel}</p>
                {m.status === "pre-launch" && <p className="mt-2 inline-block rounded bg-linen-pale px-2 py-0.5 text-xs font-semibold">Scheduling availability being confirmed</p>}
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* 3 Verified trust */}
      <TrustBar />

      {/* 4 Before/after */}
      <Section tone="hunter">
        <Heading light eyebrow="Before & after" title="Restoration, not renovation" sub="Grout, caulk, film and worn sealant are usually the problem—not the tile. Real project photos appear here only with the customer's written permission." />
        {gallery.length ? (
          <div className="grid gap-6 md:grid-cols-3">{gallery.map((g) => <div key={g.id}><BeforeAfter before={g.before} after={g.after} alt={g.alt} /><p className="mt-2 text-sm text-linen">{g.permission.allowsTown ? g.town : ""} · {g.service}</p></div>)}</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[["Embedded soil & film", "Deep cleaning with surface-appropriate products and extraction lifts what mopping leaves behind."], ["Blotchy grout", "Colour sealing evens out grout and adds a protective coating."], ["Failed caulk", "Old caulk comes out completely; new caulk goes onto clean, dry joints."], ["Etched marble", "Honing and polishing remove etching and restore the finish."]].map(([t, b]) => (
              <div key={t} className="rounded-lg border border-hunter-light bg-hunter-mid p-6"><h3 className="font-serif text-xl text-linen">{t}</h3><p className="mt-2 text-sm text-sage">{b}</p></div>
            ))}
            <Link href="/gallery" className="btn btn-linen sm:col-span-2 lg:col-span-4 lg:justify-self-start">View the gallery</Link>
          </div>
        )}
      </Section>

      {/* 5 Residential services */}
      <Section>
        <Heading eyebrow="Residential" title="Every hard surface in your home" />
        <ServiceGrid filter="residential" />
      </Section>

      {/* 6 Commercial services */}
      <Section tone="hunter">
        <Heading light eyebrow="Commercial" title={site.commercialPositioning} sub="Restrooms, tiled floors and hard surfaces restored through organised programs, documented scopes and scheduling around your operations." />
        <div className="grid gap-4 md:grid-cols-3">
          {[["Hospitals & healthcare", "/commercial/hospitals"], ["Universities & schools", "/commercial/universities-schools"], ["Hotels & hospitality", "/commercial/hotels-hospitality"], ["HOAs & condos", "/commercial/hoa-condos"], ["Property management", "/commercial/property-management"], ["Commercial restoration programs", "/services/commercial-restoration"]].map(([l, h]) => (
            <Link key={h} href={h} className="rounded-lg border border-hunter-light bg-hunter-mid p-5 font-serif text-lg transition hover:border-linen">{l}</Link>
          ))}
        </div>
        <Link href="/commercial-site-assessment" className="btn btn-linen mt-8">Request a Commercial Site Assessment</Link>
      </Section>

      {/* 7 Who we serve */}
      <Section>
        <Heading eyebrow="Who we serve" title="Homeowners. Renters. Landlords. Facilities." />
        <SegmentGrid ids={["homeowners", "renters", "landlords"]} />
      </Section>

      {/* 8 Bathroom Refresh offer */}
      <Section tone="linen">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="eyebrow text-hunter">The Bathroom Refresh</p>
            <h2 className="mt-2 font-serif text-3xl md:text-4xl">A 1–2 day refresh for tired bathrooms</h2>
            <p className="mt-4">Tile and grout restoration, shower cleaning, and caulk and grout repair where appropriate—scoped from your photos with a fixed written price. Built for renters, landlords between tenants, and homeowners who want a fresh bathroom without a remodel.</p>
            <p className="mt-3 text-sm">Final scope and price depend on your bathroom. Some projects need more than two days.</p>
            <Link href="/bathroom-refresh" className="btn btn-hunter mt-6">See what's included</Link>
          </div>
          <RoommateCalculator compact />
        </div>
      </Section>

      {/* 9 Photo assessment process */}
      <Section>
        <Heading eyebrow="How it works" title="Photos first. No pressure." />
        <ProcessSteps />
        <Link href="/free-assessment" className="btn btn-hunter mt-8">Start with a free photo assessment</Link>
      </Section>

      {/* 10 Interactive selector */}
      <Section tone="white">
        <div className="grid gap-10 md:grid-cols-[1fr_1.3fr] md:items-start">
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
        <div className="grid gap-10 md:grid-cols-2">
          <Heading light eyebrow="Maintenance programs" title="Planned restoration across buildings and properties" sub="Instead of waiting for surfaces to fail, set a schedule by building, floor or restroom—with a documented record after every visit." />
          <Checklist light items={["Site walk and written scope by area", "Phased closures so restrooms stay available", "Work in permitted hours: nights, weekends, breaks", "Before/after photo log and completion report", "Pilot first, then roll out", "Per-property or per-cost-code invoicing"]} />
        </div>
      </Section>

      {/* 13 Verified case studies (only when approved) */}
      {flags.showCaseStudies && cases.length > 0 && (
        <Section>
          <Heading eyebrow="Case studies" title="Documented project results" />
          <div className="grid gap-5 md:grid-cols-2">{cases.map((c) => <div key={c.id} className="rounded-lg bg-white p-6 shadow-card"><h3 className="font-serif text-xl">{c.title}</h3><p className="mt-2 text-sm">{c.outcome}</p></div>)}</div>
        </Section>
      )}

      {/* 14 Founder / company */}
      <Section tone="white">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-patina">About StoneCraft</p>
          <h2 className="mt-2 font-serif text-3xl">{site.independenceStatement}</h2>
          <p className="mt-4 text-lg text-hunter/80">{founder.bio}</p>
          <p className="mt-4 font-semibold">{founder.name}, {founder.role}</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-2 text-xs">{founder.credentials.filter((c) => c.verified).map((c) => <li key={c.label} className="rounded-full bg-cream px-3 py-1">{c.label}</li>)}</ul>
          <Link href="/about" className="btn btn-outline mt-6">More about us</Link>
        </div>
      </Section>

      {/* 15 Reviews: render only when real reviews exist (flags.showReviews) — intentionally omitted */}

      {/* 16 FAQ */}
      <Section>
        <Heading center eyebrow="Questions" title="Frequently asked" />
        <Faq items={FAQ} />
      </Section>

      {/* Service areas preview */}
      <Section tone="white" className="!py-12">
        <Heading eyebrow="Where we work" title="Greater Boston and Southeast Florida" />
        <div className="flex flex-wrap gap-2">{coreCities().map((c) => <Link key={c.slug} href={`/${c.market}/${c.slug}`} className="rounded-full border border-hunter px-3.5 py-1.5 text-sm transition hover:bg-hunter hover:text-white">{c.name}</Link>)}</div>
      </Section>

      {/* 17 Final conversion */}
      <FinalCta />
    </>
  );
}
