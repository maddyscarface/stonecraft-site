-- Rollback for StoneCraft 0004 (drops ONLY Phase 4 tables; Phase 2/3 data is untouched). Export audit_log, proposals and walkthroughs first if needed.
begin;
drop trigger if exists audit_log_no_change on audit_log;
drop function if exists audit_log_immutable();
drop table if exists proposal_history, proposal_export, proposal_line, proposal, rate_book_entry, rate_book,
  walkthrough_correction, walkthrough_media, walkthrough_measurement_version, walkthrough, zip_override, lead_record,
  crm_mapping, vendor_webhook_event, vendor_import_log, vendor_contact, vendor_export, vendor_feed, audience_recipe,
  consent_evidence, suppressions, audit_log, job_retry, event_outbox, media_asset, project_note, project_task, project_link, project,
  actor_brand_role, actor cascade;
-- brand is kept (shared reference table); drop manually if this database serves only StoneCraft.
commit;
