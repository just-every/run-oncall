-- OC-053: scoped service-account API and durable signed outbound events. Additive: every released row is untouched.
-- Definitions ride the workspace archive like change sources; reusable credentials live in their own tables and are never archived.
CREATE TABLE oc_service_accounts(id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_webhook_endpoints(id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
-- A service-account token is held only as its SHA-256 digest; last use is operational metadata, not workspace state.
CREATE TABLE oc_api_credentials(account TEXT PRIMARY KEY, digest TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, rotated_at TEXT, last_used_at TEXT);
-- An endpoint signing secret is held only as installation-local AES-GCM ciphertext.
CREATE TABLE oc_webhook_credentials(endpoint TEXT PRIMARY KEY, ciphertext TEXT NOT NULL);
-- Replay protection for API mutations commits in the same batch as the mutation it answers.
CREATE TABLE oc_api_idempotency(account TEXT NOT NULL, key TEXT NOT NULL, fingerprint TEXT NOT NULL, status INTEGER NOT NULL, response TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(account,key));
-- Fixed-window request counters; throttling state only.
CREATE TABLE oc_api_rate(account TEXT NOT NULL, bucket TEXT NOT NULL, window INTEGER NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(account,bucket,window));
-- One row per (event, endpoint) operation. The stable id is the receiver's deduplication key; rev guards every transition.
CREATE TABLE oc_outbox(
  id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL UNIQUE, endpoint TEXT NOT NULL, event_id TEXT NOT NULL, rev INTEGER NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('queued','sending','sent','failed','uncertain','interrupted','refused','held')),
  due_at INTEGER, lease_expires INTEGER, started INTEGER NOT NULL DEFAULT 0 CHECK(started IN (0,1)),
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX oc_outbox_due ON oc_outbox(state,due_at);
