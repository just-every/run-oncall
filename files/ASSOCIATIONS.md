# Clause association correction

Both autonomous and held policy receipts agree.

| Tool | Before | After, equal to current Contract row |
| --- | --- | --- |
| `oncall.automation.replay` | OC-006, OC-053 | OC-053 |
| `oncall.clients.update` | OC-041, OC-053 | OC-053 |
| `oncall.endpoints.update` | OC-041, OC-053 | OC-053 |
| `oncall.incidents.declare` | OC-004, OC-005 | OC-004, OC-050, OC-056 |
| `oncall.incidents.resolve` | OC-004 | OC-004, OC-056 |
| `oncall.incidents.update` | OC-004, OC-053 | OC-004, OC-027, OC-050, OC-058 |
| `oncall.privacy.erase` | OC-040, OC-041, OC-052, SURFACE-004 | OC-040 |
| `oncall.schedules.coverage` | OC-003, OC-011, OC-012, OC-014, OC-024 | OC-014, OC-020, OC-076 |
| `oncall.schedules.update` | OC-003, OC-011, OC-012, OC-024, OC-053 | OC-011, OC-024, OC-077 |
| `oncall.services.update` | OC-003, OC-005, OC-053 | OC-023, OC-061 |

The complete emitted descriptors are in before.json and after.json. The probe compares every non-clause descriptor field and the full descriptors of five guard tools.
