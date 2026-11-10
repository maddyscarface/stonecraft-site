import Link from "next/link";
import { SegmentPage } from "@/components/SegmentPage";
import { Section, Heading, SegmentGrid } from "@/components/blocks";
import { findSegment } from "@/config/segments";
import { meta } from "@/lib/seo";

const s = findSegment("commercial")!;
export const metadata = meta({ title: s.seoTitle, description: s.metaDescription, path: s.path });

export default function Page() {
  return (
    <SegmentPage s={s}>
      <Section tone="white">
        <Heading eyebrow="Sectors" title="Who we work with" />
        <SegmentGrid ids={["hospitals", "universities-schools", "hotels-hospitality", "hoa-condos", "property-management"]} />
      </Section>
      <Section id="capabilities">
        <div className="grid gap-8 rounded-lg bg-white p-8 shadow-card md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <p className="eyebrow text-patina">For facility & procurement teams</p>
            <h2 className="mt-2 font-serif text-3xl">Commercial Capabilities Statement</h2>
            <p className="mt-3">Services, sectors, how we scope and phase work, documentation, and vendor-onboarding details on one page—ready to forward.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/commercial/capabilities" className="btn btn-hunter">View capabilities statement</Link>
            <a href="/downloads/stonecraft-commercial-capabilities.pdf" className="btn btn-outline" download>Download PDF</a>
          </div>
        </div>
      </Section>
    </SegmentPage>
  );
}
