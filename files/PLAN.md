# PagerDuty documented account import plan

Author: Run Edit Run fleet, 2026-11-17 UTC.

1. Preserve the existing 75-record account fixture and saved-list/detail regressions. Read the five target clauses completely; do not change acceptance points, judgments or generated contract views.
2. Read the public PagerDuty OpenAPI schema, record its SHA-256, and generate a deterministic 498-object synthetic account within the existing 500-record/512 KiB limits. Preserve endpoint response wrappers and place parent bindings outside the responses. Generate twice and compare both files byte for byte.
3. Extend the existing saved-file reader and mapper to join separately saved contacts, notification rules, overrides, integration details, timeline entries, subscribers and routers. Reject missing/contradictory bindings, incomplete pagination, missing details, duplicate IDs, wrong wrappers and credentials. Retain original bytes and JSON pointers.
4. Assign each original JSON leaf exactly one mapped, lossy, retained-only or refused decision, including empty containers, nulls, pagination and packaging metadata. Include source ID, pointer, original value, reason and receiving place. Keep unknown fields explicit. Add a compact field summary and exact copy/download controls within the existing review.
5. Extend existing HTTP/browser journeys rather than adding registrations. Prove owner and signed Business upload/plan/apply, partial checkpoint, Worker restart, reconcile, identical replay, changed catch-up, layered undo, publication-time revocation and SQL failure without native authority. Preserve erasure and credential-refusal regressions. Assert UI at 1440; show the changed review at 1440 and 390.
6. Run touched checks and typecheck; regenerate/check the source lock last. Publish substantial product commits only to cloud/sd-oncall-import-pagerduty-1. Do not commit reports or generated contract views. Poll exact-SHA Verify under the ten-call API budget. Publish the actual non-secret packet separately to evidence/sd-oncall-import-pagerduty-1.

Defaults: saved synthetic files only; current owner/admin or owner-opted-in short-lived signed Business grants; paused data; no imported login grants; no native service creation; no production paging, keys, provider requests, account activation or outbound actions. Unknown capabilities are retained or refused rather than approximated.
