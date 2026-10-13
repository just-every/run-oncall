-- Upgrade the held one-row store. Immutable migrations 0001-0006 are retained.
CREATE TABLE workspace_control (id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,write_token TEXT);
INSERT INTO workspace_control SELECT id,revision,write_token FROM workspace;
CREATE TABLE oc_members (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
INSERT INTO oc_members(id,ordinal,data) SELECT json_extract(value,'$.id'),CAST(key AS INTEGER),value FROM workspace,json_each(workspace.data,'$.members');
CREATE TABLE oc_services (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
INSERT INTO oc_services(id,ordinal,data) SELECT json_extract(value,'$.id'),CAST(key AS INTEGER),value FROM workspace,json_each(workspace.data,'$.services');
CREATE TABLE oc_policies (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
INSERT INTO oc_policies(id,ordinal,data) SELECT json_extract(value,'$.id'),CAST(key AS INTEGER),value FROM workspace,json_each(workspace.data,'$.policies');
CREATE TABLE oc_events (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)), source TEXT GENERATED ALWAYS AS (json_extract(data,'$.source')) STORED, event_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.eventId')) STORED, UNIQUE(source,event_id));
INSERT INTO oc_events(id,ordinal,data) SELECT json_extract(value,'$.id'),CAST(key AS INTEGER),value FROM workspace,json_each(workspace.data,'$.events');
CREATE TABLE oc_alerts (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
INSERT INTO oc_alerts(id,ordinal,data) SELECT json_extract(value,'$.id'),CAST(key AS INTEGER),value FROM workspace,json_each(workspace.data,'$.alerts');
CREATE TABLE oc_incidents (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
INSERT INTO oc_incidents(id,ordinal,data) SELECT json_extract(value,'$.id'),CAST(key AS INTEGER),value FROM workspace,json_each(workspace.data,'$.incidents');
CREATE TABLE oc_audit (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
INSERT INTO oc_audit(id,ordinal,data) SELECT json_extract(value,'$.id'),CAST(key AS INTEGER),value FROM workspace,json_each(workspace.data,'$.audit');
DROP TABLE workspace;
CREATE TABLE operator_members (operator_id TEXT PRIMARY KEY REFERENCES oa_operators(id), member_id TEXT NOT NULL);
ALTER TABLE sessions ADD COLUMN operator_session TEXT;
CREATE TRIGGER oc_revoke_native_session AFTER UPDATE OF revoked_at ON oa_sessions WHEN NEW.revoked_at IS NOT NULL BEGIN DELETE FROM sessions WHERE operator_session=NEW.id; END;
CREATE TRIGGER oc_remove_native_session AFTER DELETE ON oa_sessions BEGIN DELETE FROM sessions WHERE operator_session=OLD.id; END;
CREATE TRIGGER oc_revoke_native_operator AFTER UPDATE OF version ON oa_operators BEGIN DELETE FROM sessions WHERE operator_session IN (SELECT id FROM oa_sessions WHERE operator_id=NEW.id); END;
CREATE TABLE move_in_objects (kind TEXT NOT NULL,id TEXT NOT NULL,revision TEXT NOT NULL,data TEXT NOT NULL CHECK(json_valid(data)),PRIMARY KEY(kind,id));
CREATE VIEW oc_current_sessions AS SELECT s.* FROM sessions s
 WHERE s.expires>round((julianday('now')-2440587.5)*86400000) AND
 (s.operator_session IS NULL OR EXISTS(SELECT 1 FROM oa_sessions n JOIN oa_operators o ON o.id=n.operator_id
 WHERE n.id=s.operator_session AND n.revoked_at IS NULL AND n.expires_at>round((julianday('now')-2440587.5)*86400000)
 AND o.status='active' AND o.version=n.operator_version));
