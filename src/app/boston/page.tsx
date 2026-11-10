import { MarketHub, hubMetadata } from "@/components/MarketHub";
export const metadata = hubMetadata("boston");
export default function Page() { return <MarketHub slug="boston" />; }
