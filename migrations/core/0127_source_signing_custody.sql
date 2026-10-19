-- OC-042: native signed-source keys are held only under installation-local AES-GCM custody.
-- SQL cannot reach the installation key, so this step is additive: it keeps each held key where it is and
-- the Worker seals and clears it in one guarded statement on its first API request (src/native-sources.ts).
-- From here on no statement can write a plaintext key.
ALTER TABLE sources ADD COLUMN signing_custody TEXT;
CREATE TRIGGER sources_signing_plaintext_insert BEFORE INSERT ON sources
WHEN NEW.signing_secret IS NOT NULL
BEGIN
 SELECT RAISE(ABORT, 'Signed source keys are held only under installation custody');
END;
CREATE TRIGGER sources_signing_plaintext_update BEFORE UPDATE OF signing_secret ON sources
WHEN NEW.signing_secret IS NOT NULL AND NEW.signing_secret IS NOT OLD.signing_secret
BEGIN
 SELECT RAISE(ABORT, 'Signed source keys are held only under installation custody');
END;
