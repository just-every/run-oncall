# Team and sign-in

## Signing in

The owner signs in with their email address. On the sign-in page, enter it and press **Email a sign-in link**, then open the link on the same device and press **Confirm**. A link works once and expires after 15 minutes. Local `rer dev` prints a private `RER_OPEN` owner entry; first launch confirms the read-only owner at `/setup`, then opens the app directly. Ordinary `/signin` email sign-in has no sender configured by default and sends only through a configured remote mail provider with real credentials (see [Install and run](install.md#sign-in-emails-on-your-computer)). The app does not capture mail or print sign-in tokens.

The first time the owner signs in, Oncall asks them to **Finish setup** before anything else.

Teams that use workspace names and passwords sign in at **Sign in with a workspace password**, linked from the sign-in page, with the name and password an admin gave them.

## Roles

Open **Team** to see everyone with access. Each person has one role:

- **Viewer** reads everything in the workspace: incidents, schedules, services and reviews.
- **Responder** also coordinates: declares incidents, adds timeline notes, moves incidents on and owns follow-ups.
- **Admin** also manages services, routing rules, schedules, the team, move-in and the archive.

Roles are checked on every request, so a change takes effect on the next thing that person does. The workspace always keeps at least one active admin.

## Add someone

An admin fills in **Add local member** with the person's **Name**, a **Role** and an **Initial local password** of at least 12 characters, then presses **Create member** and shares the password with them directly. Oncall sends no invitations.

To change someone's access later, use **Update access** on their card. **Reset local password** sets a new password and signs them out everywhere.

Being on the team does not put anyone on call: that is the [schedule's](schedules.md) job.
