"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type MarketId = "boston" | "south-florida";
const Ctx = createContext<{ market: MarketId; setMarket: (m: MarketId) => void }>({ market: "boston", setMarket: () => {} });

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [market, setM] = useState<MarketId>("boston");
  useEffect(() => {
    const fromPath: MarketId | null = pathname.startsWith("/south-florida") ? "south-florida" : pathname.startsWith("/boston") ? "boston" : null;
    let stored: MarketId | null = null;
    try { stored = localStorage.getItem("sc_market") as MarketId | null; } catch {}
    const m = fromPath ?? stored ?? "boston";
    setM(m);
    if (fromPath) try { localStorage.setItem("sc_market", fromPath); } catch {}
  }, [pathname]);
  const setMarket = (m: MarketId) => { setM(m); try { localStorage.setItem("sc_market", m); } catch {} };
  return <Ctx.Provider value={{ market, setMarket }}>{children}</Ctx.Provider>;
}

export const useMarket = () => useContext(Ctx);
