-- Random audit labels preserve the named responder independently of actor and incident.
ALTER TABLE oc_audit_clock ADD COLUMN named_member_label TEXT;
ALTER TABLE oc_admin_audit ADD COLUMN named_member TEXT;
