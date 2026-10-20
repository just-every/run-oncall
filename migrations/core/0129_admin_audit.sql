-- Permanent administrative history. No payloads, names, credentials or identity hashes.
-- The revocable identity association is deliberately separate from immutable history.
CREATE TABLE oc_audit_identities (
  kind TEXT NOT NULL, entity_id TEXT NOT NULL, label TEXT NOT NULL UNIQUE,
  PRIMARY KEY(kind,entity_id)
);
CREATE TABLE oc_audit_clock (
  id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 0,
  changes_before INTEGER NOT NULL DEFAULT 0, changed INTEGER NOT NULL DEFAULT 0,
  actor_label TEXT, subject_label TEXT, source_label TEXT,
  workspace_before INTEGER NOT NULL DEFAULT 0,
  paging_before INTEGER NOT NULL DEFAULT 0, handoff_before INTEGER NOT NULL DEFAULT 0
);
INSERT INTO oc_audit_clock(id) VALUES(1);
CREATE TABLE oc_admin_audit (
  ordinal INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL, feature TEXT NOT NULL, actor TEXT NOT NULL,
  subject TEXT NOT NULL, source TEXT NOT NULL, at TEXT NOT NULL,
  before_revision INTEGER NOT NULL, after_revision INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('accepted','refused','failed','interrupted','uncertain')),
  workspace_before INTEGER NOT NULL, workspace_after INTEGER NOT NULL,
  paging_before INTEGER NOT NULL, paging_after INTEGER NOT NULL,
  handoff_before INTEGER NOT NULL, handoff_after INTEGER NOT NULL
);
CREATE TRIGGER oc_admin_audit_no_update BEFORE UPDATE ON oc_admin_audit
BEGIN SELECT RAISE(ABORT,'OC_AUDIT_APPEND_ONLY'); END;
CREATE TRIGGER oc_admin_audit_no_delete BEFORE DELETE ON oc_admin_audit
BEGIN SELECT RAISE(ABORT,'OC_AUDIT_APPEND_ONLY'); END;
