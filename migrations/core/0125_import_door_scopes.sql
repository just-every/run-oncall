-- import-kit importDoorScopesMigration (rer 0.2.61): one door namespace belongs to one destination.
CREATE TABLE IF NOT EXISTS ik_door_scopes (
    installation_id TEXT NOT NULL, namespace TEXT NOT NULL, destination TEXT NOT NULL,
    PRIMARY KEY(installation_id,namespace));
