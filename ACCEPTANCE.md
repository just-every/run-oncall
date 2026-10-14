# Activation acceptance

The flows below are acceptance requirements and verification entrypoints. Passing evidence must name the exact commit and actual command result; this document alone records no new passing run. `rer verify` invokes the maintained local journeys. No paging/provider/standby claim is made.

1. OC-001–010: emitted HTTP coordination journey preserves event identity/generation, routing replay, roles/revocation, incident transitions, copied runbooks/follow-ups, strict atomic archive restore and visible failures. Existing held flow is retained in tests/runtime.mjs.
2. OC-011,014,020: tests/activation.mjs exercises named-zone DST turns, exact hand-off and override endpoints, overlap refusal, unavailable member gaps, now/next, authenticated ICS and escalation configuration through HTTP.
3. OC-012–015: delivery/timer/resume/callback paths refuse; intake records an event with no receipt/send; held module archives remain historical and restore pending timers paused.
4. OC-016–017: tests/activation.mjs exercises the recovery checkpoint and reviewed-handoff requirements through the emitted Worker, D1 and the private handoff CLI. The test file names each OC-016/OC-017 requirement it proves.
5. OC-018: command check/describe, install/setup/build/preview/reset/export/import/deploy dry-run, owner sign-in, dev identity and theme; tests/email-link.mjs keeps one ordinary email-link journey.
6. OC-019: tests/runtime.mjs seeds the actual held one-row SQL fixture before migrations, upgrades, signs in using its held password and compares the full state over HTTP; repeated migration is idempotent.
7. OC-021–022: tests/activation.mjs tests both documented-shape fixtures, zero-write preview, rejected-rule accounting, paused apply, authorization, review mismatch, malformed/credential input, atomic rollback, restart/resume, idempotence and undo preserving native edits.
8. tests/activation-browser.mjs runs setup/dev identity and real keyboard-only incident declaration, notes, acknowledgement, schedule/override/preview at 1440 and 390 from committed HEAD in a fresh clone. It captures visible focus, checks literal hostile HTML, and causes a real HTTP stale-revision rejection from a second session: the alert announces failure, no saved claim appears, and server state is unchanged. Existing pointer move-in/replay and overflow checks remain. Screenshot output is copied outside the checkout to `../evidence/browser` (or `ONCALL_BROWSER_EVIDENCE`). Acceptance requires the passing run and inspection of its screenshots.

Public landing requires Base's publication scan on the exact tree before each push with zero findings, and the public repository's **Oncall verification** CI green on the exact merged head. Fetch and merge immediately before a fast-forward-only push. These publication and CI requirements are independent of local journeys; they do not establish hosted readiness.

OC-018 uses published `rer` 0.2.2 and the effects declared in `OPERATIONS.json`: local servers bind loopback and actual Oncall deployment is held before provider requests. A successful local dry-run does not establish hosted readiness.

Obsolete synthetic-dispatch tests and the drill UI are removed because sending is no longer an accepted flow. Pure domain pin/structure tests are replaced by emitted public-flow proof; removal does not relax the preserved incident, archive or import guarantees.
