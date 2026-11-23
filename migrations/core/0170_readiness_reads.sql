-- Retained readiness evidence is queried in place. These indexes backfill from
-- existing rows and are kept current by native writes, restore and erasure.
CREATE INDEX IF NOT EXISTS oc_readiness_change_latest ON oc_changes(json_extract(data,'$.acceptedAt'));
CREATE INDEX IF NOT EXISTS oc_readiness_change_source ON oc_changes(json_extract(data,'$.source'),json_extract(data,'$.acceptedAt'));
CREATE INDEX IF NOT EXISTS oc_readiness_event_latest ON oc_events(COALESCE(source NOT LIKE 'email:%' AND source NOT LIKE 'intake:%',0),json_extract(data,'$.acceptedAt'));
CREATE INDEX IF NOT EXISTS oc_readiness_intake_latest ON oc_intake_receipts(COALESCE(json_extract(data,'$.provider')='native',0),json_extract(data,'$.acceptedAt'));
CREATE INDEX IF NOT EXISTS oc_readiness_intake_source ON oc_intake_receipts(json_extract(data,'$.source'),json_extract(data,'$.acceptedAt'));
CREATE INDEX IF NOT EXISTS oc_readiness_admitted_email ON oc_email_receipts(json_extract(data,'$.at'))
 WHERE json_extract(data,'$.outcome') NOT IN ('refused','quarantined');
CREATE INDEX IF NOT EXISTS oc_readiness_active_email_addresses ON oc_email_credentials(address) WHERE active=1;

CREATE INDEX IF NOT EXISTS oc_readiness_recent_refusal ON oc_admin_audit(at)
 WHERE outcome IN ('refused','failed') AND feature IN ('ingest','intake','monitoring','email','changes');
CREATE INDEX IF NOT EXISTS oc_readiness_recent_usage ON oc_key_rate_usage(at,key_id,requests,events);
CREATE INDEX IF NOT EXISTS oc_readiness_recent_throttle ON oc_key_rate_notified(at);
CREATE INDEX IF NOT EXISTS oc_readiness_schedule_change ON oc_admin_audit(at)
 WHERE outcome='accepted' AND paging_after>paging_before AND (kind='paging.schedules' OR feature='schedules' OR kind LIKE 'schedule.%');
CREATE INDEX IF NOT EXISTS oc_readiness_admin_policy ON oc_admin_audit(at)
 WHERE outcome='accepted' AND (workspace_after>workspace_before OR paging_after>paging_before) AND kind IN ('command.policy','paging.policies','schedule.policy');
CREATE INDEX IF NOT EXISTS oc_readiness_admin_service ON oc_admin_audit(at)
 WHERE outcome='accepted' AND workspace_after>workspace_before AND kind IN ('command.service','command.service-dependencies','command.service-template');
CREATE INDEX IF NOT EXISTS oc_readiness_workspace_policy ON oc_audit(json_extract(data,'$.at'))
 WHERE json_extract(data,'$.kind') IN ('policy','urgency-rule','response-policy','user-assignment','acknowledgment-timeout');
CREATE INDEX IF NOT EXISTS oc_readiness_workspace_service ON oc_audit(json_extract(data,'$.at'))
 WHERE json_extract(data,'$.kind') IN ('service','service-dependencies','service-template','urgency-rule','response-policy','user-assignment','acknowledgment-timeout');

CREATE INDEX IF NOT EXISTS oc_readiness_intake_alert ON oc_intake_receipts(json_extract(data,'$.alert'),json_extract(data,'$.acceptedAt'));
CREATE INDEX IF NOT EXISTS oc_readiness_email_alert ON oc_email_receipts(json_extract(data,'$.alert'),json_extract(data,'$.at'));
CREATE INDEX IF NOT EXISTS oc_readiness_alert_obligation ON oc_alerts(id)
 WHERE json_extract(data,'$.obligation.state')='recorded' OR json_extract(data,'$.obligation.recoveryNotice.state')='recorded';
CREATE INDEX IF NOT EXISTS oc_readiness_outbox ON oc_api_outbox(json_extract(data,'$.status'),json_extract(data,'$.at'),json_extract(data,'$.leaseUntil'))
 WHERE json_extract(data,'$.status')<>'sent';

CREATE INDEX IF NOT EXISTS oa_readiness_mail_proof ON oa_tokens(mail_sender_digest,consumed_at,id)
 WHERE kind='magic' AND revoked_at IS NULL AND consumed_at IS NOT NULL;
