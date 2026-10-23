-- Internal status, overrides, explicit audiences, subscriptions and record-only notices.
CREATE TABLE oc_business_services(id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
