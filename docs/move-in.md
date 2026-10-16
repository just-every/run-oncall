# Move in from Opsgenie or PagerDuty

You can bring your rota across from Opsgenie or PagerDuty without connecting Oncall to either of them. You save export files yourself, Oncall reads those files, and you review what it understood before anything is kept. It asks for no API key, makes no request to Opsgenie or PagerDuty and changes nothing there.

Only an admin can use the **Move-in kit**, the screen with the arrows icon in the app. Your pager stays in charge of waking people up: everything you move in arrives **paused**, and paging stays off.

## Save your exports

The **Source** selector on Move-in kit shows **How to export from Opsgenie** or **How to export from PagerDuty**. Expand it for the complete preparation steps on that page, including provider links and a bundle structure. Oncall accepts a JSON bundle of API response bodies; a calendar (.ics) or CSV download does not contain the rotation settings it needs.

Use an API client to make the GET requests below: set the base URL and request headers, append each path, send the request, and save each successful JSON response **body** as a private `.json` file. Do not save request headers or credentials in your export. If the response is 401 or 403, ask your provider administrator to check access; do not bundle error responses.

### Opsgenie

Ask your Opsgenie administrator for an [API integration key](https://docs.opsgenie.com/docs/api-integration) with configuration access. In [access settings](https://docs.opsgenie.com/docs/api-access-management), select **Limit to Read-Only Access** and leave **Restrict Access to Configurations** unselected.

Set the base URL to `https://api.opsgenie.com`, or `https://api.eu.opsgenie.com` for an EU account. Add the header `Authorization: GenieKey YOUR_API_KEY`, replacing the placeholder privately in your API client.

| Save under | GET path | What to keep |
| --- | --- | --- |
| `users` | `/v2/users?limit=100&offset=0` | Every referenced person's ID, username/email and name. [User API](https://docs.opsgenie.com/docs/user-api). |
| `schedules` | `/v2/schedules?expand=rotation` | Expanded rotations. If absent, use `/v2/schedules/SCHEDULE_ID` for each schedule instead. Copy each schedule's `id` for the following requests. [Schedule API](https://docs.opsgenie.com/docs/schedule-api). |
| `overrides` | `/v2/schedules/SCHEDULE_ID/overrides` | Repeat per schedule, replacing SCHEDULE_ID with its ID. Add `"scheduleId": "SCHEDULE_ID",` immediately after the saved response's opening `{`, using its actual ID, and leave `data` unchanged. [Override API](https://docs.opsgenie.com/docs/schedule-override-api). |
| `escalations` | `/v2/escalations` | Rules and recipients. [Escalation API](https://docs.opsgenie.com/docs/escalation-api). |
| `timelines` (optional) | `/v2/schedules/SCHEDULE_ID/timeline?interval=2&intervalUnit=weeks` | Repeat per schedule. Keep `_parent`, dates and `finalTimeline`. The window starts now; set `date` to an ISO timestamp for another window. [Timeline reference](https://docs.opsgenie.com/docs/schedule-api). |

For paginated lists, follow `paging.next` or the `X-Paging-Next` response header and save every page until no next page remains. See [Opsgenie pagination](https://docs.opsgenie.com/docs/pagination).

### PagerDuty

Ask your administrator for a read-only **REST API** key. In PagerDuty, open **Integrations → API Access Keys** (under Developer Tools), choose **Create New API Key**, enter a description, select **Read-only API Key**, and create it. See [API access keys](https://support.pagerduty.com/main/docs/api-access-keys). A service's Events API key cannot read these settings.

Set the base URL to `https://api.pagerduty.com`. Add `Authorization: Token token=YOUR_API_KEY` and `Accept: application/vnd.pagerduty+json;version=2` as request headers, replacing the key placeholder privately in the client.

Choose the period for coverage comparison and overrides. Replace SINCE and UNTIL below with ISO timestamps, for example `2026-10-16T00:00:00Z` and `2026-11-16T00:00:00Z`; URL-encode query values in the client. For a schedule in a zone with clock changes, include a clock change in the window: matching final coverage across it is required for import.

| Save under | GET path | What to keep |
| --- | --- | --- |
| `users` | `/users?limit=100&offset=0` | All pages, including every referenced person's email. [List users](https://docs.pagerduty.com/developer/api/reference/rest/users/list-users). |
| Use only to find IDs | `/schedules?limit=100&offset=0` | Read all pages; request each detail below rather than bundling this list as well. [List schedules](https://docs.pagerduty.com/developer/api/reference/rest/schedules/list-schedules). |
| `schedules` | `/schedules/SCHEDULE_ID?since=SINCE&until=UNTIL` | Repeat per actual schedule ID. Keep `schedule_layers` and `final_schedule` in the whole response. [Schedule detail](https://docs.pagerduty.com/developer/api/reference/rest/schedules/get-schedule). |
| `overrides` | `/schedules/SCHEDULE_ID/overrides?since=SINCE&until=UNTIL&overflow=true` | Repeat per schedule and use the same window. Add `"schedule_id": "SCHEDULE_ID",` after the response's opening `{`, using its actual schedule ID; leave `overrides` unchanged. `overflow=true` preserves full interval boundaries. Overrides outside this window are not included. [List overrides](https://docs.pagerduty.com/developer/api/reference/rest/schedules/list-schedule-overrides). |
| `escalation_policies` | `/escalation_policies?limit=100&offset=0` | All pages, retaining `escalation_rules`. [List policies](https://docs.pagerduty.com/developer/api/reference/rest/escalation-policies/list-escalation-policies). |

If a list response has `more: true`, repeat with `offset` increased by the returned `limit`. Save each page until `more: false`.

### Assemble one JSON file

Create a plain-text file named `opsgenie-export.json` or `pagerduty-export.json`. Start with the matching structure below. Inside each empty array paste the **entire response body**, including its outer braces. Separate multiple response bodies (pages or schedules) with commas. These entries are JSON objects, not filenames or quoted JSON strings. Leave an array empty only if there are no records, or for the optional Opsgenie timeline.

Opsgenie:

```json
{
  "users": [],
  "schedules": [],
  "overrides": [],
  "escalations": [],
  "timelines": []
}
```

PagerDuty:

```json
{
  "users": [],
  "schedules": [],
  "overrides": [],
  "escalation_policies": []
}
```

Keep each record once. For schedules, use expanded lists or individual details, never both for the same record. Keep the provider's response envelopes (`data` for Opsgenie; `users`, `schedule`, `overrides`, etc. for PagerDuty). Each bundle entry also accepts a single saved response or a direct record list. A [sanitized Opsgenie fixture](https://github.com/just-every/run-oncall/blob/main/tests/fixtures/opsgenie.json) illustrates the format with invented test people; it is not a customer export.

Override lists do not identify their schedule: the extra `scheduleId` or `schedule_id` field joins each saved list to its schedule. If the bundle holds only one schedule, the field may be omitted. With multiple schedules and no ID, the overrides and every schedule they could change are refused by name.

Timelines and PagerDuty's `final_schedule` let Oncall compare its result with the source within the saved window. They do not establish coverage outside it. People are matched by email; a rotation or override naming someone absent from `users` is rejected.

Leave keys, tokens, routing or integration keys, webhook URLs and calendar URLs out of the file. A credential-bearing field anywhere refuses the whole file and names the field. The file can be up to 500 KB and 500 objects. It holds names and email addresses, so keep it private.

## Preview, then import

1. Open **Move-in kit** and choose **Opsgenie** or **PagerDuty** under **Source**.
2. Choose your file under **Export JSON**.
3. Press **Preview import**. This is a dry run: it writes nothing, however often you press it.
4. Read the **Compatibility review**. It counts what mapped, what was rejected and what came across with differences, then lists every object with its reason. Nothing is skipped quietly.
5. If you are happy, press **Confirm paused import**. Oncall applies exactly the preview you reviewed, so if you pick a different file you preview again first.

The people, schedules and escalation policies land in **Paused imported data**. They do not get a sign-in or page anyone. Schedules stay out of live coverage until you explicitly adopt them below. If the import is interrupted, choose it under **Saved import journal** and press **Resume import**.

## Make an imported schedule live

After the import has completed:

1. Under **Paused imported data**, press **Make schedule live** beside the schedule.
2. Choose a service already in this workspace. Create it under **Services** first if needed.
3. Match every imported person to a different, active responder or admin in this workspace. Create missing members under **Team** first. Oncall does not guess identities from names or grant access to imported people.
4. Review those mappings and press **Confirm live schedule · paging OFF**.
5. Open **Schedules**. The adopted rotation and its overrides now appear there, including now/next and the private calendar. Check the coverage and add a backup if needed.

Adoption preserves the source timezone, calendar hand-overs, validity and overrides. It refuses incomplete imports, missing or erased people, stale revisions, duplicate person mappings and schedule ID collisions. A concurrent member change, undo or erasure stops the write; reload and review again. Imported policies remain paused and paging stays off.

Adoption is a native edit. Once a schedule is live, **Undo this import** refuses with `NATIVE_EDIT_CONFLICT` ("made live, so this import can no longer be undone") and keeps the adopted schedule and the import. Edit the schedule under **Schedules**. Erasing an imported person affects the paused import and its journal, not the workspace members or the adopted native schedule; manage those separately.

## What the preview checks

If you supplied a final timeline, Oncall compares it with its own answer at every hand-over, inside the window the timeline covers. The result says the two agree in that window, lists each difference, or says no timeline was supplied and so nothing is claimed.

An agreement is only about that window. It does not promise the next clock change, schedule edits you make later, or that anyone was actually reached.

## Undo

Press **Undo this import** on an import in the journal to reverse it. Oncall removes what that import added and puts back what was there before. If anything it added has been changed since, Oncall keeps your change, stops with a conflict named `NATIVE_EDIT_CONFLICT` rather than overwrite it. The file you supplied stays in the journal as a record.

## Erase a person

Under **Paused imported data**, press **Erase person** beside someone you imported, type `erase` followed by their exact email, and press **Erase permanently**. Oncall removes that paused person, leaves their slots in imported rotations as explicit gaps, and erases them from the import journal. Every export made before the erasure is refused whole if you try to bring it back in. Imports that named them can no longer be undone, and anything still waiting in an import that names them is never brought in. The answer shows a receipt number, and says so if a member of your workspace shares the email; that member is not changed.

People are matched by their exact email, so someone whose address merely contains theirs is left alone.

## What comes across

- **Opsgenie:** a schedule with one daily or weekly rotation of individual people, a hand-over at an exact calendar minute and no time restrictions.
- **PagerDuty:** a schedule with one current layer whose turns are whole days. Layers that ended before it began are kept as named history in the review, never as coverage. A layer in UTC maps directly; a layer in a zone with clock changes (for example America/New_York) maps only when its `final_schedule` agrees with Oncall's answer across a clock change, and otherwise is rejected with the first instant they differ.
- **Overrides:** one person each, not overlapping.
- **Escalation policies:** one or two steps, each handing to a single schedule after an ordinary "if not acknowledged" delay in minutes, with no repeats. A first step with an immediate (0-minute) notification maps to **1 minute** in the paused policy. The preview explicitly flags this timing change as non-equivalent; the original stays in the journal. No policy is activated. Later steps must wait at least 1 minute.

Oncall keeps the primary rotation. The backup is shown as an explicit gap, because a single source rotation is never relabelled as backup. See [Schedules and hand-overs](schedules.md) to add one.

## What stays different

Apart from the explicitly flagged 0-to-1-minute first-step mapping above, unsupported behavior is named in the preview rather than approximated. A schedule or policy with any of them is rejected whole, and the reason is listed:

- turns shorter than a day, and PagerDuty schedules outside UTC without a timeline that shows they agree across a clock change
- disabled Opsgenie schedules, since they put no one on call
- two layers active together, a layer still running when its replacement starts later, nested schedules, teams, and empty slots
- overrides with more than one person, and time restrictions
- policies with more than two steps, zero-minute later steps, repeats, other conditions, several people at once, or a person instead of a schedule
- any rotation or rule field Oncall does not know

Some things are not moved at all: notification rules (kept as notes only, never switched on), routes and event rules, maintenance windows, and incident history.

## Before you trust it

Oncall has been checked against sample files built from the documented Opsgenie and PagerDuty response shapes, not yet against real customer exports. Run it beside your pager for a week or two and compare, and keep your own export as the record. Moving your data out and in again is covered in [Export and restore](data.md), and what Oncall leaves alone is in [What Oncall does not do](limits.md).

Format references, read on 13 October 2026: Opsgenie's [Schedule API](https://docs.opsgenie.com/docs/schedule-api), [Schedule Override API](https://docs.opsgenie.com/docs/schedule-override-api) and [Escalation API](https://docs.opsgenie.com/docs/escalation-api); PagerDuty's [detailed schedule](https://docs.pagerduty.com/developer/api/reference/rest/schedules/get-schedule), [schedule overrides](https://docs.pagerduty.com/developer/api/reference/rest/schedules/list-schedule-overrides) and [escalation policy](https://docs.pagerduty.com/developer/api/reference/rest/escalation-policies/get-escalation-policy) references.
