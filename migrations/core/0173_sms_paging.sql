-- SMS paging is OFF until a rota is switched on and the Worker has a sender.
-- Both tables are installation-local operating state and never leave it:
-- an imported archive must not switch paging on, and a delivery log line
-- describes this installation's own provider attempts.
CREATE TABLE IF NOT EXISTS oc_paging_schedules (
  schedule TEXT NOT NULL PRIMARY KEY,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  changed_by TEXT NOT NULL,
  changed_at INTEGER NOT NULL
);

-- One row per page: 'page:<alert>:<step>' for an alert's escalation step,
-- 'test:<uuid>' for an administrator's test page. The primary key is the
-- idempotency key: an alert delivered twice, a retried cron or two overlapping
-- crons find the row and send nothing more. Only the last four digits of the
-- number are kept.
CREATE TABLE IF NOT EXISTS oc_page_deliveries (
  id TEXT NOT NULL PRIMARY KEY,
  alert TEXT,
  step INTEGER,
  schedule TEXT,
  member TEXT,
  to_hint TEXT,
  status TEXT NOT NULL CHECK (status IN ('sending', 'sent', 'retry', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt INTEGER NOT NULL,
  provider_ref TEXT,
  detail TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS oc_page_deliveries_alert ON oc_page_deliveries(alert);
CREATE INDEX IF NOT EXISTS oc_page_deliveries_open ON oc_page_deliveries(status, next_attempt);
CREATE INDEX IF NOT EXISTS oc_page_deliveries_created ON oc_page_deliveries(created_at);
