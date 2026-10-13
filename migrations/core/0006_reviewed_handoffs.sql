-- Additive local reviewed-copy ledger. No transport or publishing authority.
CREATE TABLE handoff_state (
  id INTEGER PRIMARY KEY CHECK(id=1),
  revision INTEGER NOT NULL,
  data TEXT NOT NULL,
  write_token TEXT NOT NULL
);
INSERT INTO handoff_state VALUES (
  1, 0, '{"schemaVersion":1,"kind":"oncall-reviewed-handoffs","records":[]}', 'initial'
);
