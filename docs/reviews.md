# Response reports and human review

Reviews brings retained response timings, generated review material and open improvements together. Every current workspace member can read the same report and material; responders and administrators can record a human review or accept follow-up evidence. Workspace-wide roles apply. Private-team scoping is not implemented.

## Read a response report

Select an exact UTC declaration period and optionally a service. The cohort includes incidents created in `[from,to)`, regardless of current state or available metrics. The range can span up to 366 days. The displayed observation time bounds measured endpoints and censored lower bounds. Open/unacknowledged incidents stay visible; unknown times are never counted as zero or successful completions.

Acknowledgment runs from declaration to the first explicit acknowledgment. Resolution runs from declaration to final resolution. Recovery timing uses the last immutable human recovery evidence after any relapse into mitigation. It is a human attestation, not independent telemetry verification. Source-reported recovery runs from declaration to acceptance of the last recovery event reported by the sources of every linked alert; it is censored while a linked alert is active and unknown without linked alerts. A resolved incident without acknowledgment has unknown acknowledgment time. Structured lifecycle records identify their source entry. Earlier text-only transitions are labeled legacy-derived; a current recovery link cannot prove evidence existed at an earlier legacy transition.

Mean, nearest-rank p50/p90/p95 and distribution buckets use measured durations, alongside visible total/measured/censored/unknown counts. Incident drilldown and CSV retain source entry IDs, timestamps and reasons. Configuration changes cannot turn an unknown into a successful timing. Erased or removed history cannot be reconstructed; this report explicitly describes its current retained snapshot.

`GET /api/reports/response` and `/api/reports/response.csv` share `from`, `to` and `service`. The UI CSV link binds `at` to the displayed observation time, `revision` to its workspace revision and `schedulingRevision` to its schedules. A changed workspace returns a refusal requiring report refresh rather than silently exporting a different snapshot. CSV cells are quoted and formula-leading input is escaped. Current membership is checked on both doors.

**Repeat and noisy alerts** count alerts with a trigger in the cohort range, suppressed alerts included, and rank the source/service/keys that repeat or open more than one generation.

**Load by scheduled coverage** computes primary and backup hours per responder, and covered and uncovered primary hours per service, from the current revision of each schedule, its rotations and overrides, and current membership, up to the observation time. These are scheduled hours, not worked hours, and the schedule revisions used are listed; a later schedule change recomputes them, and the CSV binds `schedulingRevision` so a changed schedule refuses the export. Load is each incident's first explicit acknowledgment, normalized per 24 scheduled primary hours, with its share compared with the responder's share of primary hours. Acknowledgments made outside the responder's scheduled coverage are counted; a responder without primary hours gets no rate. Teams are not modeled, so load is by responder and service.

There is no real page/delivery, escalation/reassignment latency or after-hours measurement. Synthetic paging never supplies those numbers. Imported-history provenance is not available. Report definitions and missing evidence are visible in the app and API.

## Generate material, then assess it

Open **Generated review material and human acceptance** for an incident. Oncall assembles linked source observations, literal attributed timeline assertions, response timing source entries, recent service/dependency changes and follow-ups. Every record retains source IDs and timestamps. Missing delivery, investigation and chat/bridge context is stated. Changes near the incident are context, never automatically a cause. Links grant no access and are not fetched.

For a resolved incident, write a human-assessed root cause, impact and review, then explicitly confirm the current material revision. The server checks both incident and workspace revisions again, including source observations and dependency/change context. A newly admitted source event invalidates the old material even when the incident revision did not change. Acceptance records the person, time and both material revisions. The accepted root cause, impact and review are also retained as an immutable timeline snapshot. Later incident changes leave the earlier acceptance visible as an earlier revision. Generated material is never automatically copied into an accepted assessment.

## Follow required improvements

Follow-ups have P1/P2/P3 priority, owner, a UTC calendar due date, a manual escalation contact and completion policy. They sort open first, then priority and due date. The due date runs through its full UTC day; overdue begins at 00:00 UTC the next day. Existing records retain their original evidence-completion behavior and are labeled legacy when attribution or policy was not recorded.

New follow-ups default to human review. P1 always requires it. Submitting an HTTP(S) evidence URL leaves such work awaiting acceptance. A current responder must explicitly accept completion with a reason; the person and time are recorded. An evidence-policy action completes when a responder submits evidence. Neither a quiet alert nor a remote ticket can complete work through these commands.

Automatic reminders, overdue escalation, recurring review and Jira/Linear/GitHub/GitLab synchronization are not implemented. The manual escalation contact is retained for human coordination, with no outgoing messages. Native archives, recovery checkpoints and portable transfers retain review, follow-up and structured lifecycle records; restored source definitions and execution authorities remain inactive under the archive policy.

Explicit incident erasure retains an anonymous declaration case (random independent ID, service and declaration time only). The report and CSV include it with all durations unknown, without a drilldown or original incident identity. Erased responder load remains under “Erased member”; missing coverage produces no invented rate. Current archive/checkpoint restore must retain these cases. Earlier erasures cannot be reconstructed.
