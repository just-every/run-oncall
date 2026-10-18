# Move-in guide

Oncall reads saved files only. Keep your existing pager authoritative. These test fixtures follow documented response shapes and contain invented test people; they are not customer exports.

## Obtain the input

In **Move-in kit**, choose **Opsgenie** or **PagerDuty** under **Source**, then expand **How to export from…** before the file picker. Download **oncall-export.mjs** and save it in Downloads with that exact name, without a `.txt` suffix. The panel explains how to create a read-only provider key and run the tool; the same steps and official references are in [Save your export with the downloadable tool](docs/move-in.md#save-your-export-with-the-downloadable-tool). You need Node.js 22 or later, an interactive terminal and internet access to your provider. No npm packages, API client or manual JSON assembly are needed. Calendar and CSV downloads do not contain the required rotation settings.

Open Terminal on macOS/Linux or PowerShell on Windows, change to Downloads (`cd ~/Downloads`, or `cd "$HOME\Downloads"` in PowerShell), and run the command for your provider:

```sh
node oncall-export.mjs opsgenie
```

or:

```sh
node oncall-export.mjs pagerduty
```

Answer the region and UTC comparison-date prompts, then paste only the read-only key at the hidden key prompt. Opsgenie needs configuration access; PagerDuty needs a REST key, not an Events API key. The key stays in the tool's memory and never enters Oncall. The tool makes only GET requests, follows pagination, collects schedule details and comparison timelines, joins overrides to their schedules, and omits credential fields. PagerDuty includes overrides only for the chosen window. For named-zone PagerDuty equivalence evidence, choose a window that includes a clock change.

A successful run prints **Saved** and the full path to a new `opsgenie-export-DATE-TIME.json` or `pagerduty-export-DATE-TIME.json` in the current folder. Keep it private. If Opsgenie returns **HTTP 422**, the key may be malformed: copy the full key again without `GenieKey` or header text; if it persists, ask your administrator to check the key, region and configuration access. Failed collection saves no file; do not upload an export left from an earlier run. See the linked guide for other errors and size limits.

Return to Move-in kit, select the matching source and choose the saved JSON under **Export JSON**. Preview, confirm paused import, and explicitly map service and people for adoption remain separate actions. Paging stays OFF. The response-shape reference below is for operators maintaining their own export tooling; the downloadable tool builds the bundle for you.

## Accepted response shapes

Opsgenie first: save each documented response unchanged (users, schedules with their rotations, schedule overrides, escalations and schedule timelines) and bundle them under `users`, `schedules`, `overrides`, `escalations` and `timelines`. Each key holds one saved response or an array of saved responses, for example one detail response per schedule. A saved response is a list (`{"data":[...],"requestId":...,"took":...,"totalCount":...,"expandable":[...]}`) or a single detail (`{"data":{...},...}`); the envelope fields are not records. The override list names no schedule, so add one field `scheduleId` beside `data` in that saved file; without it the overrides belong to the bundle's only schedule, and when the bundle holds several schedules the overrides and every schedule they could change are refused by name; a single override detail names its schedule in `_parent`. Timelines name theirs in `_parent`.

PagerDuty next: save users, each detailed schedule including `schedule_layers` (the list response omits them unless asked), overrides, and escalation policies, and bundle them under `users`, `schedules`, `overrides` and `escalation_policies`. Each key holds a list response (`{"users":[...],"limit":25,"offset":0,"more":false,"total":null}`, likewise `schedules`, `escalation_policies`, `overrides`), a single detail (`{"user":{...}}`, `{"schedule":{...}}`, `{"escalation_policy":{...}}`) or an array of saved responses. The override list names no schedule, so add one field `schedule_id` beside `overrides`; without it the overrides belong to the bundle's only schedule, and when the bundle holds several schedules the overrides and every schedule they could change are refused by name. Match users by normalized email; a missing user detail rejects a rotation, and an override for a user who is not in the export rejects that override and its schedule, rather than inventing a responder.

Opsgenie fields read (13 October 2026). Users: id, username, fullName and profile fields, retained only. Schedule (list with `expand=rotation`, or detail): id, name, description, timezone, enabled, ownerTeam {id, name} and rotations[] with id, name, startDate, endDate, type (daily, weekly, hourly), length, participants[] (type user, team, escalation or none, with id, username or name) and timeRestriction (time-of-day with one restriction, weekday-and-time-of-day with restrictions[]). Override: alias, user {type, id, username}, startDate, endDate, rotations[] {id, name}; the detail adds `_parent` {id, name, enabled}. Timeline: `_parent`, startDate, endDate and finalTimeline, baseTimeline, overrideTimeline and forwardingTimeline, each with rotations[] {id, name, order, periods[] {startDate, endDate, type, recipient {type, id, name}}}. Escalation: id, name, description, ownerTeam, rules[] {condition (if-not-acked or if-not-closed), notifyType, delay {timeAmount, timeUnit}, recipient {type user, schedule or team; id, name or username}} and repeat {waitInterval, count, resetRecipientStates, closeAlertAfterAll}. The Schedule pages show no `totalCount`; Oncall ignores it where a response carries one.

PagerDuty fields read (13 October 2026). User: id, type, summary, self, html_url, name, email, time_zone, color, role, avatar_url, description, job_title, invitation_sent, created_via_sso, contact_methods[], notification_rules[], teams[]. Schedule (detail): id, type, summary, self, html_url, name, time_zone, description, escalation_policies[], users[], teams[], schedule_layers[] {id, name, start, end, rotation_virtual_start, rotation_turn_length_seconds, users[] {user {id, type, summary}}, restrictions[] {type, start_time_of_day, duration_seconds, start_day_of_week}, rendered_schedule_entries, rendered_coverage_percentage}, overrides_subschedule, final_schedule {name, rendered_schedule_entries[] {start, end, user}, rendered_coverage_percentage} and next_oncall_for_user. Override: id, start, end, user {id, type, summary, self, html_url}; it embeds no schedule. Escalation policy: id, type, summary, self, html_url, name, description, on_call_handoff_notifications, num_loops, escalation_rules[] {id, escalation_delay_in_minutes, targets[] {id, type user_reference or schedule_reference, summary, self, html_url}}, services[] and teams[]. The list envelopes carry limit, offset, more and total (null unless requested). The reference pages show a layer's `end` only in the update-schedule example request; its meaning (the end time of the layer, null while it does not end) is the OpenAPI field description.

Supported: one daily/weekly Opsgenie rotation with individual users, an exact calendar-minute hand-off and no time restrictions; one full-day PagerDuty layer in UTC; non-overlapping individual overrides; one or two schedule-recipient policy steps with ordinary unacknowledged delays and no repeats. A 0-minute first notification maps to 1 minute in the paused policy, with a named, non-equivalent timing difference in the preview; later steps must wait at least 1 minute. Original source timing remains in the journal, and no policy is activated. A PagerDuty schedule may also list layers that ended before the one open-ended layer began and have ended by the time of the preview: that layer is mapped and each ended layer is retained as named history in the review, never as concurrent coverage. A layer is active from its own start until its own end, so a layer that is still running when previewed, with its replacement starting later, is refused by name with the time it ends. A PagerDuty layer in a zone with offset changes (for example America/New_York) and a whole number of days per turn maps only when the supplied `final_schedule` is equivalent over its window to Oncall's calendar-day result and that window crosses an offset change of the zone; otherwise it stays rejected with "need incumbent DST equivalence evidence" and, for a differing timeline, the first differing instant. Backup coverage stays an explicit gap; source layers are never silently relabelled as backup. Unknown rotation/rule fields reject the whole schedule or policy. All source bytes and every unmapped/rejected object remain in Base's journal.

Other compatibility differences, each rejected by name and never approximated: disabled Opsgenie schedules (`enabled: false` puts no one on call), sub-day and hourly turns, time restrictions, two layers active together (and a layer that ended after the active one began), nested schedules, teams and empty participant slots, multiple override recipients or an override naming a rotation Oncall did not map, PagerDuty fixed-second turns in a zone without matching timeline evidence, more than two escalation steps, zero-minute later escalation steps, repeats, non-acknowledgement notification conditions, notify types other than the default, simultaneous or direct-user policy recipients, notification rules, routes/event rules, maintenance windows and incident history. A key, token, signing secret, integration or routing key, webhook URL or calendar URL anywhere in the file refuses the whole file and names the field; no credential is accepted or made live. User notification rules remain retained, named omissions. Unknown object types are rejected explicitly.

Final timelines are compared at every incumbent and Oncall boundary within the supplied bounded window, clipped to the mapped layer's own validity. A result says equivalent only in that window, lists differences, or says no timeline was supplied. It cannot certify the next DST transition, future edits, provider delivery or a live account. Inspect the boundary window and retain your own incumbent evidence for a longer mirror run.

Preview writes no Oncall objects; the import journal keeps the uploaded file and its reviewed plan. Review its mapped counts, every rotation/rule difference and equivalence report. Confirm that exact preview to apply paused data. When the source already holds an import, the preview is its catch-up: new objects are added, changed ones replace what that import wrote unless they were edited in Oncall (refused by name), and objects missing from the file are listed, never deleted. An unconfirmed preview holds its source until it is confirmed or another file is previewed there. The journal can resume after restart. Undo reverses only unchanged imported objects; a native edit is preserved with NATIVE_EDIT_CONFLICT. To make a completed imported schedule live, choose Make schedule live under Paused imported data, select an existing service, and map every imported person to a distinct current active responder/admin. Create missing services and members in the workspace first. Confirm live schedule · paging OFF atomically creates a validated native schedule and marks the imported row as edited, with current administrator/session authority and workspace, paging and source revision guards. Now/next and ICS use that native schedule immediately. No imported sign-in or policy is activated. Missing/erased people, incomplete imports, stale mappings and ID collisions are refused. Adoption is a native edit, so later import undo refuses with NATIVE_EDIT_CONFLICT and preserves it; imported-person erasure does not change the adopted native schedule or workspace members.

The move-in screen imports through Base's owner-session import door, `POST /api/operator/import/{uploads,plan,apply,status,reconcile,undo}` with `X-Import-Source: opsgenie` or `pagerduty` (anything else answers 400 `unknown_import_source` and writes nothing): it uploads the saved file's original bytes in checksummed chunks, plans them, and applies only the fingerprint the administrator reviewed. Oncall's other protected HTTP doors are /api/move-in/jobs, /objects, /coverage, /adoption (available workspace service/member choices), /adopt (explicit live schedule adoption) and /erase; imports made before the door keep /api/move-in/:id/status, /resume and /undo, which refuse a door import with 409 `IMPORT_DOOR_JOB`. Read-only, apply, undo and erase all require current administrator authority. Oncall's own refusals answer `{"error":...,"code":...}`: a sentence naming the people, schedules or import involved and what to do, with the code in its own field; other door refusals answer the door's code. A schedule refused for several reasons lists them all; an override's own refusal is added beside its schedule's reason. No API key is requested and no external request occurs.

Erasing a person: an administrator types the exact email of an imported person (matched exactly, ignoring case; a person whose address merely contains theirs is someone else and is left untouched), applied, still pending in a resumable import, or held only in an uploaded file or an unapproved plan, and confirms by typing `erase <email>`. In one batch Oncall removes the paused imported user, clears their slot in imported schedule rotations (the slot keeps its index and becomes an explicit coverage gap; an override that named them becomes an empty interval), and erases them from import custody through Base's `retireD1ImportCustody` with the restore checkpoint, so every archive made before the erasure is refused whole by `rer import --journal LATER_ARCHIVE`. Imported records that name the person are tombstoned, whether their own source names the exact address anywhere (a schedule description, a contact-method address, notes or any other text; a longer address that merely contains theirs does not count) or a schedule names them only through another record (an override, a layer member, an incumbent comparison): a schedule that named them stays as already applied but its import can no longer undo it, and a pending record that names them is never imported. An import whose operation key was their email is retired whole. The answer carries the journal receipt id and says when a native member shares the email; that member is not changed. Repeating the request answers 404.

Documentation read 13 October 2026. Opsgenie: [Schedule API](https://docs.opsgenie.com/docs/schedule-api) (lists, details and timeline), [Schedule Override API](https://docs.opsgenie.com/docs/schedule-override-api), [Escalation API](https://docs.opsgenie.com/docs/escalation-api). PagerDuty: [get a schedule](https://docs.pagerduty.com/developer/api/reference/rest/schedules/get-schedule), [list schedules](https://docs.pagerduty.com/developer/api/reference/rest/schedules/list-schedules), [create a schedule](https://docs.pagerduty.com/developer/api/reference/rest/schedules/create-schedule), [update a schedule](https://docs.pagerduty.com/developer/api/reference/rest/schedules/update-schedule), [list overrides](https://docs.pagerduty.com/developer/api/reference/rest/schedules/list-schedule-overrides), [get an escalation policy](https://docs.pagerduty.com/developer/api/reference/rest/escalation-policies/get-escalation-policy), [list escalation policies](https://docs.pagerduty.com/developer/api/reference/rest/escalation-policies/list-escalation-policies), [list users](https://docs.pagerduty.com/developer/api/reference/rest/users/list-users), [get a user](https://docs.pagerduty.com/developer/api/reference/rest/users/get-user). The text of a layer's `end` was read from a mirror of PagerDuty's OpenAPI descriptions, [create schedule](https://docs.blinkops.com/docs/integrations/pagerduty/actions/create-schedule). Format support is fixture-proven; actual customer exports and a one-to-two-week mirror run remain future design-partner work.

## Optional Business imports

The installation owner can open `/auth/settings/identity` (Sign-in settings)
with their owner sign-in and enable **Allow Business imports**. It starts off;
`/api/rer/import/*` returns 404 until enabled. The row also permanently revokes a
trusted grant key id. Disabling and re-enabling imports does not restore that key;
configure a new trusted key id to grant access again. A workspace administrator's
password session cannot change the installation owner's setting.

Business uses the same import door as the move-in screen, under the same server-owned installation,
issuer, owner email and ES256 key ring configured for owner-claim. Oncall keeps
one server-owned allow-list of import namespaces, one per vendor: `opsgenie`
and `pagerduty` (`importSource` in `src/move-in/door.ts`), shared with the owner's mount in `src/move-in/owner-door.ts`. Each grant's namespace
is resolved through it after the grant is verified and before anything is
written: a listed namespace is parsed by that vendor's own parser, and any other
is refused with 403 `unknown_import_source`. Settings, lineage and history are
kept under the permanent door key `oncall`, which never changes when RER assigns
or changes the owner-claim installation id. Upload the exact saved-response JSON
export described above, using the door's checksummed chunks. Planning runs the
same credential rejection, response parsing and whole-bundle compatibility
mapping as the manual importer, with the same 512 KiB / 500 record limits, and
writes no native objects. It never activates paging, sign-in or delivery.

The sequence is upload → plan → owner approval of the fingerprint → apply →
reconcile → undo. Each request needs a fresh, short-lived action grant. Apply
must bind the reviewed fingerprint and owner's approval record. Counts,
source-id dispositions and native values are reconciled in the installation;
original bytes remain here. In **Move-in kit → Saved import journal**, select
the relevant source and import to see “approved via Business by … at …,
fingerprint …” (an administrator's own import reads “approved by …”) and use the existing **Undo this import** control. A Business import the door declared failed offers no resume; Business plans it again. Undo preserves
native edits. Key revocation stops Business access; the owner's journal and Undo
remain available. [Base door protocol](src/modules/import-kit/src/door/README.md).

Erasing an imported person (above) with Business imports on or off also
withdraws every retained door upload, chunk and plan snapshot whole, in the same
batch; plans, approvals and history captions stay, and reconciling a withdrawn
import answers 410 `snapshot_withdrawn`.

The import-kit, owner-claim, operator-auth and D1 transport copies are pinned in
`base-copies.json` to Base's `rer-v0.2.61` release, with the kit and door
migrations 0122-0125; Oncall's parser, mapping, paused target adapter, review
list and named refusals remain product-owned. One copied file is adapted,
`src/modules/import-kit/src/door/planning.ts`, and its `base-copies.json` digest
is of the adapted bytes: it does not reuse a plan whose import was undone or
rolled back, so the same file can be imported again after **Undo this import**;
and when an erasure has withdrawn the file of a source's live import, an
administrator's next preview starts a new baseline beside it instead of a
catch-up that could never be compared (Business catch-ups keep the door's 410). Migration
0126 records which pending plans are the screen's own previews.
