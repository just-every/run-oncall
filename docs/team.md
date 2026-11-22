# Team and sign-in

## Signing in

**Hosted owner.** Deployment claims the configured owner automatically. With a remote mail provider configured, enter the owner email on the sign-in page, press **Email a sign-in link**, then open the link on the same device and press **Confirm**. A link works once and expires after 15 minutes. For [hosted coordination with email off](getting-started.md#hosted-coordination-with-email-off), set `MAIL_PROVIDER=none` and run `rer signin` from the deploying checkout with the same Cloudflare credentials. Open the private link it prints and press **Confirm**. Complete **Finish setup** if shown.

**Local owner.** Open the private `RER_OPEN` link printed by `rer dev`. On first launch, choose **Finish setup** to confirm the owner details. Anonymous first-admin setup is available only on the local loopback app. See [sign-in emails on your computer](getting-started.md#sign-in-emails-on-your-computer) to configure local email delivery.

**Team members.** On local and hosted apps, team members created by an admin choose **Sign in with a workspace password** (`/signin/local`) on the sign-in page. Use the workspace name and password the admin provided for that installation.

## Roles

Open **Team** to see everyone with access. Each person has one role:

- **Viewer** reads everything in the workspace: incidents, schedules, services and reviews.
- **Responder** also coordinates: declares incidents, adds timeline notes, moves incidents on and owns follow-ups.
- **Admin** also manages services, routing rules, schedules, the team, move-in and the archive.

Roles are checked on every request, so a change takes effect on the next thing that person does. The workspace always keeps at least one active admin.

## Add someone

Under **Settings → Team**, an admin chooses **Add member**, fills in the person's **Name**, a **Role** and a **Password** of at least 12 characters, then presses **Create member** and shares the password with them directly. Oncall sends no invitations. Here, **local** means credentials stored in this Oncall installation, including when you host it for your team; it does not mean sign-in is limited to the same computer.

**Add member** opens the form above the member list and puts the cursor in **Name**. The owner can change their own name with **Edit name** on their card in **Settings → Team**, then **Save name**. Use **Member actions** on a card to revoke or restore access or reset a password; resetting ends that person's current sessions. The only active admin must make someone else an admin before changing their own role or revoking access. A refused change explains why and leaves the saved access in place; only an interrupted save keeps **Retry**. — Run Edit Run fleet, 17 November 2026.

Being on the team does not put anyone on call: that is the [schedule's](schedules.md) job.

Stakeholders are a separate, admin-assigned local member role. They can read only the internal status panel and subscribe themselves to a business service whose explicit audience includes them; all incident, alert, runbook, contact, schedule, audit and archive doors refuse their session. Admins and active communications owners can subscribe eligible users. SSO/SCIM assignment and private-team scope are not implemented. Restoring an archive keeps stakeholder identities inactive until an admin explicitly reauthorizes them.

## Contact methods and notification rules

Under **Settings → Team**, expand **Contact methods and notification rules** on a person’s card. Workspace members can read the recorded email, phone and SMS destinations, rule urgency and delay. The person and administrators can add, edit or remove them, then choose **Save notification rules**. A stale revision is refused; reload before trying again. These are unverified records: paging stays OFF and nothing is sent. Stakeholders cannot read these details.

## Import from Backstage

An administrator exports JSON from their Backstage instance’s `GET /api/catalog/entities` endpoint using the access their Backstage administrator provides. Save the response as a `.json` file or copy its JSON body. Oncall accepts an array of catalog entities or an object with an `items` array, not a `catalog-info.yaml` file or a catalog URL. Oncall reads the supplied JSON; it does not connect to Backstage.

Components match an existing Oncall service by exact `metadata.name` service ID first, otherwise by `metadata.name` or `metadata.title` against the service name after lowercasing and replacing punctuation/spaces with hyphens. `spec.owner` matches an existing active team name the same way; `group:default/payments` names the Payments team. Person owners and ambiguous or missing matches remain unresolved. Create the services and teams in Oncall before importing; no person, service or team is invented.

For example, for an existing **Receipt processing** service and active **Payments** team:

```json
{"items":[{"kind":"Component","metadata":{"name":"receipt-processing"},"spec":{"owner":"group:default/payments"}}]}
```

In **Settings → Team → Import from Backstage**, paste or upload a JSON catalog entities response and choose **Preview import**. Preview changes no durable records or permanent audit. Ownership and dependencies are reviewed independently. A Component's `spec.dependsOn` can name existing Oncall services through Component references; the importer creates no service, team or person. Catalogs allow up to 1,000 Components, each with at most 30 dependency references of up to 600 characters. The resulting dependency set also stays within 30 services.

Review the current and proposed dependencies and each original source reference. Unsupported kinds, self-references, missing matches and ambiguous matches retain their references with reasons. When any reference is unresolved, existing dependencies are kept and supported additions remain reviewable. An omitted `spec.dependsOn` leaves dependencies alone; an explicit empty list proposes removal. Hand-set dependencies require **Keep current** or **Use Backstage**; keeping current is the default. Previously imported dependencies can be updated by the next reviewed catalog.

**Apply import** saves accepted ownership, dependencies, source references, import identity and time with their audit in one transaction. A service or provenance change that affects the review requires a fresh preview; unrelated incident notes do not. A manual dependency change clears imported dependency provenance, while unrelated service edits retain it. If an answer is lost, **Retry** checks the saved dependency and ownership state before sending another Apply. Repeating an old HTTP digest is refused after a successful change; a fresh identical preview applies nothing. Both paths leave application records unchanged. Archives, checkpoints and portable restore preserve provenance and immutable handoff source snapshots; restored approvals remain held, and source drift still prevents export. None of these records grants sign-in, integration execution or paging authority.
