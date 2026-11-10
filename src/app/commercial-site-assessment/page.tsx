import { Checklist, CredentialNote } from "@/components/blocks";
import { LeadForm } from "@/components/LeadForm";
import { TrackView } from "@/components/TrackView";
import { meta } from "@/lib/seo";

export const metadata = meta({ title: "Commercial Site Assessment Request | StoneCraft", description: "Request a commercial site assessment for restroom, floor and hard-surface restoration. Hospitals, universities, hotels, HOAs and property managers.", path: "/commercial-site-assessment" });

const VALID = ["hospitals", "universities-schools", "hotels-hospitality", "hoa-condos", "property-management"];

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const segment = q.segment && VALID.includes(q.segment) ? q.segment : undefined;
  return (
    <>
      <TrackView event="view_commercial_assessment" meta="ViewContent" params={{ content_name: "Commercial Site Assessment", segment }} />
      <section className="bg-hunter text-white">
        <div className="container-sc grid gap-8 py-12 md:grid-cols-[1.3fr_1fr] md:py-16">
          <div>
            <p className="eyebrow text-linen">Commercial</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight md:text-[44px]">Request a Commercial Site Assessment</h1>
            <p className="mt-4 text-lg text-sage">Tell us about the facility and constraints. We'll follow up to schedule a site walk and prepare a written scope by area.</p>
          </div>
          <div className="rounded-lg bg-hunter-mid p-6"><p className="eyebrow mb-3 text-linen">What helps us scope</p><Checklist light items={["Buildings, restrooms and approximate square footage", "Surface types and condition photos", "Access restrictions and required work hours", "Budget range and procurement process", "Who approves the work"]} /></div>
        </div>
      </section>
      <section className="bg-cream py-12"><div className="container-sc max-w-3xl"><LeadForm variant="commercial" segment={segment} program={q.program} sourcePage="/commercial-site-assessment" /><div className="mt-6"><CredentialNote /></div></div></section>
    </>
  );
}
