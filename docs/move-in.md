# Move in from Opsgenie or PagerDuty

You can bring your rota across from Opsgenie or PagerDuty without connecting Oncall to either of them. You save export files yourself, Oncall reads those files, and you review what it understood before anything is kept. It asks for no API key, makes no request to Opsgenie or PagerDuty and changes nothing there.

Only an admin can use the **Move-in kit**, the screen with the arrows icon in the app. Your pager stays in charge of waking people up: everything you move in arrives **paused**, and paging stays off.

## Save your export with the downloadable tool

In **Move-in kit**, choose **Opsgenie** or **PagerDuty** under **Source**, then expand **How to export from…**. That panel includes the download, runnable commands, provider key steps and troubleshooting. No API client, paging knowledge or manual JSON assembly is needed. Calendar (.ics) and CSV files do not contain the required rotation definitions.

### Prepare a read-only API key

**Opsgenie:** ask your administrator to create a separate API integration named **Oncall export**:

1. Open **Settings → Integrations → Add integration**, search for **API** and select it.
2. Enter the name and select **Continue**. Expand **Steps to configure the integration** to locate the API key.
3. In the integration's access settings, select **Limit to Read-Only Access** and leave **Restrict Access to Configurations** unselected. Save the settings, select **Turn on integration** and copy the key privately.

On plans without Settings → Integrations, start at **Teams → your team → Integrations → Add integration** and follow the same API steps. A team integration can read only schedules that team can access. Have your administrator check that the key can read all intended users, schedules, overrides and escalations. See the official [integration setup](https://support.atlassian.com/opsgenie/docs/create-a-default-api-integration/) and [access settings](https://docs.opsgenie.com/docs/api-access-management).

**PagerDuty:** ask an admin or account owner to open **Integrations → Developer Tools → API Access Keys → Create New API Key**. Enter **Oncall export** as its description, check **Read-only API Key**, and select **Create Key**. Copy the key privately before selecting **Close**; it is shown in full only once. This must be a REST API key; a service's Events API key cannot read configuration. See [PagerDuty's key instructions](https://support.pagerduty.com/main/docs/api-access-keys).

Keep the key out of commands and files. Paste it only when the exporter asks for it at its hidden terminal prompt. The exporter keeps it in memory, makes only GET requests to the selected provider region, and never sends the key to Oncall.

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

Return to **Move-in kit**, keep the matching **Source** selected, choose that file under **Export JSON**, and press **Preview import**. Export success means the file was collected; the preview decides which settings are compatible. Read every rejection, difference and coverage comparison before confirming. Ask your administrator to revoke the dedicated export key after use.

If the tool stops:

- **HTTP 401/403:** ask your administrator to check the key, account region, read permission and Opsgenie configuration access/team scope. PagerDuty Events keys do not work here.
- **HTTP 429:** wait a few minutes before running again.
- **Network, response or pagination error:** check connectivity/provider status and rerun while source settings remain unchanged. No bundle is saved for these failures; do not select a file left from an earlier run.
- **Export too large:** Oncall accepts at most **512 KiB and 500 records** (people, schedules, overrides, policies and timelines combined). The exporter stops rather than truncating. Ask your administrator for a smaller provider access scope; do not omit people referenced by rotations or overrides. A shorter comparison window may reduce timeline size.
- **Cannot find the script:** check that the terminal is in Downloads and the file is named exactly `oncall-export.mjs`. If the download has a duplicate suffix such as `(1)`, use that actual filename or rename it first.
- **Cannot save:** check the folder's write permissions and free disk space, then run again.

For operators maintaining their own export tooling, the bundle uses `users`, `schedules`, `overrides` and `escalations` plus `timelines` for Opsgenie, or `users`, `schedules`, `overrides` and `escalation_policies` for PagerDuty. Each value is a record array; saved provider response envelopes are also accepted. Each override must name its `scheduleId` (Opsgenie) or `schedule_id` (PagerDuty) when multiple schedules exist. Timelines retain `_parent.id`; PagerDuty schedule details retain `schedule_layers` and `final_schedule`. Every referenced person must appear in `users`. Credential-bearing fields anywhere refuse the file.

Exporter references checked on 16 October 2026: Opsgenie's [pagination](https://docs.opsgenie.com/docs/pagination), [schedule details and timelines](https://docs.opsgenie.com/docs/schedule-api), [overrides](https://docs.opsgenie.com/docs/schedule-override-api) and [escalations](https://docs.opsgenie.com/docs/escalation-api); PagerDuty's [pagination](https://docs.pagerduty.com/developer/pagination), [schedule details](https://docs.pagerduty.com/developer/api/reference/rest/schedules/get-schedule), [overrides](https://docs.pagerduty.com/developer/api/reference/rest/schedules/list-schedule-overrides), [policies](https://docs.pagerduty.com/developer/api/reference/rest/escalation-policies/list-escalation-policies) and [regions](https://support.pagerduty.com/main/docs/service-regions).

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
