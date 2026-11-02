-- Keep the released 0147 migration immutable while adopting Base replay custody.
ALTER TABLE agent_door_agents ADD COLUMN tombstone TEXT;
ALTER TABLE agent_door_calls ADD COLUMN expires_at INTEGER;
-- Preserve the recorded start as the retention origin for completed old calls.
UPDATE agent_door_calls SET expires_at=created_at + 30*24*60*60*1000
WHERE state NOT IN ('running','pending');
CREATE INDEX agent_door_calls_expiry ON agent_door_calls(expires_at);

-- Installation-private replay custody, never included in an archive or export.
-- The call's fixed replay horizon bounds the alias; deletion is atomic below.
CREATE TABLE IF NOT EXISTS agent_door_replay_aliases (
  agent TEXT NOT NULL, alias TEXT NOT NULL, call_id TEXT NOT NULL, tombstone TEXT NOT NULL,
  PRIMARY KEY(agent,alias)
);

CREATE TRIGGER IF NOT EXISTS agent_door_delete_replay_aliases AFTER DELETE ON agent_door_calls
BEGIN
  DELETE FROM agent_door_replay_aliases WHERE agent=OLD.agent AND call_id=OLD.decision_id;
END;
CREATE INDEX IF NOT EXISTS agent_door_replay_aliases_call ON agent_door_replay_aliases(agent,call_id);
