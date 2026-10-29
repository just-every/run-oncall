-- Native REST intent is retained through shared review/approval execution.
CREATE TABLE oc_agent_operations (
  id TEXT PRIMARY KEY,
  client TEXT NOT NULL,
  key TEXT NOT NULL,
  agent TEXT NOT NULL,
  tool TEXT NOT NULL,
  args_sha256 TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(json_valid(operation)),
  UNIQUE(client,key)
);
