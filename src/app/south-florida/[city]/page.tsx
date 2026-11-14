import { CityPage, cityMetadata, cityParams } from "@/components/CityPage";
import { CountyPage, countyMetadata, isCountySlug } from "@/components/CountyPage";
export const dynamicParams = false;
export function generateStaticParams() { return cityParams("south-florida"); }
export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  return isCountySlug(city) ? countyMetadata(city) : cityMetadata("south-florida", city);
}
export default async function Page({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  return isCountySlug(city) ? <CountyPage slug={city} /> : <CityPage market="south-florida" city={city} />;
}
