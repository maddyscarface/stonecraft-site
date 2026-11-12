/**
 * Advertising & analytics ids (all public, all optional). Every tag stays inactive until its id
 * is set, and every tag is gated by Consent Mode v2 / the site consent banner.
 *
 *   NEXT_PUBLIC_GTM_ID                 Google Tag Manager container (preferred: route GA4/Ads inside GTM)
 *   NEXT_PUBLIC_GA4_ID                 GA4 measurement id, loaded directly via gtag.js when no GTM container is set
 *   NEXT_PUBLIC_GOOGLE_ADS_ID          Google Ads tag id (AW-XXXXXXXXX), loaded via gtag.js when no GTM container is set
 *   NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL  conversion label for the website lead conversion
 *   NEXT_PUBLIC_META_PIXEL_ID          Meta Pixel (server CAPI dedups on the same event_id)
 *   NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID    OpenAI Ads pixel (existing integration, see lib/openai-ads)
 *   NEXT_PUBLIC_LEAD_VALUE             optional expected value (USD) attached to the lead conversion for bidding
 */
export const tracking = {
  gtm: process.env.NEXT_PUBLIC_GTM_ID || "",
  ga4: process.env.NEXT_PUBLIC_GA4_ID || "",
  googleAds: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "",
  googleAdsLeadLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || "",
  metaPixel: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
  leadValue: Number(process.env.NEXT_PUBLIC_LEAD_VALUE || 0) || undefined,
};

/** Load gtag.js directly only when GTM is not in charge (avoids double-counting). */
export const gtagDirectIds = () => (tracking.gtm ? [] : [tracking.ga4, tracking.googleAds].filter(Boolean));
