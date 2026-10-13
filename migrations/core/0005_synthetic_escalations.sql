-- Additive critical scheduling state. No provider credentials or chat/AI dependencies.
CREATE TABLE paging_control (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, write_token TEXT NOT NULL);
INSERT INTO paging_control VALUES(1,0,'initial');
CREATE TABLE paging_schedules (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, data TEXT NOT NULL);
CREATE TABLE paging_policies (service TEXT PRIMARY KEY, revision INTEGER NOT NULL, data TEXT NOT NULL);
CREATE TABLE paging_jobs (id TEXT PRIMARY KEY, incident TEXT NOT NULL, service TEXT NOT NULL, revision INTEGER NOT NULL, status TEXT NOT NULL, next_due INTEGER, write_token TEXT NOT NULL, data TEXT NOT NULL);
CREATE INDEX paging_due ON paging_jobs(status,next_due);
CREATE TABLE paging_receipts (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, data TEXT NOT NULL);
CREATE TABLE paging_callbacks (id TEXT PRIMARY KEY, key TEXT NOT NULL, data TEXT NOT NULL);
