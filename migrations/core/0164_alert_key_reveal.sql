-- Retain existing credential digests and signed custody unchanged. Held digest-only keys
-- cannot be reconstructed: their next explicit rotation supplies encrypted reveal custody.
ALTER TABLE sources ADD COLUMN key_custody TEXT;
ALTER TABLE oc_intake_credentials ADD COLUMN key_custody TEXT;
