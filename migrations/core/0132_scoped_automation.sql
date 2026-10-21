-- Additive definitions and exact operational history; credentials remain local.
CREATE TABLE oc_api_clients (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_api_endpoints (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_api_operations (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_api_outbox (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE oc_api_credentials (client TEXT PRIMARY KEY, digest TEXT NOT NULL UNIQUE, window INTEGER NOT NULL DEFAULT 0, requests INTEGER NOT NULL DEFAULT 0);
CREATE TABLE oc_endpoint_credentials (endpoint TEXT PRIMARY KEY, custody TEXT NOT NULL);
