# Incidents and alerts

When something breaks, Oncall gives the people on call one shared place to coordinate: the incident, its runbook, every decision on its timeline and the follow-ups afterwards.

## Services first

Under **Services**, an admin adds each system your team owns with **Service name**, **Environment**, **Service owner** and its **Runbook steps (one per line)**. You can also keep a link to the service in your existing pager.

## Declare an incident

On **Incidents**, press **Declare incident** and give it an **Incident title**, the **Service**, a **Severity** (critical, warning or info) and the **Customer impact and current evidence**. Viewers can read incidents but not declare them.

The service's runbook is copied into the incident when you declare it. Editing the service later never rewrites the instructions an incident started with.

## Work the incident

- **Runbook checklist**: tick each step as it is done.
- **Evidence and decisions**: the timeline. Every change and every **Add timeline note** is kept in order with who made it. Nothing is edited or deleted afterwards.
- **Current response**: **Record transition** moves the incident on. Declared becomes acknowledged (the person acknowledging becomes incident commander), then mitigating or recovered, then resolved. Recovered needs a recovery evidence link, and resolved needs the incident to have recovered first.
- **Follow-up owners**: give each improvement action an owner and a due date. Completing one needs an evidence link.

If two people change the same incident at once, the second change is refused with a clear message instead of overwriting the first. Reload, then try again.

## Reviews

When an incident is resolved, **Reviews** keeps its postincident review (impact, contributing factors, response lessons and what to verify next) beside its open follow-ups.

## Alerts and events

**Alerts & events** collects signals from your own monitoring. An admin adds a source under **Local ingress** with a source key and the services it may report on. That key can only send signals: it cannot read anything in Oncall.

Signals are kept as they arrive, and repeats of the same alert are grouped. An alert never declares an incident on its own: a responder decides, with **Declare incident from alert**.

## Routing and replay

**Routing & replay** holds the rules that say who owns a signal: for a service and severity, route it to an owner, or suppress it with a reason. A rule for a specific severity wins over one for all severities, and every change is a new version. Suppression never deletes the signal.

**Historical vs proposed replay** compares how past signals were routed with how today's rules would route them. It only reads: nothing is created or sent.
