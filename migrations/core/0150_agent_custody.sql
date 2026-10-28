-- Durable originating identity; this is not a second identity authority.
CREATE TABLE oc_agent_outbox (
 id TEXT PRIMARY KEY,
 principal TEXT NOT NULL CHECK(json_valid(principal)),
 operation_key TEXT NOT NULL
);
CREATE TABLE oc_agent_transport (
 id TEXT PRIMARY KEY,
 client TEXT NOT NULL,
 key_hash TEXT NOT NULL,
 request_hash TEXT NOT NULL,
 family TEXT NOT NULL,
 service TEXT NOT NULL,
 args TEXT NOT NULL CHECK(json_valid(args)),
 UNIQUE(client,key_hash)
);
