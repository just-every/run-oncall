# Schedules and hand-overs

A schedule says who is on call for one service, in two rotations: **primary** and **backup**. Oncall shows who is on now and when the next hand-over happens, in the schedule's own time zone.

Open **Schedules** in the app. An admin creates and edits schedules; everyone else can read them.

## Set the rotation

Press **New schedule** and fill in:

- **Schedule ID** and **Schedule name**: the ID is permanent, the name is what people read.
- **Service**: the service this rota covers. Add the service first under **Services** if it is not there yet.
- **Timezone (IANA)**: a named zone such as `Europe/London` or `America/New_York`, so hand-overs follow the local clock.
- **Valid from (UTC)** and, if the schedule ends, **Valid until (UTC, optional)**.

Validity bounds take ISO 8601 UTC timestamps, such as `2026-10-15T07:00:00.000Z`. Override and coverage-preview date/time controls also use UTC, regardless of your device timezone; seconds and milliseconds are preserved.

Then set each rotation:

1. **Rotation anchor (local)**: the local date and time of the first hand-over, for example Monday 09:00. Enter the date and time on a clock in the schedule’s named zone. Hand-overs follow that zone through daylight-saving changes.
2. **Interval (calendar days)**: how long each turn lasts, from 1 to 366 days. Seven days means a weekly rota.
3. **Responders (in order)**: add people with **Add primary responder** or **Add backup responder** and put them in order with the arrows.

Press **Save schedule** to create a schedule. For an existing schedule, the same button opens **Review schedule changes** using the **Preview from/to (UTC)** range. Review each previous and proposed holder, the rule that wins, every new gap and every previously uncovered interval that becomes covered. Clock transitions in the old and proposed named zones show their UTC instants and offsets. Check **I reviewed these assignments and gaps**, then press **Apply reviewed change**.

Confirmation binds the complete proposal and evaluated range to the schedule revision and current membership snapshot. If a schedule or workspace changes, review again; an old confirmation cannot overwrite it. The preview covers at most 31 elapsed days, and states its range explicitly. It does not claim coverage outside that range. The unchanged ordinary override API remains an explicit administrator operation. No timer or delivery is created.

A rotation with no responders is shown as a gap in coverage, never filled in silently. A person who leaves the team or becomes a viewer keeps their place in the order, and their turn shows as uncovered until you change it.

## Hand-overs and clock changes

Hand-overs happen at the same local time on the clock, not after a fixed number of hours. A daily 09:00 hand-over in London stays at 09:00 when the clocks go back, so that one turn is 25 hours long.

Twice a year a local time either repeats or does not exist. For the repeated hour, **Repeated time handling** chooses the **Earlier occurrence**, the **Later occurrence**, or **Reject**. A hand-over at a time that does not exist, or that you chose to reject, leaves the turns on either side visibly uncovered instead of guessing.

## Coverage review limits

The reviewed editor supports the existing primary/backup rotations and UTC overrides. Follow-the-sun layers, selected holiday calendars, stored PTO and ICS PTO upload are not implemented. Google/Outlook consent-based PTO import, verified route counts, degraded-route flags and a real-phone handoff also remain unobserved. US fall back in 2026 occurs on 1 November; London changes on 25 October.

## Swaps and cover

To cover a few hours or days without touching the rotation, use **UTC override intervals** and press **Add interval**. Choose the role (primary or backup), the person, and the start and end in UTC. The start is included and the end is not, so one cover can end exactly when the next begins. Two covers for the same role cannot overlap. Choosing **Explicit coverage gap** as the responder leaves that time deliberately empty.

In **Shift coordination**, a current holder can request one named substitute for a future UTC interval of up to 31 days. Only the substitute accepts or declines. An administrator must approve first by default; **Settings → Swap approval** can select substitute acceptance without a second administrator decision. Acceptance checks the latest schedule, creates one override and refuses a new gap or overlap, including a change to the other role. Of competing accepts, one succeeds. The requester can cancel. Undecided requests show as **overdue** after their start and never resolve themselves.

Schedule and override changes retain one **recorded obligation** for each affected configured responder and service owner. Without a verified channel it says **not deliverable**. Nothing is sent. **Settings → Reminder lead minutes / Reminder channel** saves your personal preference and shows a due time labelled **not sent (no timer)**. Team-manager rules and native mobile actions remain unbuilt.

## Who is on now and next

**On call now and next** shows, for primary and backup, who is on now, who is next and the exact time of the next hand-over. **Preview coverage** shows every resolved window between two times you choose, with an explanation for each gap. Neither starts a timer or sends anything.

If both roles land on the same person at once, primary stays and backup shows as unavailable.

## Your calendar

**Open private ICS feed (next 7 days)** downloads the next week of shifts, primary and backup separately, with the same hand-over times as the app. The download uses your own sign-in.

For a recurring feed, use **Shift coordination → Settings → Create calendar subscription**. Choose the selected schedule, its service, or only your own shifts. Copy the private URL when it appears: it is shown once and can be dismissed. Anyone holding it can read that scope's next 31 days of schedule windows, so keep it private. The feed omits responder contacts, alert content and credentials. Only the token hash is stored; the URL cannot be recovered later.

You or a workspace administrator can revoke a subscription. The next read is refused immediately, while shift assignments and historical decisions stay unchanged. Up to 20 subscription records are retained per member, including revoked records. Restored subscription records are inactive and their hashes are cleared; create a new subscription when capacity permits. Google Calendar/Outlook viewing is still pending dated owner-role evidence; no real-provider viewing claim is made.

## Escalation policy as data

**Escalation policy as data** stores how long to wait for the primary before the backup, as a record your team can read. Oncall never pages from it: see [What Oncall does not do](limits.md).

Machine API schedule publication and explicit import adoption record the same schedule-change obligations atomically. The machine client remains the recorded creator and permanent audit actor; adoption records the current administrator. Neither path sends a notice.
