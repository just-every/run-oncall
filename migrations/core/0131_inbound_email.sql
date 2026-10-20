-- Additive: released coordination, intake, audit and import rows are untouched.
CREATE TABLE oc_email_addresses(id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_email_rules(id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_email_samples(id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_email_receipts(id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_email_quarantine(id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
-- Retired address digests retain attribution for refused delivery; no plaintext or read credential.
CREATE TABLE oc_email_credentials(digest TEXT PRIMARY KEY, address TEXT NOT NULL, active INTEGER NOT NULL CHECK(active IN (0,1)));

-- Installation-local erasure fence for direct JSON/checkpoint restore.
CREATE TABLE oc_email_erased_samples(id TEXT PRIMARY KEY);
