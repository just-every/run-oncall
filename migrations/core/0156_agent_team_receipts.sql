-- Installation-bound team effect evidence, without names, arguments or results.
CREATE TABLE oc_agent_team_receipts (
  agent TEXT NOT NULL,
  key_sha256 TEXT NOT NULL,
  person TEXT NOT NULL,
  client TEXT,
  consent TEXT,
  approval TEXT,
  operation TEXT NOT NULL,
  args_sha256 TEXT NOT NULL,
  team TEXT NOT NULL,
  team_sha256 TEXT NOT NULL,
  requested_revision INTEGER NOT NULL,
  team_revision INTEGER NOT NULL,
  manager_gains TEXT NOT NULL CHECK(json_valid(manager_gains) AND json_type(manager_gains)='array'),
  workspace TEXT NOT NULL,
  workspace_revision INTEGER NOT NULL,
  workspace_token TEXT NOT NULL,
  PRIMARY KEY(agent,key_sha256)
);
