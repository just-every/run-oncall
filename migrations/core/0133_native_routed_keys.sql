-- Native routed signing keys use the same installation-local encrypted custody as native service keys.
-- Portable/checkpoint restore deletes all receiving credentials; definitions and receipts remain inactive.
ALTER TABLE oc_intake_credentials ADD COLUMN signing_custody TEXT;
