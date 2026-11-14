# Schedules and hand-overs

A schedule says who is on call for one service, in two rotations: **primary** and **backup**. Oncall shows who is on now and when the next hand-over happens, in the schedule's own time zone.

Open **On call** in the app. Workspace administrators and the service's team managers can create and edit rotas. Other permitted team members can read coverage; an active responder can manage their own PTO on their team's rota.

## Set the rotation

Choose **New rota** and follow the four steps:

1. **Service and name**: enter the **Rota name** and select the **Service** if there is more than one. Add a missing service under **Settings → Services** first. Oncall assigns the permanent rota ID.
2. **Who is on, in order**: select the primary people and use **Add person**, the up/down arrows or **Remove person** to arrange them. Backup follows the next primary person by default. Open **Different backup order** to choose it separately with **Add backup person**. Add a second person for backup cover when there is only one primary.
3. **Hand-over**: choose **Time zone**, **Starts**, **Every**, **On** and **At**. A named IANA zone such as `Europe/London` keeps hand-overs on that local clock through daylight-saving changes. **Starts** and **At** set the first hand-over and the rota's start in that zone. **Every → Number of days** accepts 1–366 calendar days.
4. **Check**: review the people, rhythm and coverage preview. Set **Ends (optional)** if the rota should finish; the date ends coverage at the hand-over time in the rota's zone. On a phone, expand **Preview coverage** to inspect the spans. Choose **Create rota** to save.

For an existing rota, open it from **On call** and choose **Edit rota**. Make your changes through the same steps, then choose **Review change**. **Review schedule changes** shows each previous and proposed holder, the winning rule, every new gap and previously uncovered interval that becomes covered. Clock transitions in the old and proposed named zones show their UTC instants and offsets. Check **I reviewed these assignments and gaps**, then choose **Apply reviewed change**.

Confirmation binds the complete proposal and evaluated range to the schedule revision and current membership snapshot. If a schedule or workspace changes, review again; an old confirmation cannot overwrite it. The preview covers at most 366 elapsed days, and states its range explicitly. It does not claim coverage outside that range. The unchanged ordinary override API remains an explicit administrator operation. No timer or delivery is created.

A rotation with no responders is shown as a gap in coverage, never filled in silently. A person who leaves the team or becomes a viewer keeps their place in the order, and their turn shows as uncovered until you change it.

## Hand-overs and clock changes

Hand-overs happen at the same local time on the clock, not after a fixed number of hours. A daily 09:00 hand-over in London stays at 09:00 when the clocks go back, so that one turn is 25 hours long.

Twice a year a local time either repeats or does not exist. For the repeated hour, the Check step’s **Repeated hand-over hour** chooses **Earlier**, **Later**, or **Leave a gap**. A hand-over at a time that does not exist, or that you chose to reject, leaves the turns on either side visibly uncovered instead of guessing.

## Coverage review limits

The existing rota editor has a **Layers, holidays and PTO** section on its Check step. Choose **Coverage review from, UTC** and 1 through 366 elapsed days. The live preview and reviewed change use the same selected range. The API refuses a larger range with HTTP 400 naming 366 days, more than 20,000 boundaries, or a preview larger than 8 MiB or a review larger than 16 MiB; shorten the range or simplify layers. Review shows gaps first, with additional spans behind **Show more spans**. The live preview summarizes its range and shows an initial set of spans plus the gap list.

Layers are optional: documents without them keep their original primary and backup rotations. Within each role, layers are ordered. The first eligible layer wins, with its name, zone and rotation rule in the explanation. Later eligible layers are named as overridden. Daily, weekly, custom calendar-day intervals and weekday business hours use each layer’s named zone and ordered member slots. Active windows use UTC bounds. Unavailable or empty slots remain explicit gaps; they do not move the next member into the retained slot. Explicit overrides take precedence over layers. PTO can still make an override holder unavailable.

Each layer selects US federal observed holidays, company dates, both, or neither. An unselected calendar has no effect. Federal dates are computed locally, including Friday or Monday observation for fixed dates on weekends. Company dates have a name, local date, named zone and revision and are authored by an administrator. The review and permanent schedule audit accompany changes. A layer explicitly chooses whether a selected holiday leaves a gap or tries the next layer; PTO has the same separate choice. Teams select these rules; a federal holiday calendar does not define everybody’s working week.

Administrators can add stored PTO to the proposal, then review and apply it. Retained entries cannot be deleted or rewritten. Erasure severs the member reference and the editor shows Erased member; the interval and authored reason are retained. An active responder on the service’s owning team can open **Your PTO** on its rota to review and apply their own PTO, including an ICS upload. Other members’ PTO requires an administrator. Team managers retain rota-editing authority and can record their own PTO. Membership and the authenticated person are checked again when applying; revoked access or a stale review cannot write.

For ICS PTO, first apply other draft changes, choose the member, then upload a file in the same section. The upload is reviewed before it writes: added intervals and line-level refusals are shown alongside the coverage review. Apply requires explicit confirmation bound to the schedule revision and membership snapshot. The supported local subset is at most 32,768 bytes and 100 events, with VEVENT all-day dates, UTC or named TZID timestamps and folded lines. All-day entries use the schedule zone; timed entries use UTC or their named TZID. Skipped or repeated local times require UTC. Recurrence, alarms, attachments and unsupported properties are refused with their line. No URL is fetched. Google and Outlook consent-based imports remain unavailable; ICS upload is the supported route.

For a worked handoff, add London, New York and Los Angeles business-hour layers, in that order, with their respective named zones, local hours 09:00 through 17:00 and Monday through Friday selected. Give each layer a different synthetic responder. In November, London wins at 10:00 UTC, New York at 18:00 UTC and Los Angeles at 23:00 UTC. At 02:00 UTC the next day all three are off duty and the preview shows a gap. During overlaps the earlier layer wins. Select US federal holidays explicitly on the desired layers to change Thanksgiving coverage; leave the calendar unselected to retain the ordinary handoff.

Layers, company dates and PTO live in the existing schedule document and travel through schedule archives, checkpoints and portable transfer. Recovery grants no sending authority. Google and Outlook consent evidence, verified route counts, degraded-route flags and the real-phone London handoff remain unobserved. Paging stays OFF. US fall back in 2026 occurs on 1 November; London changes on 25 October.

## Swaps and cover

To cover a few hours or days without changing the rotation, open **On call → your rota → Cover a shift**. Choose **Who**, **Role**, **From** and **To**, then **Review change**. These date/time inputs use the rota's named timezone printed at the top of the dialog; they are converted to UTC for storage. For an `Australia/Brisbane` rota, enter `2026-11-14 11:00` through `18:00` for `2026-11-14T01:00:00Z` through `08:00:00Z`, even if your device uses another zone. Read the displayed zone rather than assuming UTC or the device's zone. Keep the interval inside the rota's validity. Review the assignments and gaps, check **I reviewed these assignments and gaps**, then **Apply reviewed change**. The start is included and the end is not, so one cover can end exactly when the next begins. Two covers for the same role cannot overlap. Choosing **Nobody on call** for **Who** leaves that time deliberately empty.

On the rota page, a current holder chooses **Request a swap**, selects **Shift to swap** when more than one is available, chooses a **Substitute** and presses **Request**. The selected future shift is shown in the rota’s zone and is limited to 31 days. Only the substitute accepts or declines. An administrator must approve first by default; the rota’s **Reminders and swaps → Swap approval** can select substitute acceptance without a second administrator decision. Acceptance checks the latest schedule, creates one override and refuses a new gap or overlap, including a change to the other role. Of competing accepts, one succeeds. The requester can cancel. Undecided requests show as **overdue** after their start and never resolve themselves.

Schedule and override changes retain one **recorded obligation** for each affected configured responder and service owner. Without a verified channel it says **not deliverable**. Nothing is sent. The rota’s **Reminders and swaps → Reminder lead minutes / Reminder channel** saves your personal preference and shows a due time labelled **not sent (no timer)**. Team-manager rules and native mobile actions remain unbuilt.

## Who is on now and next

**On call** shows **Now**, **Next hand-over** and **Gaps this week** beside the **This week** timeline. The gap list and timeline cover the same seven elapsed days, from one day before the observation time to six days after it, including earlier uncovered hours. Open a rota for its **Now**, **Next** and **Shifts** view. The editor’s **Preview coverage** shows the resolved windows and gaps for its displayed range. Neither starts a timer or sends anything.

If both roles land on the same person at once, primary stays and backup shows as unavailable.

## Your calendar

On the rota page, **Calendar feed → Open private ICS feed** downloads the next week of shifts, primary and backup separately, with the same hand-over times as the app. The download uses your own sign-in.

For a recurring feed, use the rota’s **Calendar feed → Calendar scope → Create link**. Choose the selected schedule, its service, or only your own shifts. Copy the private URL when it appears: it is shown once and can be dismissed. Anyone holding it can read that scope's next 31 days of schedule windows, so keep it private. The feed omits responder contacts, alert content and credentials. Only the token hash is stored; the URL cannot be recovered later.

You or a workspace administrator can revoke a subscription. The next read is refused immediately, while shift assignments and historical decisions stay unchanged. Up to 20 subscription records are retained per member, including revoked records. Restored subscription records are inactive and their hashes are cleared; create a new subscription when capacity permits. Google Calendar/Outlook viewing is still pending dated owner-role evidence; no real-provider viewing claim is made.

## Escalation policy as data

On the rota page, expand **Paging is off**. **Escalation policy as data** stores how long to wait for the primary before the backup, as a record your team can read. Oncall never pages from it: see [What Oncall does not do](limits.md).

Machine API schedule publication and explicit import adoption record the same schedule-change obligations atomically. The machine client remains the recorded creator and permanent audit actor; adoption records the current administrator. Neither path sends a notice.
