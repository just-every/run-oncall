-- Completed native effects can authorize classification of their exact receipt.
-- This stores no response body and grants no authority to execute a new effect.
CREATE TABLE oc_agent_schedule_receipts (
  agent TEXT NOT NULL,
  key TEXT NOT NULL,
  person TEXT NOT NULL,
  client TEXT,
  consent TEXT,
  tool TEXT NOT NULL,
  args_sha256 TEXT NOT NULL,
  schedule TEXT NOT NULL,
  schedule_revision INTEGER NOT NULL,
  workspace_revision INTEGER NOT NULL,
  workspace_token TEXT NOT NULL,
  operation TEXT NOT NULL,
  before_schedule TEXT NOT NULL CHECK(json_valid(before_schedule)),
  after_schedule TEXT NOT NULL CHECK(json_valid(after_schedule)),
  PRIMARY KEY(agent,key)
);
