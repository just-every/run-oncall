-- Publish the check marker with the door job's final batch. Business plans
-- waiting for approval are never treated as owner previews.
CREATE TRIGGER oc_import_needs_check AFTER UPDATE OF state ON ik_jobs
 WHEN NEW.destination='oncall' AND NEW.operation_key LIKE 'door:%'
  AND OLD.state IN ('queued','applying') AND NEW.state='completed'
 BEGIN
  INSERT OR IGNORE INTO move_in_previews(plan_id)
   SELECT id FROM ik_door_plans WHERE id=substr(NEW.operation_key,6) AND job_id=NEW.id AND installation_id='oncall';
 END;
