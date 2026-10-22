-- Retain the portability journal's identity-free digest/epoch fences in every
-- native archive and checkpoint as well as whole-installation transfers.
CREATE TABLE oc_erasure_fences (
 id TEXT PRIMARY KEY CHECK(length(id)=64),
 epoch INTEGER NOT NULL CHECK(epoch>=0)
);
INSERT INTO oc_erasure_fences(id,epoch)
 SELECT j.tombstone,MAX(e.epoch) FROM rer_portability_journal j
 JOIN rer_portability_epochs e ON e.source=j.source GROUP BY j.tombstone;
