import { CityPage, cityMetadata, cityParams } from "@/components/CityPage";
export const dynamicParams = false;
export function generateStaticParams() { return cityParams("south-florida"); }
export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) { return cityMetadata("south-florida", (await params).city); }
export default async function Page({ params }: { params: Promise<{ city: string }> }) { return <CityPage market="south-florida" city={(await params).city} />; }
