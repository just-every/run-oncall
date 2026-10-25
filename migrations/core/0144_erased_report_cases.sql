-- Anonymous declaration cohort cases preserve denominators after explicit incident erasure.
CREATE TABLE oc_erased_report_cases(id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
