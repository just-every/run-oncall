# Move in from a saved on-call export

Open **Settings → Move in** to read schedules from PagerDuty or Opsgenie, then review the result before anything is imported. PagerDuty uses its own sign-in when this installation has a PagerDuty app; either provider can use a read-only key for this one read. The key stays in page and request memory and is never kept in an archive, audit entry or log. No provider schedules or routing are changed, and everything imported arrives paused. Paging stays off.

Choose **Other: from a file** for a saved export. The private terminal fallback is folded under **No key? Use the exporter on your computer**. Both paths lead to Review, then Import paused. Adoption, Undo and integration activation each ask once on the same page.

The shared file door accepts **PagerDuty, Opsgenie, Splunk On-Call, Jira Service
Management Ops and Better Stack** exports. Choose **Other: from a file** for the
additional sources. Preview retains the uploaded file and import bookkeeping;
it writes zero native objects and grants no login or paging authority. These
adapters have synthetic saved-response proof within their documented mapping
limits; no real customer export, complete account migration or live cutover is
certified. [Business imports and bounded catch-up](../MOVE-IN.md#optional-business-imports)
use the same door and source allow-list.

### Connect this installation’s PagerDuty app

The installer can supply the two optional settings in `rer setup`: `PAGERDUTY_OAUTH_CLIENT_ID` and `PAGERDUTY_OAUTH_CLIENT_SECRET`. Register `<app address>/api/move-in/pagerduty/callback` as the app’s redirect address, with only `users.read`, `schedules.read` and `escalation_policies.read` scopes. Without both settings the app offers the key path. Opsgenie always uses a read-only key.

Provider reads go only to the US or EU API host for the provider selected. Every request refuses redirects, times out after ten seconds, and runs within a bounded step. Reads stop rather than truncate at 500 objects or 512 KiB. The signed-in administrator remains required throughout. PagerDuty tokens are sealed under this installation’s key in an HttpOnly cookie for at most ten minutes, revoked when the read ends, and cleared. The installation’s minute task also revokes abandoned connections; a provider failure is recorded as a failure and expired local custody is discarded. If PagerDuty cannot close a connection, revoke the app in PagerDuty.

## Save your export with the downloadable tool

In **Settings → Move in**, choose **Opsgenie** or **PagerDuty** under **Source**, expand **No key? Use the exporter on your computer**, then **How to export from…**. That panel includes the download, runnable commands, provider key steps and troubleshooting. No API client, paging knowledge or manual JSON assembly is needed. Calendar (.ics) and CSV files do not contain the required rotation definitions.

### Prepare a read-only API key

**Opsgenie:** ask your administrator to create a separate API integration named **Oncall export**:

1. Open **Settings → Integrations → Add integration**, search for **API** and select it.
2. Enter the name and select **Continue**. Expand **Steps to configure the integration** to locate the API key.
3. In the integration's access settings, select **Limit to Read-Only Access** and leave **Restrict Access to Configurations** unselected. Save the settings, select **Turn on integration** and copy the key privately.

On plans without Settings → Integrations, start at **Teams → your team → Integrations → Add integration** and follow the same API steps. A team integration can read only schedules that team can access. Have your administrator check that the key can read all intended users, schedules, overrides and escalations. See the official [integration setup](https://support.atlassian.com/opsgenie/docs/create-a-default-api-integration/) and [access settings](https://docs.opsgenie.com/docs/api-access-management).

**PagerDuty:** ask an admin or account owner to open **Integrations → Developer Tools → API Access Keys → Create New API Key**. Enter **Oncall export** as its description, check **Read-only API Key**, and select **Create Key**. Copy the key privately before selecting **Close**; it is shown in full only once. This must be a REST API key; a service's Events API key cannot read configuration. See [PagerDuty's key instructions](https://support.pagerduty.com/main/docs/api-access-keys).

Keep the key out of commands and files. For an in-app read, paste it in the read-only key field. For a private file export, paste it only at the exporter’s hidden terminal prompt. The exporter keeps it in memory, makes only GET requests to the selected provider region, and never sends the key to Oncall.

### Download and run

You need **Node.js 22 or later**, an interactive terminal, and internet access to the provider. No npm packages are needed. Open Terminal on macOS/Linux or PowerShell on Windows and run `node --version`. If it is missing or below v22, install the current LTS from [nodejs.org](https://nodejs.org/en/download), then reopen the terminal.

[Download oncall-export.mjs](../public/move-in/oncall-export.mjs.txt) from your running Oncall app and save it in **Downloads** with that exact name, without a `.txt` suffix. You can inspect the downloaded source in a text editor. Run these two lines in Terminal, using the command for your provider:

```sh
cd ~/Downloads
node oncall-export.mjs opsgenie
```

or:

```sh
cd ~/Downloads
node oncall-export.mjs pagerduty
```

In Windows PowerShell, replace the first line with `cd "$HOME\Downloads"`. If you saved the script in a different folder, change to that folder first. `node oncall-export.mjs --help` explains usage without requesting a key or contacting a provider.

Answer the prompts:

1. **Region:** `us` or `eu`. For Opsgenie, choose `eu` when your sign-in uses `app.eu.opsgenie.com`; for PagerDuty, choose `eu` when your account address contains `.eu.pagerduty.com`. Otherwise choose `us`. The tool chooses the corresponding `api.opsgenie.com`, `api.eu.opsgenie.com`, `api.pagerduty.com` or `api.eu.pagerduty.com` host.
2. **Comparison start/end:** `YYYY-MM-DD`, meaning midnight UTC, with an exclusive end. Press Enter at each prompt for today through 14 days later, or choose a period of 1–31 days. For a PagerDuty schedule in a zone with clock changes, include a clock change so preview can check the required equivalence. For example, `2026-10-25` through `2026-11-08` spans New York's November clock change.
3. **API key:** paste the read-only key and press Enter. No characters appear while you enter it; that is expected. Do not include `Authorization`, `GenieKey` or `Token token=` text.

The exporter reads all people, schedules and policies accessible to the key. It follows provider pagination automatically, uses schedule details instead of duplicating list entries, and adds each override's schedule ID. Opsgenie includes all returned overrides and final timelines for the chosen period. PagerDuty includes final schedule coverage and overrides overlapping that period; `overflow=true` preserves full override boundaries. PagerDuty overrides outside the chosen period are not included. The tool omits credential fields, including calendar URLs, and reports the number omitted. Other response fields, including unknown rotation or rule settings, remain available for compatibility review.

### Find the file, upload it and handle errors

A successful run prints **Saved**, the full filename, object count and comparison window. The file is created in the folder where you ran the command, normally Downloads, with a name like `opsgenie-export-DATE-TIME.json` or `pagerduty-export-DATE-TIME.json`. Each run uses a new name. Keep it private: it contains names, email addresses and schedules. File permissions are owner-only on systems supporting Unix file modes.

Return to **Settings → Move in**, choose **Other: from a file** under **Source** and the matching **File source**, then choose that file under **Export JSON**. Oncall shows its review at once. Export success means the file was collected; the preview decides which settings are compatible. Read every rejection, difference and coverage comparison before confirming. Ask your administrator to revoke the dedicated export key after use.

If the tool stops:

- **HTTP 401/403:** ask your administrator to check the key, account region, read permission and Opsgenie configuration access/team scope. PagerDuty Events keys do not work here.
- **Opsgenie HTTP 422:** the key may be malformed. Copy the full API key again and paste only the key at the hidden prompt, without `GenieKey` or header text. If it persists, ask your administrator to check the key, account region and configuration access. No file was saved.
- **HTTP 429:** wait a few minutes before running again.
- **Network, response or pagination error:** check connectivity/provider status and rerun while source settings remain unchanged. No bundle is saved for these failures; do not select a file left from an earlier run.
- **Export too large:** Oncall accepts at most **512 KiB and 500 records** (people, schedules, overrides, policies and timelines combined). The exporter stops rather than truncating. Ask your administrator for a smaller provider access scope; do not omit people referenced by rotations or overrides. A shorter comparison window may reduce timeline size.
- **Cannot find the script:** check that the terminal is in Downloads and the file is named exactly `oncall-export.mjs`. If the download has a duplicate suffix such as `(1)`, use that actual filename or rename it first.
- **Cannot save:** check the folder's write permissions and free disk space, then run again.

For operators maintaining their own export tooling, the bundle uses `users`, `schedules`, `overrides` and `escalations` plus `timelines` for Opsgenie, or `users`, `schedules`, `overrides` and `escalation_policies` for PagerDuty. Each value is a record array; saved provider response envelopes are also accepted. Each override must name its `scheduleId` (Opsgenie) or `schedule_id` (PagerDuty) when multiple schedules exist. Timelines retain `_parent.id`; PagerDuty schedule details retain `schedule_layers` and `final_schedule`. Every referenced person must appear in `users`. Credential-bearing fields anywhere refuse the file.

Exporter references checked on 16 October 2026: Opsgenie's [pagination](https://docs.opsgenie.com/docs/pagination), [schedule details and timelines](https://docs.opsgenie.com/docs/schedule-api), [overrides](https://docs.opsgenie.com/docs/schedule-override-api) and [escalations](https://docs.opsgenie.com/docs/escalation-api); PagerDuty's [pagination](https://docs.pagerduty.com/developer/pagination), [schedule details](https://docs.pagerduty.com/developer/api/reference/rest/schedules/get-schedule), [overrides](https://docs.pagerduty.com/developer/api/reference/rest/schedules/list-schedule-overrides), [policies](https://docs.pagerduty.com/developer/api/reference/rest/escalation-policies/list-escalation-policies) and [regions](https://support.pagerduty.com/main/docs/service-regions).

## Preview, then import

1. **Connect:** open **Settings → Move in**. Connect PagerDuty or read schedules with a read-only key. For a saved file, choose **Other: from a file** under **Source**, choose the matching **File source**, and choose the file under **Export JSON**. Oncall shows its review at once.
2. **Review:** this is a dry run: it changes nothing in your workspace, however often you choose a file. Oncall keeps the file with its review in the import journal, so the import applies exactly what you reviewed. Read the **Compatibility review**: it counts what mapped, what was rejected and what came across with differences, then lists every object with its reason. Nothing is skipped quietly. If this source already holds an import, the review shows what the new file adds or changes; people or schedules edited in Oncall since are refused by name, and anything missing from the file stays.
3. **Import paused:** if you are happy, press **Import paused**, review the confirmation, then press **Confirm paused import**. Oncall applies exactly the review you saw. If you pick a different file, it shows a new review first.

The people, schedules and escalation policies land in **Imported data**. They do not get a sign-in or page anyone. Schedules stay out of live coverage until you explicitly adopt them below. If the import is interrupted, choose it under **Saved import journal** and press **Resume import**.

## Make an imported schedule live

After the import has completed:

1. Under **Imported data**, press **Make schedule live** beside the schedule.
2. Choose a service already in this workspace. Create it under **Settings → Services** first if needed.
3. Match every imported person to a different, active responder or admin in this workspace. Create missing members under **Settings → Team** first. Oncall does not guess identities from names or grant access to imported people.
4. Review those mappings and press **Confirm live schedule · paging OFF**.
5. Open **On call**. The adopted rotation and its overrides now appear there, including now/next and the private calendar. Check the coverage and add a backup if needed.

Adoption preserves the source timezone, calendar hand-overs, validity and overrides. It refuses incomplete imports, missing or erased people, stale revisions, duplicate person mappings and schedule ID collisions. A concurrent member change, undo or erasure stops the write; reload and review again. Imported policies remain paused and paging stays off.

Adoption is a native edit. Once a schedule is live, **Undo this import** refuses with `NATIVE_EDIT_CONFLICT` ("made live, so this import can no longer be undone") and keeps the adopted schedule and the import. Edit the rota under **On call**. Erasing an imported person affects the paused import and its journal, not the workspace members or the adopted native schedule; manage those separately.

## What the preview checks

If you supplied a final timeline, Oncall compares it with its own answer at every hand-over, inside the window the timeline covers. The result says the two agree in that window, lists each difference, or says no timeline was supplied and so nothing is claimed.

An agreement is only about that window. It does not promise the next clock change, schedule edits you make later, or that anyone was actually reached.

## Undo

Press **Undo this import** on an import in the journal to reverse it. Oncall removes what that import added and puts back what was there before. If anything it added has been changed since, Oncall keeps your change, stops with a conflict named `NATIVE_EDIT_CONFLICT` rather than overwrite it. The file you supplied stays in the journal as a record. Once the journal says **undone**, you can import the exact same file again: choose the file under **Export JSON** to open its review, then press **Import paused** and **Confirm paused import**. The new import gets a separate journal entry. If undo is still in progress, choose that import in **Saved import journal** and press **Continue undo** until it finishes.

## Erase a person

Under **Imported data**, press **Erase person** beside someone you imported, type `erase` followed by their exact email, and press **Erase permanently**. Oncall removes that paused person, leaves their slots in imported rotations as explicit gaps, and erases them from the import journal. Every export made before the erasure is refused whole if you try to bring it back in. Imports that named them can no longer be undone, and anything still waiting in an import that names them is never brought in. The answer shows a receipt number, and says so if a member of your workspace shares the email; that member is not changed.

People are matched by their exact email, so someone whose address merely contains theirs is left alone.

## What comes across

- **Opsgenie:** a schedule with one daily or weekly rotation of individual people, a hand-over at an exact calendar minute and no time restrictions.
- **PagerDuty:** a schedule with one current layer whose turns are whole days. Layers that ended before it began are kept as named history in the review, never as coverage. A layer in UTC maps directly; a layer in a zone with clock changes (for example America/New_York) maps only when its `final_schedule` agrees with Oncall's answer across a clock change, and otherwise is rejected with the first instant they differ.
- **Overrides:** one person each, not overlapping.
- **Escalation policies:** one or two steps, each handing to a single schedule after an ordinary "if not acknowledged" delay in minutes, with no repeats. A first step with an immediate (0-minute) notification maps to **1 minute** in the paused policy. The preview explicitly flags this timing change as non-equivalent; the original stays in the journal. No policy is activated. Later steps must wait at least 1 minute.

Oncall keeps the primary rotation. The backup is shown as an explicit gap, because a single source rotation is never relabeled as backup. See [Schedules and hand-overs](schedules.md) to add one.

## What stays different

Apart from the explicitly flagged 0-to-1-minute first-step mapping above, unsupported behavior is named in the preview rather than approximated. A schedule or policy with any of them is rejected whole, and the reason is listed:

- turns shorter than a day, and PagerDuty schedules outside UTC without a timeline that shows they agree across a clock change
- disabled Opsgenie schedules, since they put no one on call
- two layers active together, a layer still running when its replacement starts later, nested schedules, teams, and empty slots
- overrides with more than one person, and time restrictions
- policies with more than two steps, zero-minute later steps, repeats, other conditions, several people at once, or a person instead of a schedule
- any rotation or rule field Oncall does not know

Notification rules remain notes only, never switched on. PagerDuty account files also retain routes, event rules, maintenance windows and resolved incidents as named source evidence or refusals; they create no native routing, maintenance or history. Open incidents are individually refused as live imports. See [PagerDuty account saved responses](#pagerduty-account-saved-responses) for the receiving clauses and fields.

## Before you trust it

Oncall has been checked against sample files built from the documented Opsgenie and PagerDuty response shapes, not yet against real customer exports. Run it beside your pager for a week or two and compare, and keep your own export as the record. Moving your data out and in again is covered in [Export and restore](data.md), and what Oncall leaves alone is in [What Oncall does not do](limits.md).

Format references, read on 13 October 2026: Opsgenie's [Schedule API](https://docs.opsgenie.com/docs/schedule-api), [Schedule Override API](https://docs.opsgenie.com/docs/schedule-override-api) and [Escalation API](https://docs.opsgenie.com/docs/escalation-api); PagerDuty's [detailed schedule](https://docs.pagerduty.com/developer/api/reference/rest/schedules/get-schedule), [schedule overrides](https://docs.pagerduty.com/developer/api/reference/rest/schedules/list-schedule-overrides) and [escalation policy](https://docs.pagerduty.com/developer/api/reference/rest/escalation-policies/get-escalation-policy) references.

## Splunk saved responses

Choose **Other: from a file**, then **Splunk On-Call** under **File source**. Its [public API reference](https://portal.victorops.com/public/api-docs.html) documents the saved response surface. The adapter recognizes `users.users` (including nested lists), bare team arrays and `oncall.teamsOnCall`. User identity uses exported email, with username retained as the foreign ID. Current on-call users are a snapshot: neither they nor an undocumented rotation object become recurring coverage. Each unsupported object is named and its original bytes remain in the journal.

**Unverified assumptions:** response wrappers are based on published examples and the Splunk-maintained connector, not a live account export. The top-level collection bundle is assembled locally. Integration metadata needs a non-secret `id` and `type`/`kind`; full integration export shape and recurring schedule conversion are unverified and remain gaps. Remove keys before saving; credential-bearing files are refused in full.

## JSM saved responses

Choose **Other: from a file**, then **Jira Service Management Ops** under **File source**. Save all `values` pages for [schedules](https://developer.atlassian.com/cloud/jira/service-desk-ops/rest/v2/api-group-schedules/) and [integrations](https://developer.atlassian.com/cloud/jira/service-desk-ops/rest/v2/api-group-integrations/) under the matching collection names. Include rotation details and every referenced person. An override page has an administrator-added `scheduleId` beside `values`; `responder` and `rotationIds` map to the existing strict individual override converter. A single daily/weekly rotation can map; team participants, repeats, unknown rule fields and restricted windows are refused individually.

**Unverified assumptions:** user `accountId`/`emailAddress`/`displayName` aliases and the account's export permissions need account verification. Email must be present; an account ID never grants login. `teamId` remains source metadata. `API` integration metadata is inventoried as an inactive Opsgenie-lineage integration, with incumbent key **not supplied**. No native endpoint is created or activated by import.

## Better Stack saved responses

Choose **Other: from a file**, then **Better Stack** under **File source**. Save [on-call calendar JSON:API responses](https://betterstack.com/docs/uptime/api/list-all-existing-on-call-calendars/) under `schedules`, their `included` user resources under `users`, and [calendar events](https://betterstack.com/docs/uptime/api/list-on-call-calendar-events/) under `events`. Preserve every page, foreign ID and timestamp. A user's E.164 `phone_numbers` remain unverified contact history; they never count as paging routes. Numbers are labelled unlisted for paging until a maintained country list and verification establish coverage; country is not guessed from a shared calling prefix.

**Unverified assumptions:** the top-level bundle is our assembly convention, not a whole-account export. User resources use `attributes.email`, `first_name`, `last_name` and `phone_numbers`. Calendar `on_call_users` and finite events with `starts_at`/`ends_at`/`override` do not define a recurring rotation; all are retained individually as unsupported source evidence. Integration metadata needs non-secret `id` and `type`/`kind`; that account export shape remains unverified. No provider equivalence is claimed.

For all three sources, the existing reviewed fingerprint, bounded apply, restart, reconciliation and undo journal remain authoritative. Original rejected objects, contacts, teams, services, escalation/repeat settings, open incidents and historical timelines remain provenance-carrying source evidence; they are not live incidents or delivery. Inactive integration inventory holds only opaque foreign ID, source and kind, never a key; personal labels stay in erasable source custody. Related foreign user references are recorded in the mapping report so the existing person erasure can retire their retained source records.

No live API pull, account completeness reconciliation, phone cutover or parallel-routing rehearsal is provided. Terraform, automation actions, routed-key import, chat re-creation, email-mode rules and business services remain named unsupported objects. Checklist: finish and reconcile Opsgenie migration before **5 April 2027**. Paging stays OFF; these are unverified synthetic file-format proofs, not dated live-provider acceptance.

### Separate administrator key activation

After a reviewed import, a supported PagerDuty Events v1/v2, Opsgenie/JSM API, or Splunk REST integration has an **Activate imported integration** panel. Bind its Oncall ID and service, then supply its incumbent key in the password field. The field clears immediately; the key is never shown again or accepted from a saved file. Supplying or replacing a key leaves intake inactive. Confirm **Activate compatible intake · paging OFF** separately; a new native Oncall key is shown once alongside the now-active definition. Both credentials address the same integration. Revoke removes both verification hashes. A restore keeps the definition inactive and requires keys again. Supplying a key marks the imported object as locally edited, so undo cannot overwrite that custody decision. Unsupported kinds stay inactive. See [credential and identity assumptions](compatible-intake.md).

## Shared file door: implementation and proof limits

OC-021 and OC-022 use one server-owned source allow-list for the signed-in administrator mount (`/api/operator/import/*`) and the opted-in Business grant mount (`/api/rer/import/*`): `pagerduty`, `opsgenie`, `splunk`, `jsm` and `betterstack`. The installation owner enables or disables Business imports and permanently revokes trusted signing keys in Sign-in settings; administrators retain their own file import/history/undo access. Upload → plan → fingerprint approval → bounded apply/resume → native reconcile → newest-first undo is the common lifecycle. Preview creates custody and bookkeeping, never native objects or login/send authority. Erasure withdraws retained bundle content while keeping explicit history metadata as described in MOVE-IN.md; archive restore leaves Business imports disabled.

`tests/import-door.mjs`, extended by `tests/import-door-catchup.mjs`, exercises signed standing approval on a synthetic saved PagerDuty rota with users, schedule layers and escalation policies: replacement plus addition, native reconciliation after restart, layered newest-first undo, and preservation of a manually edited native schedule. A bounded standing plan/apply binds the same approval identity/time and admits fewer than five percent changed source records against a nonempty baseline, with no gone, rejected, unmapped or conflicting changed records. Outside-allowance, gone-source and adopted/hand-edited-target cases require a new proposal; erasure withdraws the baseline so standing approval cannot resurrect a gone native record; strict undo refuses the native edit and reconciliation reports it. Paging remains OFF, with no new paging jobs, receipts or callbacks. This extends the existing registration without adding an acceptance point or changing clause status.

These are synthetic local test-install proofs, not authorized real exports, live-account shape verification, a hosted catch-up receipt, complete incumbent migration, live API reconciliation or cutover. OC-021 remains done within its saved-file limits; OC-022 remains partial after the carried-done audit; OC-038 and OC-040 remain partial and OC-074 remains missing. The Move-in screen's reconciliation/completion work is a separate round; a public reconcile endpoint does not itself prove browser reconciliation. Large held native sets beyond this journey are unproved. No production paging or real-phone acceptance is claimed.

The five-source shared file door is implemented within documented mapping limits. Preview writes zero native objects, with custody/bookkeeping retained; complete incumbent migration and real-export acceptance remain OC-038. No real-export receipt or status promotion is claimed.

## PagerDuty account saved responses

The synthetic [account fixture](../tests/fixtures/pagerduty-account.json) uses
invented people at example.test and saved REST list/detail responses, including
pagination fields. The outer bundle and enrichment of users' contact methods,
notification rules and team members are assembled by the owner's own tooling.
Integration keys are removed before saving. This is documented-shape evidence;
it has not been verified against a live account.

Format references read on **28 October 2026**: PagerDuty's
[user](https://docs.pagerduty.com/developer/api/reference/rest/users/get-user),
[contact methods](https://docs.pagerduty.com/developer/api/reference/rest/users/get-user-contact-methods),
[notification rules](https://docs.pagerduty.com/developer/api/reference/rest/users/get-user-notification-rules),
[service and integrations](https://docs.pagerduty.com/developer/api/reference/rest/services/get-service),
[team](https://docs.pagerduty.com/developer/api/reference/rest/teams/get-team),
[incidents](https://docs.pagerduty.com/developer/api/reference/rest/incidents/list-incidents),
[maintenance windows](https://docs.pagerduty.com/developer/api/reference/rest/maintenance-windows/list-maintenance-windows),
[business service](https://docs.pagerduty.com/developer/api/reference/rest/business-services/get-business-service),
[orchestration lists](https://docs.pagerduty.com/developer/api/reference/rest/event-orchestrations/list-event-orchestrations),
[orchestration detail](https://docs.pagerduty.com/developer/api/reference/rest/event-orchestrations/get-orchestration),
[router](https://docs.pagerduty.com/developer/api/reference/rest/event-orchestrations/get-orch-path-router)
and [dynamic router rule](https://docs.pagerduty.com/developer/api/reference/rest/event-orchestrations/update-orch-path-router)
references. The shipped exporter and in-app read still collect only users,
schedules, overrides and escalation policies (with schedule comparison timelines);
they do not collect the whole account. No OAuth scope is widened here.

The saved-file reader accepts list pages and single-detail wrappers for `users`,
`schedules`, `overrides`, `escalation_policies`, `services`, `integrations`,
`teams`, `incidents`, `maintenance_windows`, `business_services` and
`event_orchestrations` (the `orchestrations` list, `orchestration` detail,
or the router's `orchestration_path` detail).
Keep every page in the bundle. An override list must carry its `schedule_id`
when more than one schedule is present. The reader inventories each service's
embedded integration separately, at its original pointer; the service remains
one source record. The unchanged limits are 512 KiB and 500 records, counting
those integrations. Nothing is truncated. Narrow an export that exceeds either
limit. Duplicate IDs within a kind, Opsgenie `data` envelopes selected as
PagerDuty, and account objects with missing referenced users, policies, teams,
schedules or services refuse the file. Include the missing details or correct
the reference and preview again. Schedule-only files from the unchanged
four-category exporter retain user team references as notes without requiring
a team collection. Strict schedule and policy conversion refusals remain as
described above.

Each source record has one review entry and one exclusive disposition: mapped,
mapped with differences (including retained source evidence), or rejected. The
owner door returns their disjoint `classification` counts, which sum to
`summary.sourceRecords`; the screen's existing direct-mapping and field-note
counts overlap, as its explanation says. Reconciliation accounts for both
present objects and explained source-only records.

- Phone and SMS details compose E.164 from an integer `country_code` and national
  `address` digits. A shared phone/SMS number becomes one unverified contact.
  Missing details, a trunk prefix, formatting or non-numeric values are named
  individually, with no guessed number. Every imported number remains unlisted
  for paging until country coverage and OC-026/OC-066 verification establish
  coverage; it does not satisfy two-route coverage. Email, push, notification
  rules and their delivery settings remain notes, with no delivery.
- Events v1, Events v2 and generic Events API integrations become inactive,
  keyless inventory bound to the **source** service identity. The file cannot
  supply a key. Email integrations are named for OC-070 and OC-038's inherited
  email import duty. Vendor-hosted integrations such as Datadog, CloudWatch and
  Grafana are named for re-creation as the matching Oncall source or generic
  webhook. Unsupported integrations retain their original settings.
- Services remain source evidence. Grouping, urgency, support hours, auto-resolve
  and acknowledgment timeouts, policy and team references are each named as
  unconverted. No native service is created; schedule adoption still requires
  an administrator's explicit choice of an existing service.
- Teams (OC-023), business services (OC-061), maintenance windows (OC-043) and
  orchestration routers (OC-072 routed keys) are named refusals with their
  original source kept. Each router rule, dynamic rule and catch-all is listed
  individually as not converted. No routed key is created or activated.
- Triggered and acknowledged incidents are refused individually as live imports:
  no timeline, delivery or state change is created. Resolved incidents remain
  counted source evidence. Imported history never counts as live delivery.

Apply requires the reviewed fingerprint and retains paused, non-paging,
non-login data. Identical bytes reuse the applied plan; an explicit catch-up
of those bytes proposes zero changes. A changed file
adds new objects and replaces unchanged imported targets; it names native edits
as conflicts and lists missing source objects without deleting them. The
existing strict undo refuses before changing anything when an affected imported
target has a native edit. Restart between bounded apply steps resumes from the
committed prefix; an uncertain interrupted publication still follows the
existing failed-import/explicit-rollback rules. Related people in retained and
rejected PagerDuty records, including opaque user references and imported
numbers, participate in the existing person-erasure flow.
