import { meta } from "@/lib/seo";
import { PrintButton } from "@/components/PrintButton";

export const metadata = meta({ title: "Landlord Approval Request Template | StoneCraft", description: "A one-page template renters can send to their landlord or property manager to request approval for a bathroom refresh.", path: "/renters/landlord-approval" });

const Line = ({ label }: { label: string }) => <div className="mb-3"><span className="text-xs uppercase tracking-wide text-hunter/60">{label}</span><div className="mt-1 h-7 border-b border-hunter/40" /></div>;

export default function Page() {
  return (
    <div className="bg-cream py-10 print:bg-white print:py-0">
      <div className="container-sc max-w-3xl">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">Fill in, print or save as PDF, and send to your landlord. Or <a className="underline" href="/downloads/landlord-approval-request.docx">download the Word version</a>.</p>
          <PrintButton />
        </div>
        <article className="rounded-lg bg-white p-8 shadow-card print:shadow-none">
          <header className="border-b-2 border-hunter pb-4">
            <h1 className="font-serif text-2xl">Request for Approval — Bathroom Surface Refresh</h1>
            <p className="text-sm text-hunter/70">Non-structural restoration of existing tile, grout and caulk</p>
          </header>
          <section className="mt-6 grid gap-x-8 sm:grid-cols-2">
            <Line label="Date" /><Line label="Property address & unit" />
            <Line label="Tenant name(s)" /><Line label="Tenant phone / email" />
            <Line label="Landlord / property manager" /><Line label="Landlord phone / email" />
          </section>
          <section className="mt-4 text-sm leading-relaxed">
            <h2 className="mb-2 font-semibold">What we are requesting</h2>
            <p>The tenant(s) request permission for StoneCraft to perform a non-structural restoration of the existing bathroom surfaces at the address above. No tile will be removed or replaced and no plumbing, electrical or structural work is included.</p>
            <h2 className="mb-2 mt-4 font-semibold">Proposed scope (from StoneCraft's written quote)</h2>
            <ul className="list-disc pl-5">
              <li>[ ] Deep cleaning of shower/tub tile and grout</li>
              <li>[ ] Grout colour sealing or clear sealing — colour: ______________</li>
              <li>[ ] Removal and replacement of caulk at tub/shower and vanity joints</li>
              <li>[ ] Spot regrouting of cracked or missing grout</li>
              <li>[ ] Bathroom floor tile and grout cleaning / sealing</li>
            </ul>
            <div className="mt-4 grid gap-x-8 sm:grid-cols-2"><Line label="Quote reference" /><Line label="Proposed date(s)" /></div>
            <h2 className="mb-2 mt-2 font-semibold">Cost</h2>
            <p>[ ] Paid by tenant(s) &nbsp;&nbsp; [ ] Shared: tenant ____% / landlord ____% &nbsp;&nbsp; [ ] Paid by landlord</p>
            <h2 className="mb-2 mt-4 font-semibold">Conditions</h2>
            <p>StoneCraft will provide a certificate of insurance on request, protect adjacent surfaces, and provide before/after photos to the tenant and, if requested, the landlord. Grout colour changes (if any) are listed above. Approval does not change any other term of the lease.</p>
          </section>
          <section className="mt-6 grid gap-x-8 sm:grid-cols-2">
            <Line label="Landlord / manager signature" /><Line label="Date" />
            <Line label="Printed name" /><Line label="[ ] Approved   [ ] Approved with changes   [ ] Not approved" />
          </section>
          <p className="mt-6 text-xs text-hunter/60">This template is provided for convenience and is not legal advice. Your lease may set its own approval process.</p>
        </article>
      </div>
    </div>
  );
}
