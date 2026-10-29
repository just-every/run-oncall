-- Installation-bound evidence of an erasure, never its content or cached result.
CREATE TABLE oc_agent_erasure_receipts (
  agent TEXT NOT NULL,
  key_sha256 TEXT NOT NULL,
  person TEXT NOT NULL,
  client TEXT,
  consent TEXT,
  approval TEXT,
  operation TEXT NOT NULL,
  args_sha256 TEXT NOT NULL,
  target_sha256 TEXT NOT NULL,
  requested_revision INTEGER NOT NULL,
  workspace TEXT NOT NULL,
  workspace_revision INTEGER NOT NULL,
  workspace_token TEXT NOT NULL,
  PRIMARY KEY(agent,key_sha256)
);
