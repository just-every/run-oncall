# Permanent operational audit

Oncall keeps two kinds of history. Incident timelines, copied runbooks, reviewed handoffs and imported records retain their operational content and existing access and custody rules. A separate structured, append-only permanent audit records what operation happened, when, its revision change where applicable and its outcome. Adding this audit does not rewrite held operational history.

## Identity and content

Actor, subject and source labels are permanent random pseudonyms. They are not names, source-key labels or hashes of identities or credentials. Identity associations live separately: erasure deletes those associations and leaves the immutable operation kind, time, outcome and unlinkable labels. A deleted label is never reassigned to a recreated member, source or other subject, and earlier history is never attributed to a new actor.

The permanent audit excludes raw identities, hashes, credential labels, tokens, passwords, telephone destinations, message text, payload content and telemetry secrets. It uses allowlisted operation and outcome labels. Operational history may still contain authored content or imported personal data; deleting an audit association alone does not erase that material. General entity erasure and standby reconciliation remain tracked under OC-040 and OC-028.

## Export

A current active administrator can request `GET /api/audit/export` on the same signed-in installation. Anonymous, revoked and viewer sessions cannot export it. The installation owner acts as administrator until team-scoped authority and export ship under OC-023. The schema-version-1 export contains a `rows` collection with entry ID, kind, feature, pseudonymous actor/subject/source, time, outcome, global before/after revision and workspace/paging/handoff before/after revision snapshots. Committed mutations and decision receipts advance the global revision. Attempts that change no state retain equal before/after revisions. There is no new audit screen or public download link.

The export is the permanent audit, rather than a replacement for the workspace archive or a record of message bodies. Treat it as private operational metadata. Installation transfer includes permanent audit under OC-052's durable-data rules; restored history grants no identity, credential or execution authority. See [Export and restore](data.md).

## Accepted changes and interrupted imports

Current mutations commit their state and permanent audit entry together in the same D1 batch. An audit-write failure rolls back the state change. This applies to workspace and native member/access/password changes; native source, intake and change keys and admission; schedules; paging refusals and historical acknowledgment/cancellation; triage bulk actions; handoffs; routing publication; move-in; import-door apply/resume; and erasure.

Import apply/resume holds a durable lease. An interruption or expired lease leaves a durable failed, interrupted or uncertain outcome instead of a disappearing operation. The retained outcome is evidence of the interruption, not proof that an external recipient accepted anything. Paging remains OFF.

## Capabilities that still need their own proof

Automation (OC-043/053/063), provider attempts and escalation (OC-026/027/064/066), agent grants/actions (OC-045–049), Lamp/Statuspage publication (OC-051), chat (OC-034/067), mobile (OC-029), standby (OC-028) and team-scoped export (OC-023) each inherit atomic audit and durable crash/lease outcomes before shipping. None gains delivery, execution or readiness status from the current audit implementation.

The maintained journey is **OC-041 accepted state and its audit entry commit together, survive subject erasure and export without secrets**, in `tests/runtime.mjs`, `tests/transfer.mjs` and `tests/activation.mjs`, with per-item bulk outcomes in `tests/triage.mjs`. Its current-flow proof covers atomic commit/rollback, append-only storage, permanent labels after identity erasure, secret-free protected export, held-history preservation and import interruption. The exact tested revision and results belong in the build evidence; listing a journey does not establish a live-provider or human-drill result.
