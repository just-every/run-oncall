# Calendar schedule semantics

`src/family/response-operations/schedules.ts` is original pure source. The edition supplies authenticated
authoring, persistence and retained membership/configuration snapshots. These
functions read no clock, storage, credential, network or provider. Coverage is
an explanation of configured ownership, never evidence of urgent delivery.

Every schedule has primary and backup rotations, a named IANA timezone,
nonnegative revision, and half-open UTC validity. Authoring starts at revision 0;
the edition assigns the persisted revision. IANA aliases normalize through
`Intl.DateTimeFormat.resolvedOptions().timeZone`. Local anchors use exact
`YYYY-MM-DDTHH:mm` calendar minutes in 2000–2100; periods are integer 1–366 calendar
days. UTC inputs use exact seconds with optional three-digit milliseconds and
`Z`, normalize to milliseconds, and reject invalid or overflowing dates. Limits
are 100 member slots per role and 1000 overrides per schedule. Empty rotations
are intentional coverage gaps.

An anchor defines slot phase, not activation. For integer slot index `n`, local
boundaries are anchor plus `n * periodDays` civil days; the slot identity uses
nonnegative modulo into the original member array, including before the anchor.
Schedule validity determines activation. Daily New York shifts therefore span
23 or 25 elapsed hours across DST; Lord Howe can shift by 30 minutes. Missing,
inactive and viewer members retain their indices and produce warnings and
unavailable coverage. They never cause rotation compaction or reassignment.

Each local boundary explicitly chooses `earlier`, `later` or `reject` for a
repeated wall minute. `resolveLocal` returns integer epoch milliseconds, or
`null` for a nonexistent minute or rejected repetition. It discovers offsets
around the wall minute and round-trips candidate instants through the runtime's
IANA data; it does not assume whole-hour offsets. An interval requires two
resolved consecutive boundaries. If a boundary is missing or rejected, **both
adjacent intervals remain uncovered**, bounded by the previous and next resolved
boundary. The warning records this conservative gap; coverage resumes with its
original calendar slot index. A UTC override can fill only its declared interval.

Overrides are explicit half-open `[start,end)` UTC intervals contained in
schedule validity. Same-role overlaps, duplicate override identities and empty
or reversed intervals are rejected. Adjacency is permitted; primary and backup
may have overlapping override intervals. A null override member explicitly
leaves that interval empty. Overrides take precedence, including over calendar
gaps. Rotation explanations truncate at override edges and validity boundaries.
If both roles resolve to one authorized person, primary remains selected and
backup becomes unavailable with a warning; its explanation truncates at the
primary window edge as well.

`coverage(schedule,members,at)` validates an integer millisecond evaluation clock
in 2000–2100 and returns the clock, canonical zone, schedule identity/revision,
effective roles, warnings and UTC windows. Null starts/ends mean no bounded
resolved boundary in that direction, typically outside schedule validity.
`preview(schedule,members,from,to)` covers a positive half-open interval of at
most 31 elapsed days with the first evaluation and each relevant role-window
boundary. It emits no per-minute samples, excludes `to`, and rejects more
than 200 evaluations. Historical replay uses the exact retained schedule,
membership snapshot and clock, and returns equal results without mutations.
Current dispatch must independently recheck current responder authority.

`validateSchedule(input,known?)` rejects unknown fields and invalid references
when current services/members are supplied. Inactive/viewer members are valid
references and remain coverage gaps. Validation without current references
preserves removed historical identities; archive/reference admission is the
edition's responsibility. Canonical configuration and resolved UTC evidence
must be retained with evaluations. Recalculation depends on the executing
runtime's IANA database: determinism within that database is verified; results
across changed databases are not promised. No imported enterprise schedule
equivalence or production paging reliability is established by these tests.

Focused verification: build the emitted Worker with `rer build`, then run
`node tests/activation.mjs`. This public HTTP journey exercises schedule
persistence, preview, now/next and the authenticated calendar feed. The broader
DST, unavailable-slot and retained-history requirements above remain acceptance
requirements; a test command or successful build alone does not prove them.
`node tests/product-browser.mjs` checks schedule authoring, overrides and
coverage previews through native keyboard controls at 1440.
`node tests/transfer.mjs` keeps the 390-wide managed-owner smoke and the
installation export/restore flow. Its fresh clone uses committed HEAD, so commit
changes before running it.
