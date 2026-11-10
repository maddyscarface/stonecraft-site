import { SegmentPage } from "@/components/SegmentPage";
import { Section, Heading, Checklist } from "@/components/blocks";
import { findSegment } from "@/config/segments";
import { meta } from "@/lib/seo";

const s = findSegment("landlords")!;
export const metadata = meta({ title: s.seoTitle, description: s.metaDescription, path: s.path });

export default function Page() {
  return (
    <SegmentPage s={s}>
      <Section tone="white">
        <div className="grid gap-10 md:grid-cols-2">
          <Heading eyebrow="Restore vs remodel" title="Compare before you call a remodeler" sub="When tile and walls are sound, a restoration reset typically costs a fraction of a remodel and is measured in days, not weeks. We'll give you both numbers to compare when replacement is genuinely on the table." />
          <div className="rounded-lg bg-cream p-6">
            <p className="font-semibold">What you get per unit</p>
            <div className="mt-3"><Checklist items={["Written scope and fixed price per unit", "Scheduling to your turn date and access rules", "Before and after photos", "Completion note for your records and deposit documentation", "Care guidance you can pass to the next tenant"]} /></div>
          </div>
        </div>
      </Section>
    </SegmentPage>
  );
}
