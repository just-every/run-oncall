-- Readers keep an isolate-local copy of the workspace and paging records
-- (src/read-cache.ts). Every change to one is logged here by key, so a repeat
-- read costs the new entries and changed rows only. Each entry's random nonce
-- lets a reader tell its last entry from a different one at the same seq after
-- a point-in-time restore. A '*' entry marks changes made outside the log (a
-- portable import restores rows with these triggers dropped); readers then read
-- every row again. The control rows are read in full on every read and are not
-- logged: their CAS checks count changed rows, which a trigger would add to.
-- The newest 8192 entries are kept.
CREATE TABLE oc_read_changes (seq INTEGER PRIMARY KEY AUTOINCREMENT, tbl TEXT NOT NULL, pk,
 nonce TEXT NOT NULL DEFAULT (lower(hex(randomblob(8)))));
CREATE INDEX oc_read_changes_breaks ON oc_read_changes(seq) WHERE tbl='*';
-- The first entry: a reader's copy always follows a real entry, never an empty log.
INSERT INTO oc_read_changes(tbl,pk) VALUES('#',NULL);
CREATE TRIGGER oc_read_changes_prune AFTER INSERT ON oc_read_changes WHEN NEW.seq%256=0
BEGIN
 DELETE FROM oc_read_changes WHERE seq<=NEW.seq-8192;
END;
CREATE TRIGGER oc_read_portability_import AFTER UPDATE OF import_job ON rer_portability_state
 WHEN OLD.import_job IS NOT NULL AND NEW.import_job IS NULL AND OLD.applying=1
BEGIN
 INSERT INTO oc_read_changes(tbl,pk) VALUES('*',NULL);
END;

-- A cold reader starts from this stored copy and applies the log after its seq.
-- The minute cron rewrites it (src/read-snapshot.ts). Each part stays well under
-- D1's 2 MB row limit; every part names the log entry (seq and nonce) it follows.
CREATE TABLE oc_read_snapshot (part INTEGER PRIMARY KEY, seq INTEGER NOT NULL, nonce TEXT, parts INTEGER NOT NULL, data TEXT NOT NULL);

CREATE TRIGGER oc_read_oc_teams_insert AFTER INSERT ON oc_teams BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_teams',NEW.id); END;
CREATE TRIGGER oc_read_oc_teams_update AFTER UPDATE ON oc_teams BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_teams',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_teams',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_teams_delete AFTER DELETE ON oc_teams BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_teams',OLD.id); END;
CREATE TRIGGER oc_read_oc_erased_report_cases_insert AFTER INSERT ON oc_erased_report_cases BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_erased_report_cases',NEW.id); END;
CREATE TRIGGER oc_read_oc_erased_report_cases_update AFTER UPDATE ON oc_erased_report_cases BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_erased_report_cases',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_erased_report_cases',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_erased_report_cases_delete AFTER DELETE ON oc_erased_report_cases BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_erased_report_cases',OLD.id); END;
CREATE TRIGGER oc_read_oc_schedule_records_insert AFTER INSERT ON oc_schedule_records BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_schedule_records',NEW.id); END;
CREATE TRIGGER oc_read_oc_schedule_records_update AFTER UPDATE ON oc_schedule_records BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_schedule_records',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_schedule_records',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_schedule_records_delete AFTER DELETE ON oc_schedule_records BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_schedule_records',OLD.id); END;
CREATE TRIGGER oc_read_oc_business_services_insert AFTER INSERT ON oc_business_services BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_business_services',NEW.id); END;
CREATE TRIGGER oc_read_oc_business_services_update AFTER UPDATE ON oc_business_services BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_business_services',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_business_services',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_business_services_delete AFTER DELETE ON oc_business_services BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_business_services',OLD.id); END;
CREATE TRIGGER oc_read_oc_key_allowances_insert AFTER INSERT ON oc_key_allowances BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_key_allowances',NEW.id); END;
CREATE TRIGGER oc_read_oc_key_allowances_update AFTER UPDATE ON oc_key_allowances BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_key_allowances',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_key_allowances',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_key_allowances_delete AFTER DELETE ON oc_key_allowances BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_key_allowances',OLD.id); END;
CREATE TRIGGER oc_read_oc_api_clients_insert AFTER INSERT ON oc_api_clients BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_api_clients',NEW.id); END;
CREATE TRIGGER oc_read_oc_api_clients_update AFTER UPDATE ON oc_api_clients BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_api_clients',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_api_clients',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_api_clients_delete AFTER DELETE ON oc_api_clients BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_api_clients',OLD.id); END;
CREATE TRIGGER oc_read_oc_api_endpoints_insert AFTER INSERT ON oc_api_endpoints BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_api_endpoints',NEW.id); END;
CREATE TRIGGER oc_read_oc_api_endpoints_update AFTER UPDATE ON oc_api_endpoints BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_api_endpoints',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_api_endpoints',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_api_endpoints_delete AFTER DELETE ON oc_api_endpoints BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_api_endpoints',OLD.id); END;
CREATE TRIGGER oc_read_oc_api_operations_insert AFTER INSERT ON oc_api_operations BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_api_operations',NEW.id); END;
CREATE TRIGGER oc_read_oc_api_operations_update AFTER UPDATE ON oc_api_operations BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_api_operations',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_api_operations',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_api_operations_delete AFTER DELETE ON oc_api_operations BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_api_operations',OLD.id); END;
CREATE TRIGGER oc_read_oc_api_outbox_insert AFTER INSERT ON oc_api_outbox BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_api_outbox',NEW.id); END;
CREATE TRIGGER oc_read_oc_api_outbox_update AFTER UPDATE ON oc_api_outbox BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_api_outbox',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_api_outbox',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_api_outbox_delete AFTER DELETE ON oc_api_outbox BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_api_outbox',OLD.id); END;
CREATE TRIGGER oc_read_oc_members_insert AFTER INSERT ON oc_members BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_members',NEW.id); END;
CREATE TRIGGER oc_read_oc_members_update AFTER UPDATE ON oc_members BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_members',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_members',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_members_delete AFTER DELETE ON oc_members BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_members',OLD.id); END;
CREATE TRIGGER oc_read_oc_services_insert AFTER INSERT ON oc_services BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_services',NEW.id); END;
CREATE TRIGGER oc_read_oc_services_update AFTER UPDATE ON oc_services BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_services',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_services',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_services_delete AFTER DELETE ON oc_services BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_services',OLD.id); END;
CREATE TRIGGER oc_read_oc_policies_insert AFTER INSERT ON oc_policies BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_policies',NEW.id); END;
CREATE TRIGGER oc_read_oc_policies_update AFTER UPDATE ON oc_policies BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_policies',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_policies',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_policies_delete AFTER DELETE ON oc_policies BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_policies',OLD.id); END;
CREATE TRIGGER oc_read_oc_events_insert AFTER INSERT ON oc_events BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_events',NEW.id); END;
CREATE TRIGGER oc_read_oc_events_update AFTER UPDATE ON oc_events BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_events',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_events',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_events_delete AFTER DELETE ON oc_events BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_events',OLD.id); END;
CREATE TRIGGER oc_read_oc_alerts_insert AFTER INSERT ON oc_alerts BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_alerts',NEW.id); END;
CREATE TRIGGER oc_read_oc_alerts_update AFTER UPDATE ON oc_alerts BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_alerts',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_alerts',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_alerts_delete AFTER DELETE ON oc_alerts BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_alerts',OLD.id); END;
CREATE TRIGGER oc_read_oc_incidents_insert AFTER INSERT ON oc_incidents BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_incidents',NEW.id); END;
CREATE TRIGGER oc_read_oc_incidents_update AFTER UPDATE ON oc_incidents BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_incidents',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_incidents',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_incidents_delete AFTER DELETE ON oc_incidents BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_incidents',OLD.id); END;
CREATE TRIGGER oc_read_oc_audit_insert AFTER INSERT ON oc_audit BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_audit',NEW.id); END;
CREATE TRIGGER oc_read_oc_audit_update AFTER UPDATE ON oc_audit BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_audit',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_audit',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_audit_delete AFTER DELETE ON oc_audit BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_audit',OLD.id); END;
CREATE TRIGGER oc_read_oc_triage_insert AFTER INSERT ON oc_triage BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_triage',NEW.id); END;
CREATE TRIGGER oc_read_oc_triage_update AFTER UPDATE ON oc_triage BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_triage',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_triage',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_triage_delete AFTER DELETE ON oc_triage BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_triage',OLD.id); END;
CREATE TRIGGER oc_read_oc_changes_insert AFTER INSERT ON oc_changes BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_changes',NEW.id); END;
CREATE TRIGGER oc_read_oc_changes_update AFTER UPDATE ON oc_changes BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_changes',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_changes',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_changes_delete AFTER DELETE ON oc_changes BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_changes',OLD.id); END;
CREATE TRIGGER oc_read_oc_change_sources_insert AFTER INSERT ON oc_change_sources BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_change_sources',NEW.id); END;
CREATE TRIGGER oc_read_oc_change_sources_update AFTER UPDATE ON oc_change_sources BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_change_sources',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_change_sources',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_change_sources_delete AFTER DELETE ON oc_change_sources BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_change_sources',OLD.id); END;
CREATE TRIGGER oc_read_oc_intake_sources_insert AFTER INSERT ON oc_intake_sources BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_intake_sources',NEW.id); END;
CREATE TRIGGER oc_read_oc_intake_sources_update AFTER UPDATE ON oc_intake_sources BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_intake_sources',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_intake_sources',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_intake_sources_delete AFTER DELETE ON oc_intake_sources BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_intake_sources',OLD.id); END;
CREATE TRIGGER oc_read_oc_intake_receipts_insert AFTER INSERT ON oc_intake_receipts BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_intake_receipts',NEW.id); END;
CREATE TRIGGER oc_read_oc_intake_receipts_update AFTER UPDATE ON oc_intake_receipts BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_intake_receipts',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_intake_receipts',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_intake_receipts_delete AFTER DELETE ON oc_intake_receipts BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_intake_receipts',OLD.id); END;
CREATE TRIGGER oc_read_oc_email_addresses_insert AFTER INSERT ON oc_email_addresses BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_addresses',NEW.id); END;
CREATE TRIGGER oc_read_oc_email_addresses_update AFTER UPDATE ON oc_email_addresses BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_addresses',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_email_addresses',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_email_addresses_delete AFTER DELETE ON oc_email_addresses BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_addresses',OLD.id); END;
CREATE TRIGGER oc_read_oc_email_rules_insert AFTER INSERT ON oc_email_rules BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_rules',NEW.id); END;
CREATE TRIGGER oc_read_oc_email_rules_update AFTER UPDATE ON oc_email_rules BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_rules',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_email_rules',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_email_rules_delete AFTER DELETE ON oc_email_rules BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_rules',OLD.id); END;
CREATE TRIGGER oc_read_oc_email_samples_insert AFTER INSERT ON oc_email_samples BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_samples',NEW.id); END;
CREATE TRIGGER oc_read_oc_email_samples_update AFTER UPDATE ON oc_email_samples BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_samples',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_email_samples',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_email_samples_delete AFTER DELETE ON oc_email_samples BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_samples',OLD.id); END;
CREATE TRIGGER oc_read_oc_email_receipts_insert AFTER INSERT ON oc_email_receipts BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_receipts',NEW.id); END;
CREATE TRIGGER oc_read_oc_email_receipts_update AFTER UPDATE ON oc_email_receipts BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_receipts',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_email_receipts',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_email_receipts_delete AFTER DELETE ON oc_email_receipts BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_receipts',OLD.id); END;
CREATE TRIGGER oc_read_oc_email_quarantine_insert AFTER INSERT ON oc_email_quarantine BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_quarantine',NEW.id); END;
CREATE TRIGGER oc_read_oc_email_quarantine_update AFTER UPDATE ON oc_email_quarantine BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_quarantine',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_email_quarantine',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_oc_email_quarantine_delete AFTER DELETE ON oc_email_quarantine BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('oc_email_quarantine',OLD.id); END;
CREATE TRIGGER oc_read_paging_schedules_insert AFTER INSERT ON paging_schedules BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_schedules',NEW.id); END;
CREATE TRIGGER oc_read_paging_schedules_update AFTER UPDATE ON paging_schedules BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_schedules',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'paging_schedules',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_paging_schedules_delete AFTER DELETE ON paging_schedules BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_schedules',OLD.id); END;
CREATE TRIGGER oc_read_paging_policies_insert AFTER INSERT ON paging_policies BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_policies',NEW.service); END;
CREATE TRIGGER oc_read_paging_policies_update AFTER UPDATE ON paging_policies BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_policies',NEW.service); INSERT INTO oc_read_changes(tbl,pk) SELECT 'paging_policies',OLD.service WHERE OLD.service IS NOT NEW.service; END;
CREATE TRIGGER oc_read_paging_policies_delete AFTER DELETE ON paging_policies BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_policies',OLD.service); END;
CREATE TRIGGER oc_read_paging_jobs_insert AFTER INSERT ON paging_jobs BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_jobs',NEW.id); END;
CREATE TRIGGER oc_read_paging_jobs_update AFTER UPDATE ON paging_jobs BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_jobs',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'paging_jobs',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_paging_jobs_delete AFTER DELETE ON paging_jobs BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_jobs',OLD.id); END;
CREATE TRIGGER oc_read_paging_receipts_insert AFTER INSERT ON paging_receipts BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_receipts',NEW.id); END;
CREATE TRIGGER oc_read_paging_receipts_update AFTER UPDATE ON paging_receipts BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_receipts',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'paging_receipts',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_paging_receipts_delete AFTER DELETE ON paging_receipts BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_receipts',OLD.id); END;
CREATE TRIGGER oc_read_paging_callbacks_insert AFTER INSERT ON paging_callbacks BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_callbacks',NEW.id); END;
CREATE TRIGGER oc_read_paging_callbacks_update AFTER UPDATE ON paging_callbacks BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_callbacks',NEW.id); INSERT INTO oc_read_changes(tbl,pk) SELECT 'paging_callbacks',OLD.id WHERE OLD.id IS NOT NEW.id; END;
CREATE TRIGGER oc_read_paging_callbacks_delete AFTER DELETE ON paging_callbacks BEGIN INSERT INTO oc_read_changes(tbl,pk) VALUES('paging_callbacks',OLD.id); END;
