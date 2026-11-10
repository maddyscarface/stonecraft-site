# 13 — Owner & Commercial Sales Dashboards

Live now at `/admin/dashboard` (executive) and `/admin/dashboard?view=ops` (operations), filterable by market and 7/30/90/365 days. Data sources: site lead log (KV) + CRM stage events (webhook). SmartOps-only metrics show as "connect SmartOps" rather than estimates.

| Metric | Source | Status |
|---|---|---|
| Leads by service interest | lead log `surfaces` | Live |
| Leads by state / market and city | lead log | Live |
| Source attribution (source/medium, campaign) | lead log (UTM/click ids) | Live |
| Qualified leads (hot + warm; CRM `qualified_lead`) | score + webhook | Live |
| Booked estimates / site walks | webhook `appointment_booked` | Live once W7 is configured |
| Estimate conversion (lead → booked) | computed | Live |
| Residential job value (won avg) | webhook `job_won` value | Live once W7 sends value |
| Commercial pipeline value | GHL opportunity values | GHL report (link from dashboard) |
| Commercial accounts contacted | GHL Commercial pipeline stages ≥ Outreach Started | GHL report |
| Site walks booked · proposals issued · contract revenue | webhook stages Site Walk / Proposal / Contract | Live once W7 covers commercial stages |
| Gross margin | SmartOps `v_jobs` | Pending SmartOps Phase 3 |
| Repeat business | SmartOps `v_repeat_customers` | Pending |
| Technician utilisation | SmartOps `v_tech_utilisation` | Pending Phase 2 |
| Territory profitability | SmartOps `v_jobs` by zone − allocated ad spend | Pending; ad spend import (Ads/Meta API or monthly CSV) |
| Google Ads offline conversions | `/api/admin/export` | Live |

## Executive view (weekly review)
Leads · qualified % · booked % · won count/value · CPL and cost per booked estimate by channel (add spend import) · market split · top cities · commercial pipeline summary.

## Operational view (daily)
Zone distribution · tier mix · form variants · recent-leads table with CRM delivery status (dry-run / live / error) · dead-letter queue (`lead_dead_letter` list — any entry means a lead reached neither CRM nor email; call it immediately).

## GHL reports to build
Pipeline value by stage (each pipeline, each location) · Opportunities won by source · Speed-to-lead (first outbound activity − created) · Appointment show rate · Review requests sent vs reviews received.

## Targets to set after 30 days of data
Lead → photos ≥ 55% · photos → qualified ≥ 60% · qualified → booked ≥ 40% · booked → won ≥ 45% · speed-to-lead < 15 business minutes (these are starting targets, not benchmarks).
