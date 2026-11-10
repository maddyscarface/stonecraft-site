import { Clock, ShieldCheck, Users } from "lucide-react";
import { LeadForm } from "@/components/LeadForm";
import { TrackView } from "@/components/TrackView";
import { cityByZip } from "@/config/cities";
import { site } from "@/config/site";
import { meta } from "@/lib/seo";

export const metadata = meta({ title: "Free Photo Assessment — Tile, Grout & Stone | StoneCraft", description: "Send 3–4 photos of your tile, grout, shower or stone. We'll tell you what's possible and what it costs. No obligation.", path: "/free-assessment" });

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const type = q.type === "renter" || q.type === "landlord" || q.type === "homeowner" ? q.type : undefined;
  const zip = q.zip && /^\d{5}$/.test(q.zip) ? q.zip : undefined;
  return (
    <>
      <TrackView event="view_assessment" meta="ViewContent" params={{ content_name: "Free Assessment" }} />
      <section className="bg-hunter text-white">
        <div className="container-sc py-12 md:py-16">
          <h1 className="max-w-3xl font-serif text-4xl leading-tight md:text-[44px]">See What Your Surfaces Could Look Like—Before You Commit to Anything.</h1>
          <p className="mt-4 max-w-2xl text-lg text-sage">Send 3–4 photos. We'll review them and tell you honestly what's possible and what it costs. {site.responsePromise}</p>
          <div className="mt-6 flex flex-wrap gap-5 text-sm text-linen"><span className="flex items-center gap-2"><Clock size={16} />Same-business-day reply</span><span className="flex items-center gap-2"><ShieldCheck size={16} />Photos seen only by our team</span><span className="flex items-center gap-2"><Users size={16} />Homeowners, renters & landlords</span></div>
        </div>
      </section>
      <section className="bg-cream py-12">
        <div className="container-sc max-w-3xl">
          <LeadForm variant={type === "renter" ? "renter" : type === "landlord" ? "landlord" : "residential"} customerType={type} zip={zip} town={zip ? cityByZip(zip)?.name : undefined} program={q.program} sourcePage="/free-assessment" />
          <p className="mt-6 text-center text-sm">Managing a commercial facility? <a className="underline" href="/commercial-site-assessment">Request a commercial site assessment</a>.</p>
        </div>
      </section>
    </>
  );
}
