-- Swaps, recorded schedule notices, reminder settings and digest-only subscriptions.
CREATE TABLE oc_schedule_records(id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE INDEX oc_schedule_capabilities ON oc_schedule_records(json_extract(data,'$.data.hash'))
 WHERE json_extract(data,'$.kind')='subscription' AND json_extract(data,'$.active')=1;
