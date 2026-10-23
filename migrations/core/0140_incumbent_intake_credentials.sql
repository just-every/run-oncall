-- Installation-local verification material: never exported or restored as authority.
CREATE TABLE oc_incumbent_credentials (
 source TEXT PRIMARY KEY REFERENCES oc_intake_sources(id) ON DELETE CASCADE,
 key_digest TEXT NOT NULL UNIQUE CHECK(length(key_digest)=64 AND key_digest NOT GLOB '*[^0-9a-f]*'),
 imported_digest TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL
);

-- Preserve unambiguous credential lookup even through other native key managers.
CREATE TRIGGER incumbent_key_distinct_insert BEFORE INSERT ON oc_incumbent_credentials
WHEN EXISTS(SELECT 1 FROM oc_intake_credentials WHERE key_digest=NEW.key_digest AND source<>NEW.source)
BEGIN SELECT RAISE(ABORT,'Integration key must be distinct'); END;
CREATE TRIGGER incumbent_key_distinct_update BEFORE UPDATE OF key_digest ON oc_incumbent_credentials
WHEN EXISTS(SELECT 1 FROM oc_intake_credentials WHERE key_digest=NEW.key_digest AND source<>NEW.source)
BEGIN SELECT RAISE(ABORT,'Integration key must be distinct'); END;
CREATE TRIGGER native_key_distinct_insert BEFORE INSERT ON oc_intake_credentials
WHEN EXISTS(SELECT 1 FROM oc_incumbent_credentials WHERE key_digest=NEW.key_digest AND source<>NEW.source)
BEGIN SELECT RAISE(ABORT,'Integration key must be distinct'); END;
CREATE TRIGGER native_key_distinct_update BEFORE UPDATE OF key_digest ON oc_intake_credentials
WHEN EXISTS(SELECT 1 FROM oc_incumbent_credentials WHERE key_digest=NEW.key_digest AND source<>NEW.source)
BEGIN SELECT RAISE(ABORT,'Integration key must be distinct'); END;
