# Move in from Opsgenie or PagerDuty

You can bring your rota across from Opsgenie or PagerDuty without connecting Oncall to either of them. You save export files yourself, Oncall reads those files, and you review what it understood before anything is kept. It asks for no API key, makes no request to Opsgenie or PagerDuty and changes nothing there.

Only an admin can use the **Move-in kit**, the screen with the arrows icon in the app. Your pager stays in charge of waking people up: everything you move in arrives **paused**, and paging stays off.

## Save your exports

Oncall reads one JSON file. It is an object with one entry per kind of data, and each entry is either a list or the response the service gave you (the one with a `data` field). Both work.

A [sanitized example Opsgenie bundle](https://github.com/just-every/run-oncall/blob/main/tests/fixtures/opsgenie.json) shows the file structure. Replace its sample records with your own saved responses.

**From Opsgenie**, save these under these names:

- `users`
- `schedules`, with the rotations expanded (or save each schedule's detail response)
- `overrides`, with the schedule's ID added as `scheduleId` beside `data`, because Opsgenie's override list does not say which schedule it belongs to. If the file holds only one schedule you can leave it out; with several schedules and no ID, the overrides and every schedule they could change are refused by name.
- `escalations`
- `timelines`, the final schedule timelines, as Opsgenie returned them

**From PagerDuty**, save these:

- `users`
- `schedules`, each one as the detailed schedule that includes its `schedule_layers`. The list response alone is not enough if it leaves the layers out.
- `overrides`, with the schedule's ID added as `schedule_id` beside `overrides` (the same rule as Opsgenie when it is left out)
- `escalation_policies`

Timelines are optional, and so is the `final_schedule` inside a PagerDuty schedule. They let Oncall check its answer against yours, which is worth doing (see below).

People are matched by email address. A rotation or override that names someone who is not in your `users` is rejected, never filled in with a guess.

Leave keys, tokens, routing or integration keys, webhook URLs and calendar URLs out of the file. If any appears anywhere in it, Oncall refuses the whole file and names the field.

The file can be up to 500 KB and 500 objects. It will hold your people's names and email addresses, so keep it private.

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

Adoption is a native edit. **Undo this import** subsequently refuses with `NATIVE_EDIT_CONFLICT` and keeps the adopted schedule and the import. Edit the schedule under **Schedules**. Erasing an imported person affects the paused import and its journal, not the workspace members or the adopted native schedule; manage those separately.

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
