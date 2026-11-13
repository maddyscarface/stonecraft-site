"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { captureAttribution, currentConsent, defaultConsent, getConsent, push, setConsent } from "@/lib/tracking/client";
import { OPENAI_PIXEL_ID, oaiqSnippet } from "@/lib/openai-ads/client";
import { gtagDirectIds, tracking } from "@/config/tracking";
import { IntentPixel } from "./IntentPixel";

const GTM = tracking.gtm;
const PIXEL = tracking.metaPixel;
const GTAG_IDS = gtagDirectIds();

export function Tracking() {
  const pathname = usePathname();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => { setShowBanner(!getConsent()); }, []);
  useEffect(() => {
    captureAttribution();
    push({ event: "page_view_sc", page_path: pathname });
    if (currentConsent().ad_storage === "granted") window.fbq?.("track", "PageView");
  }, [pathname]);

  const d = defaultConsent();
  return (
    <>
      {/* Consent Mode v2 defaults must run before GTM loads. */}
      <Script id="consent-default" strategy="beforeInteractive">{`
        window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
        var s=null;try{s=JSON.parse(localStorage.getItem('sc_consent_v1'));}catch(e){}
        var gpc=navigator.globalPrivacyControl===true;
        var def=${JSON.stringify(d.ad_storage)}==='granted'&&!gpc?'granted':'denied';
        gtag('consent','default',s||{analytics_storage:'granted',ad_storage:def,ad_user_data:def,ad_personalization:def,wait_for_update:500});
        gtag('set','url_passthrough',true);
      `}</Script>
      {GTM && (
        <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM}');`}</Script>
      )}
      {GTAG_IDS.length > 0 && (
        <>
          {/* Direct gtag.js for GA4 / Google Ads when no GTM container is configured. Consent defaults above apply. */}
          <Script id="gtag-src" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GTAG_IDS[0]}`} />
          <Script id="gtag-config" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;gtag('js',new Date());${GTAG_IDS.map((id) => `gtag('config','${id}'${id.startsWith("AW-") ? ",{allow_enhanced_conversions:true}" : ""});`).join("")}`}</Script>
        </>
      )}
      <IntentPixel />
      {PIXEL && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          var c=null;try{c=JSON.parse(localStorage.getItem('sc_consent_v1'));}catch(e){}
          var ok=c?c.ad_storage==='granted':(${JSON.stringify(d.ad_storage)}==='granted'&&navigator.globalPrivacyControl!==true);
          fbq('consent', ok?'grant':'revoke'); fbq('init','${PIXEL}'); if(ok) fbq('track','PageView');`}</Script>
      )}
      {OPENAI_PIXEL_ID && (
        // OpenAI Ads (ChatGPT) pixel: consent applied before init; stored choice wins, GPC always blocks.
        <Script id="openai-pixel" strategy="afterInteractive">{oaiqSnippet(OPENAI_PIXEL_ID, `(function(){var c=null;try{c=JSON.parse(localStorage.getItem('sc_consent_v1'));}catch(e){}if(navigator.globalPrivacyControl===true)return false;return c?c.ad_storage==='granted':${JSON.stringify(d.ad_storage)}==='granted';})()`)}</Script>
      )}
      {showBanner && (
        <div role="dialog" aria-label="Privacy choices" className="no-print fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-xl rounded-md border border-hunter-light bg-hunter p-4 text-sm text-cream shadow-premium md:bottom-4">
          <p className="mb-3">We use cookies to measure site performance and our advertising. You can opt out of advertising cookies at any time. <a className="underline" href="/privacy">Privacy policy</a></p>
          <div className="flex gap-2">
            <button className="btn btn-linen !min-h-11 !px-4 text-sm" onClick={() => { setConsent({ analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" }); setShowBanner(false); }}>Accept</button>
            <button className="btn btn-ghost !min-h-11 !px-4 text-sm" onClick={() => { setConsent({ analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }); setShowBanner(false); }}>Decline advertising</button>
          </div>
        </div>
      )}
    </>
  );
}

export function PrivacyChoicesLink() {
  return <button className="underline" onClick={() => { try { localStorage.removeItem("sc_consent_v1"); } catch {} location.reload(); }}>Your privacy choices</button>;
}
