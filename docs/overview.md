# Overview

Oncall keeps your team's rota in one calm place: who is on call now, who is next, and exactly when they hand over. It also gives you a shared room for incidents, so the people on call can coordinate, write down what they decided and follow up afterwards.

Oncall is 100% free and open source under the MIT license. You run it yourself, and your data stays in your own installation.

## What it keeps

- **Schedules.** A primary and a backup rotation for each service, in the schedule's own time zone, with hand-overs at a set local time. Swaps cover a few hours without touching the rotation. See [Schedules and hand-overs](schedules.md).
- **Now and next.** For each role, who is on call now, who takes over next and when. Your shifts can go into your own calendar through a private feed.
- **Incidents.** Declare one, follow its runbook, add timeline notes, move it from declared to resolved, and give every follow-up an owner and a due date. See [Incidents and alerts](incidents.md).
- **Alerts and events.** Signals from your monitoring stay separate from incidents, so a noisy alert never declares an incident on its own.
- **Your team.** Admins, responders and viewers, each with what they need and no more. See [Team and sign-in](team.md).

## Beside your pager

Oncall does not page, call or text anyone. Your existing pager stays in charge of waking people up, and Oncall keeps the rota, the hand-overs and the coordination around it. The app says so at the top of every screen: *Existing pager authoritative · paging OFF*. [What Oncall does not do](limits.md) lists the rest plainly.

If your rota lives in Opsgenie or PagerDuty today, you can bring it across from saved export files. See [Move in from Opsgenie or PagerDuty](move-in.md).

## Where to go next

1. [Getting started](getting-started.md) Oncall on your own computer, or [host coordination for your team](getting-started.md#host-for-your-team) in your own Cloudflare account.
2. [Sign in](team.md) and finish setup as the owner.
3. Add a service, then [set the rotation](schedules.md#set-the-rotation).
4. Add your team and decide who can change what.
