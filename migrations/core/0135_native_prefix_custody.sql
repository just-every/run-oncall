-- Exact native evidence is independent of the authored-workspace profile.
-- An insert-only backfill permits supported portable upgrades from Start/Base.
CREATE TABLE oc_native_prefixes (
 id TEXT PRIMARY KEY,
 bytes INTEGER NOT NULL CHECK(bytes BETWEEN 0 AND 65536),
 request_sha256 TEXT NOT NULL CHECK(length(request_sha256)=64),
 prefix TEXT NOT NULL CHECK(length(prefix)<=87384)
);
INSERT INTO oc_native_prefixes(id,bytes,request_sha256,prefix)
 SELECT id,min(65536,json_extract(data,'$.incomplete.bytes')),
 json_extract(data,'$.incomplete.sha256'),json_extract(data,'$.details.nativePrefix.value')
 FROM oc_intake_receipts WHERE json_extract(data,'$.provider')='native'
 AND json_type(data,'$.details.nativePrefix.value')='text';
-- Held receipts keep encoding, length and request hash; the bytes live only in the table above.
UPDATE oc_intake_receipts SET data=json_set(data,'$.details.nativePrefix',json_object('encoding','base64','bytes',min(65536,json_extract(data,'$.incomplete.bytes')),'sha256',json_extract(data,'$.incomplete.sha256')))
 WHERE json_extract(data,'$.provider')='native' AND json_type(data,'$.details.nativePrefix.value')='text';
-- Removing a receipt removes its exact evidence in the same transaction.
CREATE TRIGGER oc_native_prefix_erasure AFTER DELETE ON oc_intake_receipts
 BEGIN DELETE FROM oc_native_prefixes WHERE id=OLD.id; END;
CREATE INDEX oc_audit_order ON oc_audit(ordinal);
