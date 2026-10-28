# Team and sign-in

## Signing in

The owner signs in with their email address. On the sign-in page, enter it and press **Email a sign-in link**, then open the link on the same device and press **Confirm**. A link works once and expires after 15 minutes. Local `rer dev` prints a private `RER_OPEN` owner entry; first launch confirms the read-only owner at `/setup`, then opens the app directly. Ordinary `/signin` email sign-in has no sender configured by default and sends only through a configured remote mail provider with real credentials (see [Getting started](getting-started.md#sign-in-emails-on-your-computer)). The app does not capture mail or print sign-in tokens. Hosted release 1 also uses this email-link flow: deployment claims the configured owner automatically, and a configured remote mail provider is required. The local `RER_OPEN` entry does not sign you in to the hosted app.

The first time the owner signs in, Oncall asks them to **Finish setup** before anything else.

On local and hosted apps, team members created by an admin sign in at **Sign in with a workspace password** (`/signin/local`), linked from the sign-in page, with the workspace name and password the admin gave them. These credentials belong to this installation. Only anonymous first-admin bootstrap is restricted to the local loopback app; the configured owner uses the email-link flow above.

## Roles

Open **Team** to see everyone with access. Each person has one role:

- **Viewer** reads everything in the workspace: incidents, schedules, services and reviews.
- **Responder** also coordinates: declares incidents, adds timeline notes, moves incidents on and owns follow-ups.
- **Admin** also manages services, routing rules, schedules, the team, move-in and the archive.

Roles are checked on every request, so a change takes effect on the next thing that person does. The workspace always keeps at least one active admin.

## Add someone

An admin fills in **Add local member** with the person's **Name**, a **Role** and an **Initial local password** of at least 12 characters, then presses **Create member** and shares the password with them directly. Oncall sends no invitations. Here, **local** means credentials stored in this Oncall installation, including when you host it for your team; it does not mean sign-in is limited to the same computer.

To change someone's access later, use **Update access** on their card. **Reset local password** sets a new password and signs them out everywhere.

Being on the team does not put anyone on call: that is the [schedule's](schedules.md) job.

Stakeholders are a separate, admin-assigned local member role. They can read only the internal status panel and subscribe themselves to a business service whose explicit audience includes them; all incident, alert, runbook, contact, schedule, audit and archive doors refuse their session. Admins and active communications owners can subscribe eligible users. SSO/SCIM assignment and private-team scope are not implemented. Restoring an archive keeps stakeholder identities inactive until an admin explicitly reauthorizes them.
