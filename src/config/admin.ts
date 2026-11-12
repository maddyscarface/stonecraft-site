/**
 * Build 04 §5: status of every /admin page. "operational" = reads/writes real data and is safe for
 * day-to-day use once env vars are set; "prototype" = demonstrates the workflow but must not be relied
 * on for customer-facing commitments. All pages are gated server-side (isAdmin in each page and API
 * route, plus a middleware pre-check) and noindex/no-store.
 */
export type AdminStatus = "operational" | "prototype";
export const ADMIN_PAGES: Record<string, { label: string; href: string; status: AdminStatus; note: string }> = {
  dashboard: { label: "Dashboard", href: "/admin/dashboard", status: "operational", note: "Reads the lead and conversion logs. Durable only when Upstash is configured; on preview it shows in-memory test data." },
  scheduling: { label: "Scheduling", href: "/admin/scheduling", status: "prototype", note: "Zone and slot logic from src/config/markets.ts. Not connected to the GHL Boston / Palm Beach–Broward calendars, so book real visits in GHL." },
  pricing: { label: "Pricing & quotes", href: "/admin/pricing", status: "prototype", note: "Draft price sheets (approved: false), not owner-reviewed. Internal estimates only. Never quote these to customers." },
  workorder: { label: "Work orders", href: "/admin/workorder", status: "prototype", note: "Step library not yet validated by a qualified technician. Briefs print \u201cField-ready: NO\u201d." },
  "room-scan": { label: "Room scan", href: "/admin/room-scan", status: "prototype", note: "AI-assisted measurement experiment, off unless ROOM_SCAN_ENABLED=true. Provisional only, never shown as measured dimensions." },
};
