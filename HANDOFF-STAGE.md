# Local reviewed-handoff slice

Implemented and verified on 2 October 2026: 24/24 emitted Worker/D1 and real CLI groups passed. Scheduling browser acceptance remains separate and subject to
the browser-launch hold.

TARGET.md intends reviewed Lamp handoffs and customer-impact links. Today
`src/family/response-operations/integrations.ts` returns an internal, ephemeral, unreviewed envelope with
`reviewed-handoff-required`, `not-published`, `not-sent` and no provider actions.
Add durable review of explicitly authored copy, initially for a Lamp draft,
through authenticated local API and CLI. Preserve OC-006 and the existing
`GET /api/handoff/:id` envelope byte shape and unreviewed meaning. Existing
chat/pager drafts remain compatible. No sending, Lamp publication, remote fetch,
provider credentials, AI execution or browser work enters this slice.

## Record and review semantics

A prepared record has a stable caller request ID, server revision, source
incident and service IDs, exact source snapshots, authored payload, payload hash and
append-only attributed history. Preparing the same ID with identical canonical
input returns the original record; changed input conflicts. Payload and source
snapshots are immutable. Editing copy or updating its source creates a new
record, optionally naming the prior record as superseded; it never rewrites a
previous review.

The source incident snapshot contains exactly `id`, `revision`, `service`,
`title`, `severity`, `state`, `recovery` and its declaration timeline entry.
The service snapshot contains its complete allowlisted Service fields. Store
both snapshots and SHA-256 of their canonical JSON. Canonicalization sorts object
keys recursively, preserves array order and string bytes, and rejects unknown
fields. The incident revision binds every later incident change; the service
content hash supplies version identity because Service has no revision field.
The server derives snapshots from one current storage snapshot, checking the
client's expected incident revision and service hash before preparation.

The authored payload requires an explicit intended audience (`internal` or
`customer`), title, summary and bounded HTTP(S) evidence/impact links. There is
no audience default and no automatic promotion of event text, an internal
hypothesis or the declaration summary into customer copy. A reviewer sees the
exact copy and its source snapshots. All stored records remain internal to the
authenticated workspace; intended customer audience is not public visibility.
Links grant no access and are never fetched.

Review and withdrawal use a stable action ID, expected record revision and the
exact payload/source hashes. Record actor, action clock, hashes and reason.
Reusing an action ID with changed content conflicts. A review is an explicit
human approval of this copy, not verification that recovery occurred. The author
may also review; record that fact without claiming an independent second review.
Withdrawal requires a reason and is terminal for that record. Repeated exact
actions are idempotent; no history entry is overwritten or removed.

A reviewed record is eligible for reviewed export only while its current
incident revision, incident/service binding and service hash still match, it
has no recovery hold, and it is not withdrawn. Any mismatch makes the approval
stale or unavailable immediately. Preserve the original approval as historical
evidence and return explicit diagnostics; do not refresh hashes or silently
approve newer copy. Source changes require a newly prepared record. A recovery
hold on otherwise matching bytes requires a fresh explicit review.

## Authority, storage and portability

Active viewers read records and inspect/export permitted internal data. Active
responders/admins prepare, review and withdraw; current admins restore archives.
Every request rechecks current server-side authority. Commander attribution is
not an additional permission grant. An approval grants no transport or public
publishing authority. Exports clearly distinguish unreviewed drafts, historical
reviews and currently eligible reviewed copy, and always state **unsent**.

Use additive edition-owned storage and a separate versioned handoff archive.
Keep existing coordination/module archive schemas and commands working.
Software bounds: 64 records, 128 history entries per record, 128 KiB per record
and 1 MiB aggregate compact handoff data. Bound copy/links and transport overhead
before writes; verify actual limits rather than claiming team-scale capacity.
Review/withdraw transactions use current workspace and handoff revisions plus
unique write tokens; concurrent source changes cannot create a valid stale
approval. Record/history changes commit together.

Extend paired checkpoints explicitly to version 2 with the handoff dataset;
continue validating version 1. A version-2 replacement preserves exported
identities/history and places imported active approvals on a recovery hold.
A version-1 or coordination-only restore preserves existing handoff history and
holds its active approvals in the same restore transaction. Historical
unreviewed envelopes never become approved through migration or import. Missing
source references remain inspectable historical evidence and cannot acquire
export eligibility. Preserve migration history, current-password mapping,
credential revocation and winner-session protection. Check all three datasets'
capacity before replacement; invalid input or storage failure changes none.

## Independent implementation contracts

1. **Headless core:** strict prepare/action/archive schemas; canonical source and
   payload hashing; immutable record/history transitions; effective eligibility
   and diagnostics. Pure tests cover changed IDs, source/service drift,
   withdrawal, recovery holds and retained orphan identities. No storage or I/O.
2. **Edition persistence/API:** additive migration and operating description;
   authenticated record/read/action/export endpoints; one-snapshot source
   extraction and dual-revision CAS; transactional archive/recovery integration.
   Keep legacy handoff output unchanged. No private Start transport or send route.
3. **Private local CLI:** prepare/review/withdraw/inspect and explicit portable
   export/restore commands with expected revisions/hashes, stable request IDs,
   new mode-0600 files and private session handling. Explain stale, held and
   withdrawn records without printing credentials.
4. **Independent emitted proof:** actual Worker/D1 and CLI journeys for roles,
   CSRF, revocation, stale/concurrent review, immutable retries, rollback injected
   at history/module/credential/session writes, fresh-target mapping, paired
   version-1/version-2 transitions, orphan retention, restart and repeat migration.
   A local fixture validates reviewed Lamp draft mapping and unchanged legacy
   envelopes; it records no external acceptance, delivery or publication.

OC-017 records this contract target. Passing this local slice does not accept
an external adapter, production paging,
customer communication delivery or customer adoption.
