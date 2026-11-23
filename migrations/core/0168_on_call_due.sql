-- A running notification needs attention at its earliest pending record,
-- phase boundary or completion. Terminal runs leave the projection entirely.
CREATE TABLE IF NOT EXISTS oc_on_call_due (
  alert TEXT NOT NULL PRIMARY KEY,
  due_at REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS oc_on_call_due_at ON oc_on_call_due(due_at);

CREATE VIEW IF NOT EXISTS oc_on_call_due_rows AS
WITH running AS (
  SELECT id AS alert, json_extract(data,'$.onCall') AS run
  FROM oc_alerts WHERE json_extract(data,'$.onCall.state')='running'
), phases AS (
  SELECT alert, run, julianday(json_extract(run,'$.endsAt')) AS ends_at,
    CASE WHEN json_extract(run,'$.step')=1 THEN julianday(json_extract(run,'$.secondStepAt')) END AS step_at
  FROM running
)
SELECT alert, min(ends_at, coalesce(step_at,ends_at),
  coalesce((SELECT min(julianday(json_extract(record.value,'$.dueAt')))
    FROM json_each(run,'$.records') record WHERE json_extract(record.value,'$.state')='pending'),ends_at)) AS due_at
FROM phases;

INSERT OR IGNORE INTO oc_on_call_due(alert,due_at)
SELECT alert,due_at FROM oc_on_call_due_rows;

CREATE TRIGGER IF NOT EXISTS oc_on_call_due_insert
AFTER INSERT ON oc_alerts
WHEN json_extract(NEW.data,'$.onCall.state')='running'
BEGIN
  INSERT OR IGNORE INTO oc_on_call_due(alert,due_at)
  SELECT alert,due_at FROM oc_on_call_due_rows WHERE alert=NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS oc_on_call_due_update
AFTER UPDATE OF data ON oc_alerts
WHEN (json_extract(OLD.data,'$.onCall.state')='running' OR json_extract(NEW.data,'$.onCall.state')='running')
  AND json_extract(OLD.data,'$.onCall') IS NOT json_extract(NEW.data,'$.onCall')
BEGIN
  DELETE FROM oc_on_call_due WHERE alert=OLD.id;
  INSERT OR IGNORE INTO oc_on_call_due(alert,due_at)
  SELECT alert,due_at FROM oc_on_call_due_rows WHERE alert=NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS oc_on_call_due_delete
AFTER DELETE ON oc_alerts
WHEN json_extract(OLD.data,'$.onCall.state')='running'
BEGIN
  DELETE FROM oc_on_call_due WHERE alert=OLD.id;
END;
