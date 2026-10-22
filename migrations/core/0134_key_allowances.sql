-- Per-record policy survives archives; short-lived usage never carries credentials.
CREATE TABLE oc_key_allowances(id TEXT PRIMARY KEY,ordinal INTEGER NOT NULL,data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_key_rate_usage(key_id TEXT NOT NULL,at INTEGER NOT NULL,requests INTEGER NOT NULL DEFAULT 0,events INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(key_id,at));
CREATE TABLE oc_key_rate_notified(key_id TEXT PRIMARY KEY,at INTEGER NOT NULL);
