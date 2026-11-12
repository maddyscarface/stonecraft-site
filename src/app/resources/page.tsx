import Link from "next/link";
import { FinalCta, Heading, PageHero, Section } from "@/components/blocks";
import { articles } from "@/config/resources";
import { meta } from "@/lib/seo";

export const metadata = meta({ title: "Tile, Grout & Stone Care Resources | StoneCraft", description: "Guides for homeowners, renters, landlords and facility teams on tile, grout and natural stone care and restoration.", path: "/resources" });

export default function Page() {
  return (
    <>
      <PageHero image="tile-patterned-closeup" eyebrow="Resources" title="Guides for Better Surfaces" sub="Practical advice on tile, grout, caulk and natural stone—for homes, rentals and facilities." />
      <Section><div className="grid gap-6 md:grid-cols-3">{articles.map((a) => <Link key={a.slug} href={`/resources/${a.slug}`} className="flex flex-col rounded-lg bg-white p-6 shadow-card transition hover:-translate-y-0.5"><p className="eyebrow text-patina">{a.audience}</p><h2 className="mt-2 font-serif text-xl leading-snug">{a.title}</h2><p className="mt-3 flex-1 text-sm text-hunter/70">{a.description}</p><span className="mt-4 text-sm font-semibold text-patina">Read →</span></Link>)}</div></Section>
      <FinalCta />
    </>
  );
}
