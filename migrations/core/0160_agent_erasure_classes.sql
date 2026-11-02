-- Older receipts have no witnessed classification. Keep that absence explicit;
-- a completed retry must refuse rather than infer facts from an erased subject.
ALTER TABLE oc_agent_erasure_receipts ADD COLUMN classification TEXT
  CHECK(classification IS NULL OR json_valid(classification));
