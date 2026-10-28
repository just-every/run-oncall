-- Short-lived encrypted OAuth custody. Never part of an archive or import.
-- The minute sweep revokes abandoned connections before the ten-minute bound.
CREATE TABLE oc_move_in_consent (
 id TEXT PRIMARY KEY,
 custody TEXT NOT NULL,
 revoke_at INTEGER NOT NULL,
 expires INTEGER NOT NULL
);
CREATE INDEX oc_move_in_consent_expiry ON oc_move_in_consent(revoke_at);
