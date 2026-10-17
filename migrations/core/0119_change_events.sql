-- Change receipts and safe definitions travel; encrypted verification keys stay local.
CREATE TABLE oc_changes (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_change_sources (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_change_credentials (source TEXT PRIMARY KEY, key_digest TEXT NOT NULL UNIQUE, ciphertext TEXT NOT NULL);
