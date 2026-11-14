import Link from "next/link";
import { SegmentPage } from "@/components/SegmentPage";
import { Section, Heading, Checklist } from "@/components/blocks";
import { RoommateCalculator } from "@/components/interactive";
import { findSegment } from "@/config/segments";
import { meta } from "@/lib/seo";

const s = findSegment("renters")!;
export const metadata = meta({ title: s.seoTitle, description: s.metaDescription, path: s.path });

export default function Page() {
  return (
    <SegmentPage s={s}>
      <Section tone="linen">
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <div>
            <p className="eyebrow">The 1–2 Day Bathroom Refresh</p>
            <h2 className="mt-2 font-serif text-3xl">Fixed scope. Written price. Landlord-approved.</h2>
            <p className="mt-4">The price depends on the bathroom's size and condition. After we review your photos you get a written, fixed quote—nothing is booked until you and your landlord approve it.</p>
            <div className="mt-5"><Checklist items={["Tile and grout restoration", "Shower cleaning and restoration", "Caulking and grout repair where appropriate", "Optional roommate cost-sharing", "Landlord coordination when you authorise it"]} /></div>
          </div>
          <RoommateCalculator />
        </div>
      </Section>
      <Section tone="white">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <Heading eyebrow="Landlord approval" title="How approval works" />
            <ol className="list-decimal space-y-3 pl-5">
              <li>We send you a written scope and price from your photos.</li>
              <li>You share it with your landlord or property manager using our approval request template—or authorise us to contact them for you.</li>
              <li>We book only after we receive written approval (an email or the signed template).</li>
              <li>After the work, you get photos and care notes you can pass to your landlord.</li>
            </ol>
            <p className="mt-4 text-sm text-hunter/70">We never contact a landlord without your permission, and cost-sharing among roommates never replaces landlord approval.</p>
          </div>
          <div className="rounded-lg border border-hunter p-6">
            <h3 className="font-serif text-2xl">Landlord Approval Request</h3>
            <p className="mt-2 text-sm">A one-page request your landlord can sign or reply to. It describes the non-structural scope, products, timing, insurance and who pays.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/renters/landlord-approval" className="btn btn-hunter">Open the template</Link>
              <a href="/downloads/landlord-approval-request.docx" className="btn btn-outline" download>Download (Word)</a>
            </div>
          </div>
        </div>
      </Section>
    </SegmentPage>
  );
}
