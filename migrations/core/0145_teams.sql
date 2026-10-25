-- Public team membership and manager authority. Private authoring is refused until all doors enforce its scope.
CREATE TABLE oc_teams(id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
