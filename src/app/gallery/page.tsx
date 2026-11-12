import Link from "next/link";
import { FinalCta, Heading, PageHero, Section } from "@/components/blocks";
import { BeforeAfter } from "@/components/interactive";
import { publishableGallery } from "@/config/gallery";
import { meta } from "@/lib/seo";

export const metadata = meta({ title: "Before & After Gallery — Tile, Grout & Stone Restoration | StoneCraft", description: "Before-and-after results from StoneCraft tile, grout, shower and stone restoration projects, published with customer permission.", path: "/gallery" });

export default function Page() {
  const items = publishableGallery();
  return (
    <>
      <PageHero eyebrow="Gallery" title={items.length ? "The Work Speaks for Itself" : "Before & After Gallery"} sub="We publish only real StoneCraft jobs, with the customer's written permission — never stock photos or another company's work." />
      <Section>
        {items.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((g) => <figure key={g.id}><BeforeAfter before={g.before} after={g.after} alt={g.alt} /><figcaption className="mt-2 flex gap-2 text-xs">{g.permission.allowsTown && <span className="rounded bg-linen px-2 py-0.5">{g.town}</span>}<span className="rounded bg-patina px-2 py-0.5 text-white">{g.service}</span></figcaption>{g.caption && <p className="mt-1 text-sm italic">{g.caption}</p>}</figure>)}</div>
        ) : (
          <div className="mx-auto max-w-2xl text-center">
            <Heading center title="Project photos are on their way" sub="We only publish real jobs with written customer permission, so this gallery fills as projects are completed. Want to see what's possible for your surfaces? Send us photos and we'll walk you through it." />
            <div className="mx-auto max-w-lg"><BeforeAfter illustration /></div>
            <Link href="/free-assessment" className="btn btn-hunter mt-8">Get a free photo assessment</Link>
          </div>
        )}
      </Section>
      <FinalCta title={items.length ? "Want results like these?" : "See what's possible for your surfaces"} />
    </>
  );
}
