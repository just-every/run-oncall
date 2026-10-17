-- Additive optional coordination records. Held incident JSON and array order stay intact.
CREATE TABLE oc_triage (
  id TEXT PRIMARY KEY,
  ordinal INTEGER NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
