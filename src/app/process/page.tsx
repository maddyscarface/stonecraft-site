import { Faq, FinalCta, Heading, JsonLd, PageHero, ProcessSteps, RestoreVsReplace, Section } from "@/components/blocks";
import { faqSchema, meta } from "@/lib/seo";

export const metadata = meta({ title: "Our Process — From Photos to Restored Surfaces | StoneCraft", description: "How StoneCraft works: photo assessment, written scope, scheduling, restoration and documented completion.", path: "/process" });
const FAQ = [
  { q: "Do you always need to visit before quoting?", a: "Not always. Many residential jobs can be quoted from good photos. Larger, unusual or commercial projects need a site visit." },
  { q: "Can you estimate dimensions from photos?", a: "We can estimate, but measurements from photos are provisional. Quotes are confirmed against field measurements before work begins." },
  { q: "What happens if you find something unexpected?", a: "We stop, show you, and agree any change in writing before continuing." },
];
export default function Page() {
  return (
    <>
      <JsonLd data={faqSchema(FAQ)} />
      <PageHero eyebrow="Process" title="Simple. Documented. No pressure." sub="Every project follows the same path, whether it's one shower or forty restrooms." />
      <Section><ProcessSteps /></Section>
      <Section tone="white"><div className="grid gap-8 md:grid-cols-2">
        <div><Heading eyebrow="Residential" title="Homes and rentals" /><ol className="list-decimal space-y-2 pl-5"><li>Photo assessment (or short visit)</li><li>Written scope, price and cure times</li><li>Landlord approval on file (renters)</li><li>Scheduled visit on your area's service day</li><li>Before photos, restoration, after photos</li><li>Walkthrough and care instructions</li></ol></div>
        <div><Heading eyebrow="Commercial" title="Facilities and portfolios" /><ol className="list-decimal space-y-2 pl-5"><li>Site assessment request</li><li>Site walk with facilities: access, hours, PPE, work zones</li><li>Written scope by area with phasing plan</li><li>Proposal aligned to your procurement</li><li>Optional pilot area</li><li>Phased work and completion report per phase</li></ol></div>
      </div></Section>
      <Section><Heading title="Restoration versus replacement" /><RestoreVsReplace /></Section>
      <Section tone="white"><Heading center title="Process FAQ" /><Faq items={FAQ} /></Section>
      <FinalCta />
    </>
  );
}
