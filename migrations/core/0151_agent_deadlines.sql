CREATE TABLE oc_agent_deadlines (
 id TEXT PRIMARY KEY,
 incident TEXT NOT NULL REFERENCES oc_incidents(id) ON DELETE CASCADE,
 principal TEXT NOT NULL CHECK(json_valid(principal)),
 operation_key TEXT NOT NULL
);
