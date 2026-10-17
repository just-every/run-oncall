-- Receipts and safe integration definitions travel; verification hashes stay local.
CREATE TABLE oc_intake_sources (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_intake_receipts (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_intake_credentials (source TEXT PRIMARY KEY, key_digest TEXT NOT NULL UNIQUE);
