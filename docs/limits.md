# What Oncall does not do

Oncall keeps your rota and your incident coordination. Some things it leaves to other tools on purpose, and it says so rather than pretending.

## It does not page anyone

Oncall sends no SMS, voice calls, push notifications or paging emails, and it never wakes anyone up. Your existing pager stays in charge of that. Escalation delays you save are stored as data your team can read; no timer runs from them. Any attempt to deliver a page is refused with an explanation.

## It does not decide for you

- An alert never declares an incident by itself; a responder does.
- A recovered alert never resolves an incident; resolving needs a person, a summary and recovery evidence.
- Coverage previews and the now-and-next view explain the schedule you configured. They are not proof that anyone was reached.

## It does not reach into your other accounts

Moving in from Opsgenie or PagerDuty reads export files you saved yourself. Oncall asks for no API key, makes no request to those services and turns nothing on there. Imported schedules arrive paused for you to review. See [Move in from Opsgenie or PagerDuty](move-in.md) for exactly which rota shapes come across and which are named as differences.

## It does not call AI

Nothing you write in Oncall is sent to an AI model. Local development has no mail sender configured by default. Ordinary `/signin` email sign-in sends only through a configured remote mail provider with real credentials; the app does not capture mail or print sign-in tokens. The private `RER_OPEN` owner entry printed by `rer dev` needs no email delivery.

## Hosted coordination keeps your existing pager

Run Oncall locally or host release 1 in your own Cloudflare account with `rer deploy`. It coordinates incidents alongside your existing pager with paging OFF; no independent standby is required for coordination. Release 2 paging and independent standby are not built. Hosted email-link sign-in requires a configured remote mail provider. See [Getting started](getting-started.md#host-for-your-team) for setup, deployment and removal. A local dry run does not establish hosted health or mail delivery.

## Related product boundaries

Oncall keeps incident-linked follow-ups; payroll, general work/project management and monitoring/observability are separate product boundaries. Related RunEditRun siblings are [Envelope](https://github.com/just-every/run-envelope) for the payroll boundary, [Pegboard](https://github.com/just-every/run-pegboard) for general work/project management, and [Porthole](https://github.com/just-every/run-porthole) for monitoring/observability. These links identify separate product scope; they make no capability, integration or readiness claim.

## Permanent audit and held history

[Permanent operational audit](audit.md) retains safe operation kinds, times, outcomes and permanent random labels. It is separate from incident timelines, imported records and other operational content. Removing an audit identity association does not erase all those records; their custody and erasure remain explicit and scoped.
