Old reference: `e50fb1aff97e7af09af4333b614bb70d0a780bc6` (main, 28 October 2026). Clauses done there: OC-001, OC-002, OC-003, OC-004, OC-005, OC-006, OC-007, OC-008, OC-010, OC-011, OC-012, OC-013, OC-014, OC-015, OC-016, OC-017, OC-018, OC-019, OC-020, OC-021, OC-022, OC-033, OC-037, OC-041, OC-042, OC-052, OC-053, OC-056, OC-057, OC-059 and OC-070.

# Carried-done audit

One row per named outcome of every acceptance point of every clause that was done at the old reference. **Point** is the point number in CONTRACT.md (`old n` for a point that left the clause). **Asserting test** is the line of the assertion, or of the call whose expected status a test helper asserts, in a file the clause's Evidence cell lists. **Result** is `asserted`, `none` or `moved`. A `none` row demotes its clause to partial, and that clause's Gap names the outcome. A `moved` row is a pointer, a proof boundary or a restated Base duty that left the point, with its destination.

Still done: OC-001, OC-007, OC-008, OC-013, OC-016, OC-019, OC-021, OC-053, OC-056, OC-059. Demoted to partial: OC-002, OC-003, OC-004, OC-005, OC-006, OC-010, OC-011, OC-012, OC-014, OC-015, OC-017, OC-018, OC-020, OC-022, OC-033, OC-037, OC-041, OC-042, OC-052, OC-057, OC-070.

| Clause | Point | Outcome | Asserting test | Result |
| --- | --- | --- | --- | --- |
| OC-001 | 1 | A bearer event is accepted with its receipt | `tests/runtime.mjs:519` | asserted |
| OC-001 | 1 | A signed event is accepted with its receipt | `tests/runtime.mjs:583` | asserted |
| OC-001 | 1 | A repeated normalized bearer identity returns the original receipt | `tests/runtime.mjs:547` | asserted |
| OC-001 | 1 | A repeated signed identity returns the original receipt | `tests/runtime.mjs:596` | asserted |
| OC-001 | 1 | Changed content under the same identity conflicts | `tests/runtime.mjs:552` | asserted |
| OC-001 | 1 | A recovery sent before its trigger stays recovered, and the later trigger joins it | `tests/runtime.mjs:635` | asserted |
| OC-001 | 1 | A delayed recovery of the older generation leaves the newer alert unchanged | `tests/runtime.mjs:730` | asserted |
| OC-001 | 1 | Protected state shows each stored event and receipt | `tests/runtime.mjs:535` | asserted |
| OC-001 | 2 | The same event ID, key and generation from another origin never merge | `tests/runtime.mjs:591` | asserted |
| OC-001 | 2 | Service, environment and generation boundaries keep separate alerts | `tests/runtime.mjs:624` | asserted |
| OC-001 | 2 | Observations of one tuple join one alert, in order, with no cross-tuple link | `tests/runtime.mjs:632` | asserted |
| OC-002 | 1 | A severity-routed event is admitted | none in a cited file: the runtime policies route severity `*` | none |
| OC-002 | 1 | After a policy change, the admission explanation is compared with the proposed decision | none in a cited file: `tests/routing.mjs:105` holds it | none |
| OC-002 | 1 | Decisions come back in submitted order | `tests/runtime.mjs:1098` | asserted |
| OC-002 | 1 | Replay makes zero writes | `tests/runtime.mjs:762` | asserted |
| OC-003 | 1 | An anonymous read is refused | `tests/runtime.mjs:304` | asserted |
| OC-003 | 1 | An anonymous request to the sources door is refused | `tests/runtime.mjs:215` | asserted |
| OC-003 | 1 | An anonymous command is refused | `tests/runtime.mjs:1061` | asserted |
| OC-003 | 1 | An archive read with only an ingest key is refused | `tests/runtime.mjs:548` | asserted |
| OC-003 | 1 | An expired session is refused | `tests/runtime.mjs:359` | asserted |
| OC-003 | 1 | A revoked session is refused for reads and audit export | `tests/runtime.mjs:965` | asserted |
| OC-003 | 1 | A viewer reads the workspace | `tests/runtime.mjs:366` | asserted |
| OC-003 | 1 | A viewer command is refused | `tests/runtime.mjs:367` | asserted |
| OC-003 | 1 | A viewer archive and audit export are refused | `tests/runtime.mjs:371` | asserted |
| OC-003 | 1 | A responder coordinates | none in a cited file: `tests/member-coordination-browser.mjs:178` shows it | none |
| OC-003 | 1 | A responder is refused administrator actions | none in a cited file | none |
| OC-003 | 1 | An admin manages member roles | `tests/runtime.mjs:386` | asserted |
| OC-003 | 1 | A held mutation whose author is downgraded publishes nothing | `tests/runtime-authority.mjs:59` | asserted |
| OC-003 | 1 | A held mutation whose author signs out publishes nothing | `tests/runtime-authority.mjs:59` | asserted |
| OC-003 | 2 | Intake receipts carry only the minimal fields | `tests/runtime.mjs:527` | asserted |
| OC-004 | 1 | The incident is declared from the admitted alerts | none in a cited file: the declaration is checked by status only | none |
| OC-004 | 1 | Acknowledgment sets the acknowledged state | `tests/runtime.mjs:667` | asserted |
| OC-004 | 1 | A stale change is rejected | `tests/runtime.mjs:668` | asserted |
| OC-004 | 1 | One of two concurrent changes is rejected | `tests/runtime.mjs:698` | asserted |
| OC-004 | 1 | The source alert clears while the incident stays open | `tests/runtime.mjs:729` | asserted |
| OC-004 | 1 | Resolution without evidence and a summary is refused | none in a cited file | none |
| OC-004 | 1 | The incident resolves | none in a cited file: the resolve is checked by status only | none |
| OC-004 | 1 | The timeline reads back with its attribution | none in a cited file | none |
| OC-005 | 1 | Copied incident steps stay unchanged after the service runbook is edited | none in a cited file | none |
| OC-005 | 1 | An owned, due-dated action is created | none in a cited file: the action is checked by status only | none |
| OC-005 | 1 | Completing an action without evidence is refused | none in a cited file | none |
| OC-005 | 1 | Unfinished work is retained after resolution | none in a cited file | none |
| OC-005 | 1 | The review is retained after resolution | `tests/runtime.mjs:884` | asserted |
| OC-006 | 1 | No paging receipt is created | `tests/activation.mjs:116` | asserted |
| OC-006 | 1 | No production action is created | `tests/runtime.mjs:870` | asserted |
| OC-006 | 1 | No AI call is made | none in a cited file | none |
| OC-006 | 1 | No external publication is made | `tests/runtime.mjs:869` | asserted |
| OC-006 | 2 | A draft export stays marked unreviewed | none in a cited file | none |
| OC-006 | 2 | A source link confers no access | none in a cited file | none |
| OC-006 | old 3 | Approved OC-053 events are proved under OC-053 | moved to the Requirement (pointer to OC-053) | moved |
| OC-007 | 1 | The archive exports and restores to equal content | `tests/runtime.mjs:826` | asserted |
| OC-007 | 1 | Malformed references are rejected without losing prior data | `tests/runtime.mjs:791` | asserted |
| OC-007 | 1 | A storage failure is rejected without losing prior data | `tests/runtime.mjs:808` | asserted |
| OC-007 | 2 | Event identity survives the round trip | `tests/runtime.mjs:826` | asserted |
| OC-007 | 2 | Incident identity survives the round trip | `tests/runtime.mjs:828` | asserted |
| OC-007 | 2 | Runbook identity survives the round trip | `tests/runtime.mjs:828` | asserted |
| OC-007 | 2 | Action identity survives the round trip | `tests/runtime.mjs:828` | asserted |
| OC-007 | 2 | Timeline identity survives the round trip | `tests/runtime.mjs:828` | asserted |
| OC-007 | 2 | Attribution identity survives the round trip | `tests/runtime.mjs:828` | asserted |
| OC-007 | 2 | Authentication material is absent from the archive | `tests/runtime.mjs:228` | asserted |
| OC-008 | 1 | Over-limit native intake keeps only its first 64 KiB, unparsed | `tests/runtime.mjs:479` | asserted |
| OC-008 | 1 | Over-limit intake is retained no further than its bound | `tests/runtime.mjs:478` | asserted |
| OC-008 | 1 | Malformed intake is kept as an unparsed prefix with no event identity | `tests/runtime.mjs:491` | asserted |
| OC-008 | 1 | Unauthenticated input is refused | moved to Base BASE-ACCESS-002 | moved |
| OC-008 | 1 | Over-limit command input is refused with no state change | `tests/runtime.mjs:511` | asserted |
| OC-008 | 2 | Hostile structured text creates no HTML element | `tests/keyboard-coordination.mjs:56` | asserted |
| OC-008 | 2 | Runbook links stay literal text | `tests/keyboard-coordination.mjs:51` | asserted |
| OC-008 | 2 | No hostile script or handler runs | `tests/keyboard-coordination.mjs:57` | asserted |
| OC-008 | 2 | Hostile text triggers no external fetch | `tests/keyboard-coordination.mjs:58` | asserted |
| OC-008 | 3 | Authored history survives a restart | `tests/runtime.mjs:888` | asserted |
| OC-008 | 3 | Authored history survives export and restore | `tests/runtime.mjs:828` | asserted |
| OC-008 | 1 | Native incomplete custody is verified under OC-059 | moved to the Requirement (pointer to OC-059) | moved |
| OC-010 | 1 | check runs and leaves records unchanged | `tests/coordination-health.mjs:16` | asserted |
| OC-010 | 1 | describe names the executable that answered | `tests/coordination-health.mjs:13` | asserted |
| OC-010 | 1 | Health reports storage available | `tests/coordination-health.mjs:21` | asserted |
| OC-010 | 1 | Health reports storage unavailable with a 503 | `tests/coordination-health.mjs:45` | asserted |
| OC-010 | 1 | check and describe still answer during the storage failure | `tests/coordination-health.mjs:50` | asserted |
| OC-010 | 1 | The deployed identity matches the actual local build | `tests/coordination-health.mjs:20` | asserted |
| OC-010 | 1 | The hosted build reports its supplied identity | `tests/hosted.mjs:17` | asserted |
| OC-010 | 2 | Local outcomes are recorded as local | `tests/coordination-health.mjs:21` | asserted |
| OC-010 | 2 | Hosted-mode outcomes are recorded apart from local ones | `tests/hosted.mjs:17` | asserted |
| OC-010 | 2 | Provider outcomes are recorded separately | none in a cited file | none |
| OC-010 | 2 | Human-drill outcomes are recorded separately | none in a cited file | none |
| OC-010 | 2 | Durable failure diagnostics for each new execution class | moved to door rule D-1 and the Requirement | moved |
| OC-011 | 1 | Primary and backup schedules save and resolve | `tests/activation.mjs:33` | asserted |
| OC-011 | 1 | A spring-forward hand-off keeps the wall minute | `tests/activation.mjs:34` | asserted |
| OC-011 | 1 | A fall-back hand-off keeps the wall minute | none in a cited file | none |
| OC-011 | 1 | An ambiguous minute takes its earlier, later or reject choice | none in a cited file | none |
| OC-011 | 1 | A nonexistent minute leaves a visible gap | none in a cited file | none |
| OC-011 | 1 | An override includes its start | `tests/activation.mjs:38` | asserted |
| OC-011 | 1 | An override excludes its end | `tests/activation.mjs:39` | asserted |
| OC-011 | 1 | An overlapping override is refused | `tests/activation.mjs:40` | asserted |
| OC-011 | 1 | An inactive member keeps a gap | `tests/activation.mjs:44` | asserted |
| OC-011 | 1 | A viewer slot is kept as a gap | none in a cited file | none |
| OC-011 | 1 | A missing member slot is kept as a gap | none in a cited file | none |
| OC-011 | 1 | A duplicate primary and backup responder is detected | none in a cited file | none |
| OC-012 | 1 | Each delivery, job, tick, callback and resume door refuses | `tests/activation.mjs:110` | asserted |
| OC-012 | 1 | The refusal gives the paging-OFF explanation | none in a cited file: the refusal body is not read | none |
| OC-012 | 1 | No receipt is created | `tests/activation.mjs:116` | asserted |
| OC-012 | 2 | A demo simulation is labelled as a simulation | none in a cited file: `tests/demo.mjs` reads the demo sends as sent | none |
| OC-012 | old 3 | Native cutover needs OC-026 to OC-029 and OC-038 acceptance | moved to the Requirement (pointer) | moved |
| OC-013 | 1 | Held receipts and callbacks are retained after restore | `tests/paging-history.mjs:34` | asserted |
| OC-013 | 1 | Restored pending work is paused | `tests/paging-history.mjs:23` | asserted |
| OC-013 | 1 | A historical acknowledgment keeps its attribution | `tests/paging-history.mjs:29` | asserted |
| OC-013 | 1 | An explicit cancellation keeps its attribution | `tests/paging-history.mjs:29` | asserted |
| OC-013 | 1 | Resuming restored work is refused | `tests/activation.mjs:418` | asserted |
| OC-013 | 1 | Incident recovery stays unchanged | `tests/paging-history.mjs:32` | asserted |
| OC-014 | 1 | Reading now/next leaves durable state unchanged | none in a cited file | none |
| OC-014 | 1 | A schedule preview leaves durable state unchanged | none in a cited file | none |
| OC-014 | 1 | A routing preview leaves durable state unchanged | none in a cited file | none |
| OC-014 | 1 | Receipt counts are unchanged after the previews | none in a cited file | none |
| OC-014 | 1 | No timer is created by a preview | none in a cited file | none |
| OC-014 | 1 | No provider action is created by a preview | none in a cited file | none |
| OC-014 | 1 | Historical synthetic data stays labelled | none in a cited file | none |
| OC-015 | 1 | The strict module archive round-trips | `tests/paging-history.mjs:34` | asserted |
| OC-015 | 1 | The module archive door refuses an unauthenticated or non-admin caller | none in a cited file | none |
| OC-015 | 1 | Unknown fields are rejected atomically | `tests/paging-history.mjs:43` | asserted |
| OC-015 | 1 | Broken references are rejected atomically | `tests/paging-history.mjs:43` | asserted |
| OC-015 | 1 | An injected SQL failure rolls back the replacement | `tests/paging-history.mjs:46` | asserted |
| OC-015 | 1 | Callbacks are retained | `tests/paging-history.mjs:34` | asserted |
| OC-015 | 1 | Pending historical jobs pause | `tests/paging-history.mjs:23` | asserted |
| OC-016 | 1 | The checkpoint door captures both revisions in one snapshot | `tests/activation.mjs:386` | asserted |
| OC-016 | 1 | Restore through the checkpoint door replaces both datasets | `tests/activation.mjs:349` | asserted |
| OC-016 | 1 | The private CLI captures the checkpoint | `tests/checkpoint-cli.mjs:16` | asserted |
| OC-016 | 1 | The private CLI restores the checkpoint | `tests/checkpoint-cli.mjs:128` | asserted |
| OC-016 | 2 | Malformed input preserves the complete state | `tests/activation.mjs:394` | asserted |
| OC-016 | 2 | A capacity failure preserves the complete state | `tests/activation.mjs:397` | asserted |
| OC-016 | 2 | A storage failure preserves the complete state | `tests/activation.mjs:402` | asserted |
| OC-016 | 2 | Of competing restores exactly one wins, and the loser changes nothing | `tests/activation.mjs:406` | asserted |
| OC-016 | 2 | Identity mapping is explicit and the current password signs in as the mapped admin | `tests/activation.mjs:453` | asserted |
| OC-016 | 2 | Orphan history is kept as evidence | `tests/activation.mjs:417` | asserted |
| OC-016 | 2 | Orphan history never grants dispatch | `tests/activation.mjs:418` | asserted |
| OC-016 | 2 | Earlier sessions are revoked | `tests/activation.mjs:409` | asserted |
| OC-016 | 2 | The winning restore keeps its new session | `tests/activation.mjs:408` | asserted |
| OC-017 | 1 | Handoff copy is prepared | `tests/activation.mjs:368` | asserted |
| OC-017 | 1 | Handoff copy is reviewed | `tests/activation.mjs:376` | asserted |
| OC-017 | 1 | A viewer inspects the internal record | `tests/activation.mjs:370` | asserted |
| OC-017 | 1 | The export carries the exact reviewed copy | none in a cited file: `tests/checkpoint-cli.mjs:99` holds it | none |
| OC-017 | 1 | A viewer cannot prepare, review or withdraw | `tests/activation.mjs:372` | asserted |
| OC-017 | 1 | Source drift makes the review ineligible | `tests/activation.mjs:379` | asserted |
| OC-017 | 1 | Withdrawal is terminal | `tests/activation.mjs:381` | asserted |
| OC-017 | 1 | Version 1 restore is supported | `tests/activation.mjs:421` | asserted |
| OC-017 | 1 | Version 2 restore retains historical identities | `tests/activation.mjs:413` | asserted |
| OC-017 | 1 | Racing restores publish once | `tests/activation.mjs:406` | asserted |
| OC-017 | 2 | A recovery hold makes the review ineligible | `tests/activation.mjs:412` | asserted |
| OC-017 | 2 | Preparation and review identities conflict on changed content | `tests/activation.mjs:369` | asserted |
| OC-017 | 2 | Withdrawal appends to attributed history | `tests/activation.mjs:382` | asserted |
| OC-017 | 2 | The 64-record bound refuses and keeps the archive | `tests/activation.mjs:425` | asserted |
| OC-017 | 2 | The 128-entry history bound refuses and keeps the archive | `tests/activation.mjs:429` | asserted |
| OC-017 | 2 | The 128 KiB record bound refuses first | `tests/activation.mjs:432` | asserted |
| OC-017 | 2 | The 1 MiB aggregate bound refuses and keeps the state | `tests/activation.mjs:438` | asserted |
| OC-017 | 2 | The export is unsent with no provider action | `tests/activation.mjs:377` | asserted |
| OC-018 | 1 | setup runs | `tests/activation-browser.mjs:23` | asserted |
| OC-018 | 1 | dev runs and emits the owner-open link | `tests/activation-browser.mjs:28` | asserted |
| OC-018 | 1 | build runs | none in a cited file | none |
| OC-018 | 1 | preview runs with dev identity absent | `tests/activation-browser.mjs:45` | asserted |
| OC-018 | 1 | reset runs | `tests/activation-browser.mjs:46` | asserted |
| OC-018 | 1 | The archive exports through rer export | `tests/transfer.mjs:224` | asserted |
| OC-018 | 1 | The archive imports through rer import | `tests/transfer.mjs:241` | asserted |
| OC-018 | 1 | The deploy dry run runs | none in a cited file | none |
| OC-018 | 1 | Owner entry opens the workspace | `tests/activation-browser.mjs:35` | asserted |
| OC-018 | 1 | An admin-created member signs in by password | `tests/member-coordination-browser.mjs:165` | asserted |
| OC-018 | old 2 | Hosted deploy, setup retirement, real emailed link, member reload and removal readback | moved to the register (R-1) | moved |
| OC-019 | 1 | The held one-row data migrates with every held row unchanged | `tests/runtime.mjs:264` | asserted |
| OC-019 | 1 | The held password signs in | `tests/runtime.mjs:273` | asserted |
| OC-019 | 1 | Every entity, nested history and original ordering compares equal | `tests/runtime.mjs:274` | asserted |
| OC-019 | 1 | A repeated migration and restart change nothing | `tests/runtime.mjs:281` | asserted |
| OC-019 | 1 | Nothing is silently reassigned to Base identity | `tests/runtime.mjs:281` | asserted |
| OC-020 | 1 | Now/next names the current and next responder | `tests/activation.mjs:33` | asserted |
| OC-020 | 1 | The authenticated ICS feed downloads | `tests/activation.mjs:41` | asserted |
| OC-020 | 1 | The default window is seven days | none in a cited file | none |
| OC-020 | 1 | An explicit window is honoured | `tests/activation.mjs:41` | asserted |
| OC-020 | 1 | An explicit window over 31 days is refused | none in a cited file | none |
| OC-020 | 1 | Primary UTC boundaries are correct | `tests/activation.mjs:41` | asserted |
| OC-020 | 1 | Backup is exported separately | none in a cited file | none |
| OC-020 | 1 | Overrides move the feed boundaries | `tests/activation.mjs:41` | asserted |
| OC-020 | 1 | Gaps appear in the feed | none in a cited file | none |
| OC-020 | 1 | Unauthenticated access is denied | `tests/activation.mjs:42` | asserted |
| OC-020 | 1 | Admission starts no paging | none in a cited file | none |
| OC-021 | 1 | The provider export instructions give a runnable command | `tests/provider-export-browser.mjs:30` | asserted |
| OC-021 | 1 | The exporter output is accepted by the importer | `tests/provider-export-browser.mjs:66` | asserted |
| OC-021 | 1 | Saved Opsgenie bundles preview with zero writes | `tests/activation.mjs:177` | asserted |
| OC-021 | 1 | Saved PagerDuty list and detail bundles preview with zero writes | `tests/activation.mjs:177` | asserted |
| OC-021 | 1 | Rejected rules are named | `tests/activation.mjs:176` | asserted |
| OC-021 | 1 | Unmapped rules are named | `tests/activation.mjs:204` | asserted |
| OC-021 | 1 | A changed fingerprint is refused | `tests/activation.mjs:181` | asserted |
| OC-021 | 1 | The apply stays paused with no paging or login | `tests/activation.mjs:187` | asserted |
| OC-021 | 1 | Unmapped people and services publish no coverage | `tests/move-in-adoption.mjs:43` | asserted |
| OC-021 | 1 | Explicitly mapped coverage is adopted | `tests/move-in-adoption.mjs:63` | asserted |
| OC-022 | 1 | Both vendors apply | `tests/activation.mjs:231` | asserted |
| OC-022 | 1 | A lost response after an accepted batch is durably interrupted | `tests/activation.mjs:146` | asserted |
| OC-022 | 1 | Restart keeps the interrupted outcome | `tests/activation.mjs:154` | asserted |
| OC-022 | 1 | An interrupted import resumes to completion | none in a cited file: the shape journey restarts between apply calls, and the interrupted import is refused and rolled back | none |
| OC-022 | 1 | Both vendors undo | `tests/activation.mjs:192` | asserted |
| OC-022 | 1 | A revoked session cannot publish | `tests/activation.mjs:328` | asserted |
| OC-022 | 1 | An injected SQL failure rolls back the batch and journal | `tests/activation.mjs:124` | asserted |
| OC-022 | 1 | An unchanged replay returns the same job | `tests/activation.mjs:190` | asserted |
| OC-022 | 1 | A changed identity conflicts and keeps committed data | `tests/activation.mjs:326` | asserted |
| OC-022 | 1 | A native edit is kept as a named undo conflict | `tests/activation.mjs:315` | asserted |
| OC-033 | 1 | Signed API events are admitted | none in a cited file: `tests/runtime.mjs:583` holds it | none |
| OC-033 | 1 | Bearer API events are admitted | `tests/intake.mjs:63` | asserted |
| OC-033 | 1 | An inbound email opens one generation | `tests/intake.mjs:38` | asserted |
| OC-033 | 1 | The inbound email is a real provider email | moved to the register (R-2) | moved |
| OC-033 | 1 | Duplicate message IDs deduplicate | `tests/intake.mjs:41` | asserted |
| OC-033 | 1 | Rotated and revoked addresses refuse | `tests/intake.mjs:56` | asserted |
| OC-033 | 1 | Exceeded size and attachment limits are quarantined | `tests/intake.mjs:49` | asserted |
| OC-033 | 1 | Spoofed senders are quarantined | `tests/intake.mjs:46` | asserted |
| OC-033 | 1 | Malformed MIME is quarantined | `tests/intake.mjs:46` | asserted |
| OC-033 | 2 | Accepted receipts read back | `tests/intake.mjs:37` | asserted |
| OC-033 | 2 | Quarantine and rejection diagnostics are bounded and named | `tests/intake.mjs:54` | asserted |
| OC-033 | 2 | An address key grants no read | `tests/intake.mjs:58` | asserted |
| OC-033 | 2 | An address key mutates no incident | `tests/intake.mjs:59` | asserted |
| OC-033 | 3 | A repeated failure subject stays one generation under custom rules | none in a cited file | none |
| OC-033 | 3 | The resolve-rule mail stops paging by source recovery | `tests/routing.mjs:54` | asserted |
| OC-037 | 1 | Resolved incidents form the cohort | `tests/reviews.mjs:88` | asserted |
| OC-037 | 1 | Open incidents stay visible as censored cases | `tests/reviews.mjs:97` | asserted |
| OC-037 | 1 | Never-acknowledged incidents stay unattributed | `tests/reviews.mjs:88` | asserted |
| OC-037 | 1 | Late acknowledgments are singled out | none in a cited file | none |
| OC-037 | 1 | Repeated alerts are counted | `tests/reviews.mjs:100` | asserted |
| OC-037 | 1 | Imported incidents are reported with their provenance | none in a cited file | none |
| OC-037 | 1 | Scheduled hours are DST-correct | `tests/reviews.mjs:115` | asserted |
| OC-037 | 1 | After-hours shifts are reported | none in a cited file | none |
| OC-037 | 1 | Dashboard figures match the timelines | none in a cited file | none |
| OC-037 | 1 | CSV figures match the screen | `tests/reviews.mjs:105` | asserted |
| OC-037 | 1 | API figures match coverage hours | `tests/reviews.mjs:90` | asserted |
| OC-037 | 1 | An interruption-fairness imbalance is shown | `tests/reviews.mjs:92` | asserted |
| OC-037 | 1 | A foreign-team export is refused | none in a cited file | none |
| OC-037 | old 2 | Each inheriting capability repeats this evidence | moved to the Requirement (pointer) | moved |
| OC-041 | 1 | Workspace commands commit with their audit | `tests/runtime.mjs:663` | asserted |
| OC-041 | 1 | Member and access changes commit with their audit | `tests/runtime.mjs:384` | asserted |
| OC-041 | 1 | Password changes commit with their audit | none in a cited file: the password change is checked by status only | none |
| OC-041 | 1 | Source key rotation and revocation commit with their audit | `tests/runtime.mjs:771` | asserted |
| OC-041 | 1 | Intake admission commits with its audit | `tests/runtime.mjs:520` | asserted |
| OC-041 | 1 | Schedules commit with their audit | `tests/activation.mjs:31` | asserted |
| OC-041 | 1 | Paging refusals keep audit with unchanged revisions | `tests/activation.mjs:115` | asserted |
| OC-041 | 1 | Triage bulk actions roll back with their audit on an audit failure | `tests/runtime.mjs:923` | asserted |
| OC-041 | 1 | Handoff actions commit with their audit | none in a cited file | none |
| OC-041 | 1 | Routing publication commits with its audit | none in a cited file | none |
| OC-041 | 1 | Move-in and the import door keep a durable interrupted audit | `tests/activation.mjs:149` | asserted |
| OC-041 | 1 | Erasure rolls back with its audit | `tests/activation.mjs:489` | asserted |
| OC-041 | 1 | An audit-write failure rolls back state and audit | `tests/runtime.mjs:380` | asserted |
| OC-041 | 2 | An administrator exports the permanent audit | `tests/runtime.mjs:135` | asserted |
| OC-041 | 2 | Anonymous audit export is refused | `tests/runtime.mjs:373` | asserted |
| OC-041 | 2 | Revoked audit export is refused | `tests/runtime.mjs:965` | asserted |
| OC-041 | 2 | Viewer audit export is refused | `tests/runtime.mjs:372` | asserted |
| OC-041 | 2 | Erased subjects keep labels and kind, time and outcome without personal content | `tests/activation.mjs:255` | asserted |
| OC-041 | 2 | The audit holds no names, hashes, credential labels or secrets | `tests/runtime.mjs:777` | asserted |
| OC-041 | 3 | An interrupted import keeps a durable outcome | `tests/activation.mjs:149` | asserted |
| OC-041 | 3 | An expired lease keeps its failure code | `tests/activation.mjs:146` | asserted |
| OC-041 | 3 | A retry after the interruption publishes nothing more | `tests/activation.mjs:156` | asserted |
| OC-041 | 4 | Restore keeps operational history and audit unchanged | `tests/runtime.mjs:822` | asserted |
| OC-041 | 4 | Restored history grants no intake authority | `tests/runtime.mjs:830` | asserted |
| OC-041 | 4 | Restored history reassigns no label | none in a cited file: the labels after restore are not compared | none |
| OC-041 | old 5 | Future classes repeat this journey | moved to door rule D-1 | moved |
| OC-042 | 1 | A native signed source is configured over a protected setup door with a redacted definition | `tests/runtime.mjs:200` | asserted |
| OC-042 | 1 | A rotated key replaces the old one | `tests/runtime.mjs:202` | asserted |
| OC-042 | 1 | Each other connector is configured and rotated with its traffic inspected at a network edge | none in a cited file | none |
| OC-042 | 1 | Persisted and exported representations hold no key | `tests/runtime.mjs:228` | asserted |
| OC-042 | 1 | Hostile URLs and redirects are refused | none in a cited file | none |
| OC-042 | 1 | A revoked credential is refused | `tests/runtime.mjs:219` | asserted |
| OC-042 | 1 | Only the chosen endpoint receives the minimum permitted content | none in a cited file | none |
| OC-042 | 1 | Secrets never travel in an archive | `tests/runtime.mjs:228` | asserted |
| OC-042 | 1 | Secrets never travel in a model request | none in a cited file: no model request exists to inspect | none |
| OC-042 | old 2 | Each inheriting capability repeats this evidence | moved to door rule D-3 | moved |
| OC-052 | 1 | A populated installation exports through the protected checkpoint door | `tests/activation.mjs:386` | asserted |
| OC-052 | 1 | The installation exports through rer export | `tests/transfer.mjs:224` | asserted |
| OC-052 | 1 | Every durable category compares equal after restore | `tests/transfer.mjs:252` | asserted |
| OC-052 | 1 | The restore is inactive on a fresh authorized installation | `tests/transfer.mjs:258` | asserted |
| OC-052 | 1 | Local secrets are reconfigured | `tests/transfer.mjs:169` | asserted |
| OC-052 | 1 | No send or action replays | `tests/transfer.mjs:160` | asserted |
| OC-052 | 2 | A malformed archive leaves the target unchanged | `tests/transfer.mjs:237` | asserted |
| OC-052 | 2 | An over-limit checkpoint leaves the state unchanged | `tests/activation.mjs:397` | asserted |
| OC-052 | 2 | An erased record fences an older checkpoint | `tests/checkpoint-cli.mjs:169` | asserted |
| OC-052 | 2 | Unknown records never publish | `tests/transfer.mjs:239` | asserted |
| OC-052 | 2 | A storage fault preserves the full prior state | `tests/activation.mjs:402` | asserted |
| OC-052 | 2 | A concurrency fault publishes one restore | `tests/checkpoint-cli.mjs:155` | asserted |
| OC-052 | 3 | Native coordination runs with AI network access denied | none in a cited file | none |
| OC-052 | old 3 | Native coordination runs with author network access denied | moved to Base BASE-DATA-005 | moved |
| OC-052 | 3 | Input stays literal | none in a cited file | none |
| OC-052 | 3 | No undeclared public embed or upload door exists | none in a cited file | none |
| OC-053 | 1 | A scoped API client creates an incident attributed to the client | `tests/automation.mjs:128` | asserted |
| OC-053 | 1 | The client acknowledges, naming the responsible member | `tests/automation.mjs:147` | asserted |
| OC-053 | 1 | The client reassigns | `tests/automation.mjs:156` | asserted |
| OC-053 | 1 | The client resolves, producing the resolution event | `tests/automation.mjs:182` | asserted |
| OC-053 | 1 | Cursor pages walk real records | `tests/automation.mjs:168` | asserted |
| OC-053 | 1 | A rate limit refuses with Retry-After | `tests/automation.mjs:242` | asserted |
| OC-053 | 1 | An over-limit page size is refused | `tests/automation.mjs:170` | asserted |
| OC-053 | 1 | A stale edit conflicts | `tests/automation.mjs:154` | asserted |
| OC-053 | 2 | Outbound events arrive signed | `tests/automation.mjs:95` | asserted |
| OC-053 | 2 | A revoked token stops reads, writes and queued sends | `tests/automation.mjs:240` | asserted |
| OC-053 | 2 | A revoked endpoint stops queued sends | `tests/automation.mjs:234` | asserted |
| OC-053 | 2 | A failed delivery is retried later with a due time | `tests/automation.mjs:211` | asserted |
| OC-053 | 2 | Queued deliveries survive a restart after the domain commit | `tests/automation.mjs:183` | asserted |
| OC-053 | 2 | A replay is deduplicated by the receiver | `tests/automation.mjs:208` | asserted |
| OC-053 | 2 | Exhausted attempts end terminal | `tests/automation.mjs:217` | asserted |
| OC-053 | 2 | A receiver commit without a receipt is uncertain | `tests/automation.mjs:204` | asserted |
| OC-053 | 2 | Replay never double-changes incident state | `tests/automation.mjs:208` | asserted |
| OC-053 | 3 | An audit failure rolls back state and outbox together | `tests/automation.mjs:202` | asserted |
| OC-053 | 3 | Export stays safe after subject erasure, with the audit fact unchanged | `tests/automation.mjs:280` | asserted |
| OC-053 | 3 | A send interrupted at dispatch keeps an uncertain outcome | `tests/automation.mjs:229` | asserted |
| OC-053 | 4 | Restore keeps client and recipient definitions and delivery history | `tests/checkpoint-cli.mjs:36` | asserted |
| OC-053 | 4 | Restored outbox work is held for authorization | `tests/checkpoint-cli.mjs:32` | asserted |
| OC-053 | 4 | No token or signing custody transfers | `tests/transfer.mjs:244` | asserted |
| OC-056 | 1 | A resolve-rule mail stops the email-triggered page by source recovery | `tests/triage.mjs:394` | asserted |
| OC-056 | 1 | The stop equals the outcome other sources record | `tests/triage.mjs:395` | asserted |
| OC-056 | old 2 | Delivery and closed-browser timing are accepted under OC-026 and OC-027 | moved to the Requirement (pointer to OC-026, OC-027, OC-075 and OC-078) | moved |
| OC-057 | 1 | A warning outside support hours is low urgency | `tests/urgency.mjs:106` | asserted |
| OC-057 | 1 | Only the responder's low-urgency rules fire | none in a cited file: paging is OFF | none |
| OC-057 | 1 | No voice or SMS is sent | none in a cited file: paging is OFF | none |
| OC-057 | 1 | No escalation passes level one | none in a cited file: there is no escalation timer | none |
| OC-057 | 2 | The alert is raised to high at 09:00 | none in a cited file: there is no timer | none |
| OC-057 | 2 | Escalation starts at the raise | none in a cited file | none |
| OC-057 | 3 | A warning inside support hours is high urgency | `tests/urgency.mjs:106` | asserted |
| OC-057 | 3 | The high alert escalates | none in a cited file | none |
| OC-057 | 4 | A missing severity is high urgency | `tests/urgency.mjs:108` | asserted |
| OC-057 | 5 | A lower-severity re-trigger never lowers urgency | `tests/urgency.mjs:49` | asserted |
| OC-057 | 6 | A human lowering records its reason and actor | `tests/urgency.mjs:82` | asserted |
| OC-057 | 7 | Support-hours decisions hold across DST changes | `tests/urgency.mjs:106` | asserted |
| OC-057 | 8 | An open low alert shows the not-automatic support-start label and its next support start | none in a cited file | none |
| OC-057 | old 8 | OC-026, OC-027 and OC-060 repeat their steps before they ship | moved to the Requirement (pointer) | moved |
| OC-059 | 1 | A 300 KiB group of 200 alerts gives 200 events | `tests/monitoring.mjs:92` | asserted |
| OC-059 | 1 | Each of the 200 alerts gets a recorded page obligation | `tests/monitoring.mjs:95` | asserted |
| OC-059 | 1 | The 200-alert group has no refusal | `tests/monitoring.mjs:94` | asserted |
| OC-059 | 2 | A 600 KiB PagerDuty v2 event is accepted | `tests/monitoring.mjs:103` | asserted |
| OC-059 | 2 | A 3 MiB Alertmanager group is accepted | `tests/monitoring.mjs:100` | asserted |
| OC-059 | 3 | The incomplete-intake alert pages its service as a recorded obligation | `tests/monitoring.mjs:101` | asserted |
| OC-059 | 3 | The integration owner gets a notice | `tests/monitoring.mjs:23` | asserted |
| OC-059 | 3 | Bounded evidence of what was dropped is retained | `tests/monitoring.mjs:20` | asserted |
| OC-059 | 3 | The response is 202 with the truncation flag | `tests/monitoring.mjs:100` | asserted |
| OC-059 | 4 | An oversize unauthenticated request gets a refusal diagnostic | `tests/monitoring.mjs:111` | asserted |
| OC-059 | 4 | The refused request creates no alert | `tests/monitoring.mjs:110` | asserted |
| OC-059 | 4 | No raw body is stored | `tests/monitoring.mjs:111` | asserted |
| OC-059 | 5 | Readable alerts page their routed service | `tests/monitoring.mjs:119` | asserted |
| OC-059 | 5 | The incomplete-intake alert pages the integration owner | `tests/monitoring.mjs:121` | asserted |
| OC-059 | 6 | The incomplete-intake alert is high urgency under a constant-low rule | `tests/monitoring.mjs:102` | asserted |
| OC-059 | 6 | The owner notice records paging OFF | `tests/monitoring.mjs:23` | asserted |
| OC-059 | 6 | The owner audit notice is recorded | `tests/monitoring.mjs:24` | asserted |
| OC-059 | old 6 | OC-026, OC-068 and OC-064 repeat their steps | moved to the Requirement (pointer) | moved |
| OC-070 | 1 | Three equal failure subjects give one generation | `tests/intake.mjs:38` | asserted |
| OC-070 | 1 | The generation holds three timeline entries | `tests/intake.mjs:39` | asserted |
| OC-070 | 1 | One page obligation is recorded | `tests/intake.mjs:38` | asserted |
| OC-070 | 2 | Custom trigger rules give two generations | `tests/routing.mjs:54` | asserted |
| OC-070 | 2 | Two pages are recorded | none in a cited file: obligations are not read in the custom-rule journey | none |
| OC-070 | 2 | The OK mail stops nightly-db with a stopped-by-source-recovery outcome | `tests/routing.mjs:54` | asserted |
| OC-070 | 2 | nightly-web keeps escalating | none in a cited file: paging is OFF; only its active state is read | none |
| OC-070 | 3 | An OK mail with no open generation gives a no-effect receipt | `tests/routing.mjs:54` | asserted |
| OC-070 | 4 | An unmatched mail under the subject fallback opens an alert | `tests/routing.mjs:59` | asserted |
| OC-070 | 4 | An unmatched mail under the quarantine fallback is shown with its reason | `tests/routing.mjs:63` | asserted |
| OC-070 | 5 | A pathological regex leaves intake unaffected | `tests/routing.mjs:65` | asserted |
| OC-070 | 6 | The same key on a second service opens its own generation | `tests/routing.mjs:58` | asserted |
| OC-070 | 7 | A draft rule test makes zero writes | `tests/routing.mjs:62` | asserted |
| OC-070 | 8 | Imported PagerDuty email rules and Opsgenie filters give a mapping report | none in a cited file | none |
