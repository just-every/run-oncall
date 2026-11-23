-- Only pending deadlines need a cron entry. Keep the projection in the same
-- transaction as the incident, including archive replacement and erasure.
CREATE TABLE IF NOT EXISTS oc_pending_incident_deadlines (
  incident TEXT NOT NULL,
  deadline TEXT NOT NULL,
  due_at REAL NOT NULL,
  PRIMARY KEY (incident, deadline)
);

CREATE INDEX IF NOT EXISTS oc_pending_incident_deadlines_due
ON oc_pending_incident_deadlines(due_at, deadline, incident);

CREATE VIEW IF NOT EXISTS oc_pending_incident_deadline_rows AS
SELECT i.id AS incident, json_extract(d.value,'$.id') AS deadline,
       julianday(json_extract(d.value,'$.dueAt')) AS due_at
FROM oc_incidents i CROSS JOIN json_each(i.data,'$.deadlines') d
WHERE json_extract(d.value,'$.state')='pending';

INSERT OR IGNORE INTO oc_pending_incident_deadlines(incident,deadline,due_at)
SELECT incident,deadline,due_at FROM oc_pending_incident_deadline_rows;

CREATE TRIGGER IF NOT EXISTS oc_pending_incident_deadlines_insert
AFTER INSERT ON oc_incidents
WHEN json_array_length(NEW.data,'$.deadlines')>0
BEGIN
  INSERT OR IGNORE INTO oc_pending_incident_deadlines(incident,deadline,due_at)
  SELECT incident,deadline,due_at FROM oc_pending_incident_deadline_rows WHERE incident=NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS oc_pending_incident_deadlines_update
AFTER UPDATE OF data ON oc_incidents
WHEN json_extract(OLD.data,'$.deadlines') IS NOT json_extract(NEW.data,'$.deadlines')
BEGIN
  DELETE FROM oc_pending_incident_deadlines WHERE incident=OLD.id;
  INSERT OR IGNORE INTO oc_pending_incident_deadlines(incident,deadline,due_at)
  SELECT incident,deadline,due_at FROM oc_pending_incident_deadline_rows WHERE incident=NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS oc_pending_incident_deadlines_delete
AFTER DELETE ON oc_incidents
WHEN json_array_length(OLD.data,'$.deadlines')>0
BEGIN
  DELETE FROM oc_pending_incident_deadlines WHERE incident=OLD.id;
END;
