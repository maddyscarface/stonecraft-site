import { SegmentPage } from "@/components/SegmentPage";
import { PriceGuide, RestoreVsReplace, Section, Heading, ServiceGrid } from "@/components/blocks";
import { findSegment } from "@/config/segments";
import { meta } from "@/lib/seo";

const s = findSegment("homeowners")!;
export const metadata = meta({ title: s.seoTitle, description: s.metaDescription, path: s.path });

export default function Page() {
  return (
    <SegmentPage s={s}>
      <Section>
        <Heading eyebrow="Services" title="Homeowner services" />
        <ServiceGrid filter="residential" />
        <div className="mt-10 grid gap-8 md:grid-cols-2"><PriceGuide show /><RestoreVsReplace /></div>
        <p className="mt-3 text-xs text-hunter/60">Price guidance applies to Greater Boston. Southeast Florida pricing is provided after assessment.</p>
      </Section>
    </SegmentPage>
  );
}
