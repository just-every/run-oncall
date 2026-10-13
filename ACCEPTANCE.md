# Activation acceptance

All proof is local: the commands below run through the repository's own `rer verify`. No paging/provider/standby claim is made.

1. OC-001–010: emitted HTTP coordination journey preserves event identity/generation, routing replay, roles/revocation, incident transitions, copied runbooks/follow-ups, strict atomic archive restore and visible failures. Existing held flow is retained in tests/runtime.mjs.
2. OC-011,014,020: tests/activation.mjs exercises named-zone DST turns, exact hand-off and override endpoints, overlap refusal, unavailable member gaps, now/next, authenticated ICS and escalation configuration through HTTP.
3. OC-012–015: delivery/timer/resume/callback paths refuse; intake records an event with no receipt/send; held module archives remain historical and restore pending timers paused.
4. OC-016–017: tests/activation.mjs proves the recovery checkpoint and reviewed-handoff requirements through the emitted Worker, D1 and the private handoff CLI. The test file names each OC-016/OC-017 requirement it proves.
5. OC-018: command check/describe, install/setup/build/preview/reset/export/import/deploy dry-run, owner sign-in, dev identity and theme; tests/email-link.mjs keeps one ordinary email-link journey.
6. OC-019: tests/runtime.mjs seeds the actual held one-row SQL fixture before migrations, upgrades, signs in using its held password and compares the full state over HTTP; repeated migration is idempotent.
7. OC-021–022: tests/activation.mjs tests both documented-shape fixtures, zero-write preview, rejected-rule accounting, paused apply, authorization, review mismatch, malformed/credential input, atomic rollback, restart/resume, idempotence and undo preserving native edits.
8. tests/activation-browser.mjs runs real setup/sign-in/schedule/override/move-in journeys at 1440 and 390 from a fresh clone; the layout is inspected for overflow, failures and unusable controls. History scan must report zero findings. Private exact-head CI must be green. Root registry change must be confined to Oncall's entry and pushed fast-forward.

Obsolete synthetic-dispatch tests and the drill UI are removed because sending is no longer an accepted flow. Pure domain pin/structure tests are replaced by emitted public-flow proof; removal does not relax the preserved incident, archive or import guarantees.
