# 09 — SmartOps Integration Architecture

The public site (this repo) is the **acquisition front end**. SmartOps (`app.stonecraftboston.com`) is the **field-service system**. They share contracts, not a codebase. All nine modules from the SmartOps spec are retained.

```
 Ads / SEO / Outbound
        │
  Public site (Next.js, Vercel) ──► /api/leads ──► GoHighLevel (contact, opportunity, comms)
        │  photos → Supabase Storage (private bucket)          │ stage webhooks
        │  conversions → Meta CAPI / GA4 MP                    ▼
        │                                              /api/crm/webhook ──► Meta CAPI · GA4 · Google Ads offline
        ▼
  SmartOps (Supabase + app) ◄── upsert by sc_external_id ── GHL (Phase 1: Zapier/n8n or GHL webhook → SmartOps edge fn)
   ├ M1 CRM mirror + lead pipeline view
   ├ M2 Geographic scheduling engine  ← src/lib/scheduling (shared package)
   ├ M3 Tech dispatch & job management
   ├ M4 AI work-order generator      ← src/lib/workorder (shared package)
   ├ M5 Room scan + estimating        ← src/lib/pricing + /api/admin/room-scan pattern
   ├ M6 Virtual consult + before/after preview
   ├ M7 Payments (Stripe) + tech payouts (Stripe Connect)
   ├ M8 Chat, notifications, calendar sync (.ics / Google)
   └ M9 Multi-operator / white-label (operators, franchise_brands, RLS)
```

## Shared packages (extract to `packages/` when SmartOps repo starts)
| Package | Source here | Consumers |
|---|---|---|
| `@stonecraft/scheduling` | `src/lib/scheduling/*` (pure, tested) | Site admin tool, SmartOps calendar, booking API |
| `@stonecraft/pricing` | `src/lib/pricing/*` | Admin quote tool, SmartOps estimator, room-scan quote |
| `@stonecraft/workorder` | `src/lib/workorder/*` | SmartOps work orders, tech app |
| `@stonecraft/contracts` | `src/lib/leads/schema.ts`, `src/lib/crm/sync.ts` | Site, SmartOps ingest, webhooks |

## Database (SmartOps Supabase) — from the SmartOps spec, with additions
Tables: `operators`, `users`, `leads`, `appointments`, `work_orders`, `room_scans`, `job_messages`, `payments`, `job_photos`, `price_sheets`, `virtual_consultations`, `operator_zones`, `operator_payment_settings`, `franchise_brands`, `territory_applications`.
Additions:
```sql
alter table leads add column external_id text unique;      -- sc_external_id
alter table leads add column ghl_contact_id text, add column ghl_opportunity_id text;
alter table leads add column market text not null default 'boston';
alter table leads add column attribution jsonb default '{}'; -- utm, gclid, fbc, fbp, ga_client_id
alter table leads add column consent jsonb default '{}';     -- contact, sms, ad_storage at capture
alter table leads add column landlord_approval jsonb;        -- {status, document_url, approved_at}
alter table appointments add column ghl_appointment_id text unique;
alter table work_orders add column library_version text, add column field_ready boolean default false;
alter table work_orders add column validated_by uuid references users(id);
alter table payments add column idempotency_key text unique;
create table sync_log (id bigserial primary key, source text, object text, external_key text, action text, status text, payload jsonb, created_at timestamptz default now());
```
RLS: every table keyed by `operator_id` (spec Part 11/12). Technician views use a **Postgres view** `tech_work_orders` that excludes `price_total`, `margin`, and other owners' fields — the tech role has no grant on `work_orders` directly.

## Flows
**Lead → SmartOps:** GHL contact created → webhook to SmartOps `ingest-lead` edge function → upsert `leads` on `external_id` → zone detection (`@stonecraft/scheduling.detectZone`).
**Estimate booking:** BDR books in GHL calendar (Phase 1) → appointment webhook → SmartOps `appointments` (type `estimate`). Phase 2: SmartOps booking UI uses `suggestSlots` + `checkBooking`, writes to GHL calendar via API for customer reminders.
**Won → job:** GHL stage Won → SmartOps creates `work_orders` draft → owner completes scope → `generateBrief` → validation gate (`field_ready`) → dispatch to job board (Module 3).
**Completion → payment:** tech marks complete (photos required) → Stripe Payment Link → `payment_intent.succeeded` webhook → payments row (idempotency key) → GHL stage Paid → `/api/crm/webhook` conversion → review workflow.
**Tech payout:** owner approves → Stripe Connect transfer (1099) or hours export (W-2).

## Multi-market & white-label
StoneCraft Boston and StoneCraft SE Florida are **two operator rows** under one superadmin (spec Part 8). `franchise_brands` holds StoneCraft brand tokens; the Sir Grout brand record from the territory spec must **not** be loaded into the StoneCraft instance (separate legal business; Gate G1). Seasonal mode for FL zones is implemented in `effectiveZone()`.

## Data contract for dashboards (docs/13)
SmartOps exposes read-only views to the owner dashboard: `v_jobs(job_id, market, zone, service, sold_value, cost_materials, tech_pay, completed_at, tech_id, hours)`, `v_tech_utilisation(tech_id, date, scheduled_hours, available_hours)`, `v_repeat_customers(external_id, jobs_count, first_job, last_job)`. Gross margin = sold_value − materials − tech_pay (− allocated overhead when configured).

## Build order (do not skip M1–M3 for AI features)
| Phase | Weeks | Scope |
|---|---|---|
| 0 | done | Public site, lead API, GHL adapter, tracking, engines + tests |
| 1 | 1–4 | SmartOps foundation: auth/roles, operators, leads mirror, zones, estimate calendar (M1, M2) |
| 2 | 5–8 | Work orders + tech app + job board + photos (M3, M4 with validated library) |
| 3 | 9–12 | Payments + payouts + notifications/.ics (M7, M8) |
| 4 | 13+ | Room scan GA (after accuracy study), virtual consult, before/after preview (M5, M6) |
| 5 | later | Multi-operator onboarding, superadmin, SaaS billing (M9) |
