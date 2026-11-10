import { CityPage, cityMetadata, cityParams } from "@/components/CityPage";
export const dynamicParams = false;
export function generateStaticParams() { return cityParams("boston"); }
export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) { return cityMetadata("boston", (await params).city); }
export default async function Page({ params }: { params: Promise<{ city: string }> }) { return <CityPage market="boston" city={(await params).city} />; }
