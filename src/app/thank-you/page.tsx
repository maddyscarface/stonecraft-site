import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getMarket } from "@/config/markets";
import { site } from "@/config/site";
import { meta } from "@/lib/seo";

export const metadata = meta({ title: "Thank You | StoneCraft", description: "We received your request.", path: "/thank-you", noindex: true });

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const m = getMarket(q.m ?? "boston") ?? getMarket("boston")!;
  const commercial = q.v === "commercial", renter = q.v === "renter";
  return (
    <section className="bg-cream py-20">
      <div className="container-sc max-w-2xl text-center">
        <CheckCircle2 className="mx-auto text-patina" size={56} />
        <h1 className="mt-4 font-serif text-4xl" data-testid="thank-you">{commercial ? "Request received" : "Thanks — we've got it"}</h1>
        <p className="mt-4 text-lg">{site.responsePromise} Check your email for a confirmation.</p>
        {q.photos === "0" && !commercial && <p className="mt-4 rounded bg-white p-4 text-sm shadow-card">No photos yet? Reply to our confirmation email{m.phoneE164 ? <> or text <a className="underline" href={`sms:${m.phoneE164}`}>{m.phoneDisplay}</a></> : <> or email <a className="underline" href={`mailto:${m.email}`}>{m.email}</a></>} with 3–4 photos so we can assess faster.</p>}
        {renter && <p className="mt-4 rounded bg-white p-4 text-sm shadow-card">While you wait: get the <Link className="underline" href="/renters/landlord-approval">landlord approval template</Link> ready. We'll need written approval before booking.</p>}
        {commercial && <p className="mt-4 rounded bg-white p-4 text-sm shadow-card">Next: we'll contact you to schedule a site walk. Meanwhile, here's our <Link className="underline" href="/commercial/capabilities">capabilities statement</Link> to share with your team.</p>}
        {m.status === "pre-launch" && <p className="mt-4 text-sm text-hunter/70">{m.statusNote}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/process" className="btn btn-outline">How the process works</Link><Link href="/resources" className="btn btn-hunter">Read our guides</Link></div>
      </div>
    </section>
  );
}
