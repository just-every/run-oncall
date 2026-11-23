CREATE INDEX IF NOT EXISTS oc_api_outbox_due
ON oc_api_outbox(julianday(json_extract(data,'$.due')))
WHERE json_extract(data,'$.status') IN ('queued','failed')
  AND json_extract(data,'$.authorized')=1;

CREATE INDEX IF NOT EXISTS oc_api_outbox_lease_due
ON oc_api_outbox(julianday(json_extract(data,'$.leaseUntil')))
WHERE json_extract(data,'$.status')='sending';
