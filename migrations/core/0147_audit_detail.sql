-- One audit kind per operation; the facts that vary (provider, region, counts) travel in detail.
ALTER TABLE oc_admin_audit ADD COLUMN detail TEXT;
