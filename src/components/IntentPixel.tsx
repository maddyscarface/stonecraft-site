"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import { currentConsent } from "@/lib/tracking/client";

const SRC = process.env.NEXT_PUBLIC_INTENT_PIXEL_SRC;
const ENABLED = process.env.NEXT_PUBLIC_INTENT_ENABLED === "true";

/** DataMoon / AudienceLab site pixel. Off by default; loads only with ad consent and no Global Privacy Control. */
export function IntentPixel() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!ENABLED || !SRC) return;
    const check = () => setOk(currentConsent().ad_storage === "granted" && navigator.globalPrivacyControl !== true);
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);
  if (!ENABLED || !SRC || !ok) return null;
  return <Script id="intent-pixel" strategy="lazyOnload" src={SRC} />;
}
