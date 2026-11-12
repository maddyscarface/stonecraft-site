import { Heading, PageHero, Section } from "@/components/blocks";
import { LeadForm } from "@/components/LeadForm";
import { markets } from "@/config/markets";
import { site } from "@/config/site";
import { meta } from "@/lib/seo";

export const metadata = meta({ title: "Contact StoneCraft — Boston & Southeast Florida", description: "Call, text or email StoneCraft for tile, grout and stone restoration. Free photo assessment.", path: "/contact" });

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to StoneCraft" sub={site.responsePromise} />
      <Section>
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            {markets.map((m) => <div key={m.id} className="rounded-lg bg-white p-6 shadow-card"><p className="font-serif text-2xl">{m.brandName}</p>{m.phoneE164 && m.phoneDisplay && <p className="mt-3 text-xl"><a href={`tel:${m.phoneE164}`}>{m.phoneDisplay}</a></p>}<p><a className="underline" href={`mailto:${m.email}`}>{m.email}</a></p><p className="mt-2 text-sm text-hunter/70">{m.hours}</p><p className="text-sm text-hunter/70">{m.serviceAreaLabel}</p></div>)}
            <p className="text-sm">Commercial or multi-property? <a className="underline" href="/commercial-site-assessment">Request a site assessment</a>.</p>
          </div>
          <div><Heading title="Send us a message" /><LeadForm compact sourcePage="/contact" submitLabel="Send Message" /></div>
        </div>
      </Section>
    </>
  );
}
