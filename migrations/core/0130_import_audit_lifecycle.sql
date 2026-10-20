-- A committed import attempt survives a lost Worker or response. No source
-- records, names, addresses or bearer grants belong in this ledger.
CREATE TABLE oc_import_lifecycle (
    job_key TEXT PRIMARY KEY, job_id TEXT UNIQUE, plan_id TEXT UNIQUE,
    state TEXT NOT NULL CHECK(state IN ('active','idle','completed','failed','interrupted')),
    lease_token TEXT, lease_expires INTEGER,
    accepted_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, reason_code TEXT);

CREATE INDEX oc_import_lifecycle_expiry ON oc_import_lifecycle(state,lease_expires);

-- Existing unfinished jobs get a bounded grace period on held-data upgrades.
INSERT INTO oc_import_lifecycle(job_key,job_id,plan_id,state,lease_expires,accepted_at,updated_at)
 SELECT 'job:'||j.id,j.id,p.id,
 CASE WHEN j.state IN ('queued','applying') THEN 'active' WHEN j.state='failed' THEN 'failed'
 ELSE 'completed' END,
 CASE WHEN j.state IN ('queued','applying') THEN unixepoch()*1000+300000 ELSE NULL END,
 unixepoch()*1000,unixepoch()*1000
 FROM ik_jobs j LEFT JOIN ik_door_plans p ON j.operation_key='door:'||p.id;

CREATE TRIGGER oc_import_accepted AFTER INSERT ON ik_jobs BEGIN
 INSERT OR IGNORE INTO oc_import_lifecycle(job_key,job_id,plan_id,state,lease_expires,accepted_at,updated_at)
 SELECT 'job:'||NEW.id,NEW.id,p.id,'active',unixepoch()*1000+300000,unixepoch()*1000,unixepoch()*1000
 FROM (SELECT 1) LEFT JOIN ik_door_plans p ON NEW.operation_key='door:'||p.id;
 UPDATE oc_import_lifecycle SET job_id=NEW.id WHERE plan_id IN
  (SELECT id FROM ik_door_plans WHERE NEW.operation_key='door:'||id);
 UPDATE ik_door_plans SET job_id=NEW.id WHERE NEW.operation_key='door:'||id AND job_id IS NULL;
END;

-- The kit permits retrying failed legacy jobs. An interrupted job instead needs
-- explicit rollback/new review: it must never resume effects after restoration.
CREATE TRIGGER oc_import_no_interrupted_replay BEFORE UPDATE OF state,checkpoint ON ik_jobs
 WHEN NEW.state IN ('queued','applying','completed') AND EXISTS
 (SELECT 1 FROM oc_import_lifecycle WHERE job_id=OLD.id AND state='interrupted')
 BEGIN SELECT RAISE(ABORT,'IMPORT_INTERRUPTED_REQUIRES_ROLLBACK'); END;

CREATE TRIGGER oc_import_terminal AFTER UPDATE OF state ON ik_jobs
 WHEN NEW.state NOT IN ('queued','applying') BEGIN
 UPDATE oc_import_lifecycle SET
  state=CASE WHEN state='interrupted' THEN state WHEN NEW.state='failed' THEN 'failed' ELSE 'completed' END,
  reason_code=CASE WHEN state='interrupted' THEN reason_code WHEN NEW.state='failed' THEN 'import_apply_failed' ELSE NULL END,
  lease_token=NULL,lease_expires=NULL,updated_at=unixepoch()*1000 WHERE job_id=NEW.id;
END;
