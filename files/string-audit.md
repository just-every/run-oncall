# Customer-facing string audit

Searched app TypeScript/TSX and public assets for clause-code patterns. Changes:

| Surface | Before | After |
| --- | --- | --- |
| Incident source recovery / reminder | Reminder recorded; no timer until OC-027. | Reminder recorded for the incident lead; automatic reminders and recovery notices are not available yet. Display projection; retained history and archive validation unchanged. |
| Automatic declaration timeline | Response policy version; rule internal ID. | The service response policy was applied; no human acknowledgment recorded. Internal rule identity no longer displayed. |
| Email integration import refusal | email modes and rules need OC-070 and the inherited OC-038 import | email receiving modes and rules are not imported; recreate and review the email receiving mode |
| Imported PagerDuty contacts | until OC-026/OC-066 verification | until number verification and a maintained country list establish coverage |
| Imported active incidents | original retained for resolution under OC-038 | original retained for review during import |
| Unsupported team import | under OC-023 | Team membership settings are not imported; original retained for review |
| Unsupported business service import | under OC-061 | Business service settings are not imported; original retained for review |
| Unsupported maintenance window import | under OC-043 | Maintenance window settings are not imported; original retained for review |
| Unsupported event orchestration import, rule and catch-all | under OC-072 routed keys | Routed integration settings are not imported; original retained for review |
| Readiness drill limitation | No dated human-confirmed drill evidence (OC-047). | No dated human-confirmed drill evidence. |
| Readiness load label | OC-064 reference load | Reference load |

Source attribution now looks up routed native/compatible intake sources and email addresses by identity, and uses the existing native source name decoder for names carrying generated suffixes. Unknown named integrations display “Unavailable source”. No identity-only control was added.

Remaining literal clause codes under product source are archive schema/provenance constants in response-policy/model.ts, archive.ts and types.ts; code comments; and native MCP conformance metadata. They are not rendered by the changed customer displays. CONTRACT.md, generated acceptance documents and on-site contract documentation intentionally retain their clause references. Authored notes/reasons remain literal, including any text a user chooses to type.

Scope counts: 10 customer-facing clause-code message categories translated (including four unsupported-import categories), plus one automatic-declaration rule-ID display. Timeline visible internal clause-code occurrences in the reproduced recovery: 1 → 0. Source identifier used as a timeline name: 1 → 0. Phone timestamps outside the card in baseline: 2/2; candidate checks 3/3 inside.
