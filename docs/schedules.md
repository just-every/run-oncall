# Schedules and hand-overs

A schedule says who is on call for one service, in two rotations: **primary** and **backup**. Oncall shows who is on now and when the next hand-over happens, in the schedule's own time zone.

Open **Schedules** in the app. An admin creates and edits schedules; everyone else can read them.

## Set the rotation

Press **New schedule** and fill in:

- **Schedule ID** and **Schedule name**: the ID is permanent, the name is what people read.
- **Service**: the service this rota covers. Add the service first under **Services** if it is not there yet.
- **Timezone (IANA)**: a named zone such as `Europe/London` or `America/New_York`, so hand-overs follow the local clock.
- **Valid from (UTC)** and, if the schedule ends, **Valid until (UTC, optional)**.

Then set each rotation:

1. **Rotation anchor (local)**: the local date and time of the first hand-over, for example Monday 09:00.
2. **Interval (calendar days)**: how long each turn lasts, from 1 to 366 days. Seven days means a weekly rota.
3. **Responders (in order)**: add people with **Add primary responder** or **Add backup responder** and put them in order with the arrows.

Press **Save schedule**. Each save is a new revision, so an old edit can never overwrite a newer one: if someone saved in the meantime, Oncall asks you to reload the saved version first.

A rotation with no responders is shown as a gap in coverage, never filled in silently. A person who leaves the team or becomes a viewer keeps their place in the order, and their turn shows as uncovered until you change it.

## Hand-overs and clock changes

Hand-overs happen at the same local time on the clock, not after a fixed number of hours. A daily 09:00 hand-over in London stays at 09:00 when the clocks go back, so that one turn is 25 hours long.

Twice a year a local time either repeats or does not exist. For the repeated hour, **Repeated time handling** chooses the **Earlier occurrence**, the **Later occurrence**, or **Reject**. A hand-over at a time that does not exist, or that you chose to reject, leaves the turns on either side visibly uncovered instead of guessing.

## Swaps and cover

To cover a few hours or days without touching the rotation, use **UTC override intervals** and press **Add interval**. Choose the role (primary or backup), the person, and the start and end in UTC. The start is included and the end is not, so one cover can end exactly when the next begins. Two covers for the same role cannot overlap. Choosing **Explicit coverage gap** as the responder leaves that time deliberately empty.

## Who is on now and next

**On call now and next** shows, for primary and backup, who is on now, who is next and the exact time of the next hand-over. **Preview coverage** shows every resolved window between two times you choose, with an explanation for each gap. Neither starts a timer or sends anything.

If both roles land on the same person at once, primary stays and backup shows as unavailable.

## Your calendar

**Open private ICS feed (next 7 days)** downloads the next week of shifts, primary and backup separately, with the same hand-over times as the app. The download uses your own sign-in, so the file is private to you; there is no public calendar link to leak.

## Escalation policy as data

**Escalation policy as data** stores how long to wait for the primary before the backup, as a record your team can read. Oncall never pages from it: see [What Oncall does not do](limits.md).
