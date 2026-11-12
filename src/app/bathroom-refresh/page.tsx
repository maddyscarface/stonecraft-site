import { Checklist, Faq, FinalCta, Heading, JsonLd, PageHero, Section } from "@/components/blocks";
import { LeadForm } from "@/components/LeadForm";
import { RoommateCalculator } from "@/components/interactive";
import { faqSchema, meta, serviceSchema } from "@/lib/seo";

export const metadata = meta({ title: "1–2 Day Bathroom Refresh — Tile, Grout & Shower | StoneCraft", description: "A fixed-scope bathroom refresh for renters, landlords and homeowners: tile and grout restoration, shower cleaning and caulk repair, usually in one to two days.", path: "/bathroom-refresh" });

const FAQ = [
  { q: "Is it really one to two days?", a: "Most standard bathrooms are completed in one to two working days, including cure time between steps. Larger or more damaged bathrooms can take longer; your quote will say." },
  { q: "What does it cost?", a: "Many refreshes are around $1,500 in Greater Boston, but the price depends on size and condition. You get a fixed written price before anything is booked." },
  { q: "What isn't included?", a: "Tile replacement, plumbing, fixtures, glass doors and wall repairs. If we see a problem that needs one of those, we'll tell you." },
  { q: "I rent. Can I book it?", a: "Yes, with written approval from your landlord or property manager. We can coordinate approval if you authorise us." },
];

export default function Page() {
  return (
    <>
      <JsonLd data={serviceSchema({ name: "Bathroom Refresh", description: "Fixed-scope bathroom tile, grout, shower and caulk restoration.", path: "/bathroom-refresh", areaServed: ["Greater Boston, MA", "Southeast Florida"] })} />
      <JsonLd data={faqSchema(FAQ)} />
      <PageHero image="bath-subway-grey" eyebrow="The Bathroom Refresh" title="Restore the Bathroom. Keep the Tile. Refresh the Space." sub="A 1–2 day refresh of tile, grout, shower and caulk for bathrooms that are sound but tired. Fixed scope, written price." primary={{ label: "Get a Photo Assessment", href: "#get-started" }} secondary={{ label: "Renting? See how approval works", href: "/renters" }} />
      <Section>
        <div className="grid gap-10 md:grid-cols-2">
          <div><Heading eyebrow="Included" title="What the refresh covers" /><Checklist items={["Deep clean of shower/tub tile and grout", "Grout colour or clear sealing", "Caulk removal and replacement at wet joints", "Spot grout repair where needed", "Bathroom floor tile and grout cleaning", "Care instructions and before/after photos"]} /></div>
          <div><Heading eyebrow="Who it's for" title="Built for three situations" /><Checklist items={["Renters who want a better bathroom during their lease (with landlord approval)", "Landlords resetting a unit between tenants", "Homeowners preparing to sell or just wanting a fresh start"]} /></div>
        </div>
      </Section>
      <Section tone="linen"><div className="grid gap-10 md:grid-cols-2 md:items-center"><Heading eyebrow="Sharing the cost?" title="Roommate split calculator" sub="Enter the price from your quote to see each person's share." /><RoommateCalculator /></div></Section>
      <Section tone="white" id="get-started"><div className="mx-auto max-w-3xl"><LeadForm variant="residential" sourcePage="/bathroom-refresh" /></div></Section>
      <Section><Heading center title="Bathroom Refresh FAQ" /><Faq items={FAQ} /></Section>
      <FinalCta />
    </>
  );
}
