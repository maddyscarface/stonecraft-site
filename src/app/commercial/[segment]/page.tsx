import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/SegmentPage";
import { commercialSegments, findSegment } from "@/config/segments";
import { meta } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() { return commercialSegments.map((s) => ({ segment: s.path.split("/").pop()! })); }

export async function generateMetadata({ params }: { params: Promise<{ segment: string }> }) {
  const s = findSegment((await params).segment);
  return s ? meta({ title: s.seoTitle, description: s.metaDescription, path: s.path }) : {};
}

export default async function Page({ params }: { params: Promise<{ segment: string }> }) {
  const s = findSegment((await params).segment);
  if (!s) notFound();
  return <SegmentPage s={s} />;
}
