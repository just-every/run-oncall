-- Native outbox custody retains the originating sponsor, agent and consent.
-- Credentials and native role snapshots are deliberately absent.
CREATE TABLE oc_agent_outbox (
  outbox TEXT PRIMARY KEY,
  principal TEXT NOT NULL CHECK(json_valid(principal))
);
