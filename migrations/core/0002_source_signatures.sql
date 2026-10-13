ALTER TABLE sources ADD COLUMN signing_secret TEXT;
CREATE TABLE login_attempts (name TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset INTEGER NOT NULL);
