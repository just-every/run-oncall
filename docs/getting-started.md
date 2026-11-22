# Getting started

Oncall runs on your own computer first. Open a terminal (on a Mac, Terminal in Applications → Utilities; on Windows, your WSL2 distribution), copy this line into it and press Enter:

<!-- rer:local-recipe -->
```sh
ONCALL_TAG=$(curl -fsS -o /dev/null -w '%{redirect_url}\n' https://github.com/just-every/run-oncall/releases/latest | sed -nE 's|^.*/releases/tag/(v[0-9]+\.[0-9]+\.[0-9]+)$|\1|p') && test -n "$ONCALL_TAG" && mkdir run-oncall && cd run-oncall && git init -q && git remote add origin https://github.com/just-every/run-oncall && git fetch --depth 1 origin tag "$ONCALL_TAG" && git checkout --detach "refs/tags/$ONCALL_TAG" && curl -fsSL https://runeditrun.com/install.sh | sh -s -- dev --host localhost
```

Already have Node 22 or later?

```sh
ONCALL_TAG=$(curl -fsS -o /dev/null -w '%{redirect_url}\n' https://github.com/just-every/run-oncall/releases/latest | sed -nE 's|^.*/releases/tag/(v[0-9]+\.[0-9]+\.[0-9]+)$|\1|p') && test -n "$ONCALL_TAG" && mkdir run-oncall && cd run-oncall && git init -q && git remote add origin https://github.com/just-every/run-oncall && git fetch --depth 1 origin tag "$ONCALL_TAG" && git checkout --detach "refs/tags/$ONCALL_TAG" && npx -y @runeditrun/rer dev --host localhost
```

macOS, Linux or Windows with WSL2. git is required; rer brings Node and pnpm.
<!-- /rer:local-recipe -->

The line clones the latest published Oncall release into a `run-oncall` folder, installs `rer` and the app's dependencies, prepares the local database and a local owner, and starts Oncall. A first local start usually takes about a minute. On a busy computer it can take longer: `rer dev` prints progress every 20 seconds, with the limit to allow. Wait for the private `RER_OPEN` link in the terminal, then open it on the same computer. Treat it like a password. The first time, Oncall opens **Finish setup**. Tick *I confirm this owner account is ready to use* and press **Finish setup**. This free copy runs only on your computer and sends no email.

To start Oncall again later, run `cd run-oncall && rer dev --host localhost`. Adding `rer` to your shell's PATH is optional for future terminals; the one-line launch already finds it for this run.

For Assisted, Managed and the walkthrough for your own Cloudflare account, see [Put Oncall online](https://run-oncall.com/docs/hosting).

On an alert page, **Who this alert goes to** shows its assigned responder, the backup on the rota now and the recorded notification rules in due-time order, including each step's wait and whether the alert is waiting, due, answered or closed. The backup shown now may differ from a past recipient; the recorded rules and contacts remain the ones held for that run even if you edit today's settings. These steps are records only: Oncall does not send them; your existing pager remains responsible. If no rule matched, **Add one** opens **Settings → Team**. — Run Edit Run fleet (sd), 17 November 2026.

## Sign in with a local passkey

On releases with local passkeys, open the private `RER_OPEN` link and finish owner setup. In Oncall, open your account menu (inside **Menu** on a phone), then choose **Sign-in settings → Enroll passkey** and follow your browser’s prompt. On a later visit to your `http://localhost` address, choose **Sign in → Sign in with a passkey**.

If your running address uses `127.0.0.1`, run `rer dev --stop` and then `rer dev --host localhost` in the same checkout. Open the new `RER_OPEN` link. The checkout keeps your schedules and incidents. If your passkey is unavailable, open the private link printed by `rer dev --host localhost` to get back in.

## Sign-in emails on your computer

`rer dev --as signed-out` selects the signed-out persona. The compatibility flag `rer dev --login` still opens automatic owner entry. Ordinary `/signin` email sign-in sends only through a configured remote mail provider with real credentials; no sender is configured by default. The app does not capture mail or print sign-in tokens. Use a real owner mailbox for that flow. After delivery is configured, request an email link on the sign-in page, open the email on the same device and press **Confirm**. The default `rer dev` owner entry above needs no email delivery.

## Stop and start again

Stop the background server with the command below. For a foreground run, Ctrl-C also works:

```sh
rer dev --stop
```

Your schedules, incidents and team stay in the folder until you [export them](data.md) or reset the installation.

Restart from the same folder with `rer dev --host localhost`. If the saved port is in use, run the `rer setup --port N` command printed in the error, then restart. Your data stays in the same folder.

## Explicit and unattended setup

After the installer above, make `rer` available in this terminal with `export PATH="$HOME/.local/bin:$PATH"`. To choose a real owner mailbox before the first launch, clone the tagged release from the command above, enter `run-oncall`, then run `rer setup` (it asks for your owner email in an interactive terminal). Or, from the checkout, one verb at a time:

```sh
rer install
rer setup --owner-email you@example.com
rer dev --host localhost
```

`rer install` fetches the locked dependencies. `rer setup` builds the app, applies local migrations and prepares the owner, keeping private settings inside the checkout and out of Git. Setup prints a loopback `RER_SETUP_READY` address and stops its temporary app before exiting. Next, run `rer dev --host localhost` and open the private `RER_OPEN` link to sign in. Repeating setup preserves the existing owner and data; it is not an owner editor.

In an interactive terminal, `rer setup` can ask for your owner email instead of receiving `--owner-email`. Piping an email to stdin does not answer setup. For unattended use, create an owner-only JSON file, for example `.seed/local-answers.json` containing `{"OWNER_EMAIL":"you@example.com"}`, then run:

```sh
chmod 600 .seed/local-answers.json
rer install
rer setup --answers .seed/local-answers.json --non-interactive
rer dev --host localhost
```

The answers object uses the exact field names in `rer-setup.json`. Other fields have defaults or managed generated values; missing required answers cause a refusal naming those fields. Keep the file out of Git and never put secret answers in command arguments.

Every command, flag and what it changes is in the [command reference](../RUN-LOCALLY.md). `rer describe` prints the same from the folder you are in.

## Update, host and remove

### Later local updates

From your existing checkout, stop the local servers and switch to the latest published release.

```sh
rer dev --stop
rer preview --stop
ONCALL_TAG=$(curl -fsS -o /dev/null -w '%{redirect_url}\n' https://github.com/just-every/run-oncall/releases/latest | sed -nE 's|^.*/releases/tag/(v[0-9]+\.[0-9]+\.[0-9]+)$|\1|p') && test -n "$ONCALL_TAG" &&
git fetch --depth 1 origin tag "$ONCALL_TAG" &&
git checkout --detach "refs/tags/$ONCALL_TAG" &&
rer dev --host localhost
```

This restarts the updated local app, applies migrations and keeps your owner, schedules and incidents. `rer` uses the new checkout's pinned toolchain. Do not reset to upgrade.

### From 0.1.0

Stop the old servers before switching releases. 0.1.0 uses the checkout's runner, which the update removes.

```sh
node scripts/rer.mjs dev --stop
node scripts/rer.mjs preview --stop
```

Then [switch this checkout to the latest published release](#later-local-updates).

With Node 22 or later, you can use `npx -y @runeditrun/rer` in place of each `rer` command.

The update applies Oncall's additive migrations. Your data, owner and password accounts are kept; people who sign in with a workspace password sign in once more after updating to 0.3.0. Do not reset to upgrade.

## Host for your team

Compare the shared [hosting options](https://run-oncall.com/docs/hosting), or follow the Oncall-specific deployment details below.

Release 1 supports hosted incident coordination alongside your team's existing pager. Paging stays OFF; coordination does not need an independent standby. Release 2 paging and independent standby are not built. Keep the pager's routes and notification settings in place.

**Hosting is in `v0.3.0` and later.** Hosting claims the owner you set up, so start from a checkout with your real owner mailbox. Install `rer` first if you have not used the installer above, then put its launcher on PATH in this terminal. It provides its own Node and pnpm; you do not need global `node` or `npx`.

```sh
curl -fsSL https://runeditrun.com/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
ONCALL_TAG=$(curl -fsS -o /dev/null -w '%{redirect_url}\n' https://github.com/just-every/run-oncall/releases/latest | sed -nE 's|^.*/releases/tag/(v[0-9]+\.[0-9]+\.[0-9]+)$|\1|p') && test -n "$ONCALL_TAG" &&
mkdir oncall-hosted && cd oncall-hosted && git init -q &&
git remote add origin https://github.com/just-every/run-oncall &&
git fetch --depth 1 origin tag "$ONCALL_TAG" &&
git checkout --detach "refs/tags/$ONCALL_TAG" &&
rer install &&
rer setup --owner-email you@example.com
```

Already running Oncall locally from `run-oncall`? Keep that folder and its data, and use the fresh `oncall-hosted` checkout above for hosting. Hosting never uploads local records. See [Transfer local coordination records to hosting](data.md#transfer-local-coordination-records-to-hosting) before planning a move; [Export and restore](data.md) explains local backup and recovery.

Replace `you@example.com` with a real mailbox you can open. Setup prepares the owner and private settings locally, prints a loopback `RER_SETUP_READY` address, and stops its temporary app before returning. After deployment, run [`rer signin`](#owner-access-without-email) to print the private hosted owner link. Repeating setup preserves the configured owner; it does not change their email.

The examples use the named environment `production`. Choose the environment once and use the same `--environment NAME` for deployment, sign-in, updates and removal. Each name has its own hosted resources and deployment record; omitting the flag selects `production`. Names start with a lowercase letter and contain lowercase letters, digits and single hyphens, up to 32 characters.

### 1. Get your Cloudflare account ID and token

Use the Cloudflare account where you want the app and its database to live. You need an account member who can grant the permissions below. No domain purchase or DNS transfer is needed for the default `workers.dev` app address.

- **`CLOUDFLARE_ACCOUNT_ID` identifies the destination account.** In the [Cloudflare dashboard](https://dash.cloudflare.com/), select that account, open **Workers & Pages**, find **Account Details**, and copy **Account ID**. This is the 32-character account ID, not a zone ID. Cloudflare also offers **Search → Copy account ID**. See [Cloudflare's account-ID instructions](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/).
- **`CLOUDFLARE_API_TOKEN` authorizes deployment and removal.** Open your profile menu → **My Profile → API Tokens → Create Token → Create Custom Token → Get started**. Name it for this installation. Add the two permission rows below and set **Account Resources → Include → Specific account → your destination account**. Choose **Continue to summary → Create Token**, then copy the token secret immediately into your password manager or the private file in step 3; it is shown once. See [Cloudflare's token creation guide](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/).

| Permission row | Why this deployment needs it |
| --- | --- |
| **Account → Workers Scripts → Edit** | Upload the app and assets, read deployment identity, manage Worker secrets and its `workers.dev` route, and delete/read back the Worker. |
| **Account → D1 → Edit** | Create, read and migrate the hosted database, issue owner recovery grants, and delete/read back the database. |

These are the minimum permission groups for this checkout's `deploy.json`: one Worker with assets and one D1 database. `Edit` includes the reads needed for ownership checks and removal; API reference pages also call it `Write`. This scope list covers the deploy implementation's Worker and D1 requests through deployment, sign-in and removal. There are no declared queues, R2 buckets, KV namespaces or custom domains in this deployment. The broader **Edit Cloudflare Workers** template includes unrelated permissions and does not supply D1 automatically. See the official [Worker upload API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/methods/update/), [D1 creation API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/create/) and [token permission reference](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).

In **Workers & Pages**, also confirm that the account has a **Your subdomain** value ending in `workers.dev`; complete Cloudflare's first-use Workers onboarding if prompted. `rer` reads this existing account subdomain and enables the app's route; it does not create the account subdomain. Existing accounts can use **Change** next to **Your subdomain**. See [Cloudflare's `workers.dev` configuration](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

### 2. Get a SendGrid key and verified sender

For email-link sign-in, choose `MAIL_PROVIDER=sendgrid` with the inputs below. To host with email off, skip the provider account and follow [Hosted coordination with email off](#hosted-coordination-with-email-off). Use a SendGrid account enabled for sending and complete its account verification and two-factor authentication prompts. See [SendGrid account verification](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/verifying-your-account).

**`MAIL_FROM` is the sender address recipients see**, for example `oncall@example.com`. It is separate from the owner's recipient mailbox and must be verified in the same SendGrid account as the key:

- For a team installation, open the [SendGrid console](https://app.sendgrid.com/) → **Settings → Sender Authentication → Domain Authentication → Get Started**. Select your DNS host, choose whether to brand links, enter the domain you send from, then continue to the DNS records. Add the exact records SendGrid gives you at your DNS provider. Return to SendGrid and click **Verify**; wait until verification succeeds. Set `MAIL_FROM` to an address on that exact authenticated domain. See [SendGrid's domain authentication guide](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication).
- For an initial test using a mailbox you control, use **Settings → Sender Authentication → Single Sender Verification → Verify a Single Sender**. Fill in the sender details, including **From Email Address**, click **Create**, then open the verification email in that mailbox and follow its link. Set `MAIL_FROM` to that exact address. Complete domain authentication before production sending, as SendGrid recommends. See [single sender verification](https://www.twilio.com/docs/sendgrid/ui/sending-email/sender-verification) and [sender identity requirements](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/sender-identity).

**`SENDGRID_API_KEY` authorizes sign-in mail.** In SendGrid, open **Settings → API Keys → Create API Key**. Name it for Oncall, select **Custom Access** (also called **Restricted Access**), and enable **Mail Send → Mail Send → Full Access** only (`mail.send`). Leave **Scheduled Sends** and other groups at **No Access**. Click **Create & View**, then copy the complete API key into your password manager or the private file below; it is displayed once. This app submits to `/v3/mail/send` and needs no template, contacts or API-key-management permissions. See [SendGrid API key creation](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/api-keys) and its [Mail Send permission guidance](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/quickstart-go).

### 3. Save credentials in a private file

The following macOS/Linux/WSL shell commands create a file outside the checkout, readable and writable only by your user (`0600`). The creation step refuses to overwrite an existing file. Run it once, then use your editor to replace the placeholders with the copied values; do not paste real secrets into shell commands or shared logs.

```sh
mkdir -p "$HOME/.config/oncall"
chmod 700 "$HOME/.config/oncall"
(
  umask 077
  set -C
  cat > "$HOME/.config/oncall/production.env" <<'ENV'
CLOUDFLARE_ACCOUNT_ID=replace-with-account-id
CLOUDFLARE_API_TOKEN=replace-with-token-secret
MAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=replace-with-sendgrid-key
MAIL_FROM=oncall@example.com
ENV
)
chmod 600 "$HOME/.config/oncall/production.env"
vi "$HOME/.config/oncall/production.env"
```

In `vi`, press `i` to edit, replace each placeholder after `=` with its copied value, then press Escape, type `:wq` and press Enter to save and close. Use your preferred local editor in place of `vi` if you already have one. Save one `KEY=VALUE` per line, without spaces around `=`, `export`, shell substitutions or inline comments. Blank lines and lines beginning with `#` are allowed. One pair of double quotes around a value is accepted; single quotes are literal. Values are read as text, not executed by a shell. The file must be owned by your user, be a regular file with one hard link, and have no group/other permissions; symlinks are refused. Keep it outside Git and keep private backups of both credentials and this checkout's deployment records.

`--env-file` accepts an absolute path or a path relative to the checkout. File values override variables already in your shell for that command only. Use this separate file rather than the local `.dev.vars`: local development keys are refused for deployment. You do not need to invent `OWNER_EMAIL`, `SESSION_SECRET` or `SETUP_TOKEN` entries here: `rer` uses the setup owner and generates new hosted secrets where needed, then retires the one-time setup token.

### 4. Deploy and test sign-in

Stop the development server and preview from the hosting checkout before a dry run or deployment. Ctrl-C also stops a foreground server. A running local server owns the state, so even a deploy dry run refuses with exit 4 until it stops.

```sh
rer dev --stop
rer preview --stop
rer deploy --environment production --dry-run
```

**The dry run is local only.** It builds and validates the local deployment plan. With no env file or Cloudflare credentials, a valid local plan exits 0: no Cloudflare requests are made, nothing changes remotely, and target secrets, deployment permissions and remote readiness are not checked. Local validation or build errors can still refuse. Passing `--env-file` with `--dry-run` does not enable remote checks.

To check the target and deploy, use the real command below with the private file from step 3. It supplies `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `SENDGRID_API_KEY` and `MAIL_FROM`; the sender must be verified and the setup owner must use a real mailbox. This creates or updates hosted resources. A successful dry run is not proof that the credentials, target secrets or hosted sign-in are ready.

```sh
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env"
```

Check each result:

1. **Dry run:** expect exit 0 and the local-only completion message when local validation and the build pass. Missing Cloudflare credentials do not prevent that result; target secrets and remote readiness remain unchecked.
2. **Real deployment:** exits successfully and returns an HTTPS `workers.dev` app address. It creates the Worker and D1 database, applies migrations, verifies deployment identity at `/health`, claims the owner automatically and retires its setup token. There is no setup token to copy or delete. Opening `/health` at that address should return HTTP 200.
3. **Email delivery and owner access:** open the app address, enter the configured owner email and press **Email a sign-in link**. Expect a real email from `MAIL_FROM`. Open it on the same device and press **Confirm**; expect to enter Oncall as the owner. Complete **Finish setup** at `/setup` if shown. A successful deployment alone is not evidence that the mailbox received mail.

If Cloudflare refuses a request, read the named permission/provider error, confirm the account ID, token account restriction, expiration and the two permission rows, then repeat the same command. For `workers-subdomain-missing`, finish the account's Workers onboarding first. If mail is not received, check the actual mailbox's spam folder, sender verification and the key's Mail Send permission; also check that SendGrid has enabled your account to send. The app does not capture mail or print email sign-in tokens.

Local `RER_OPEN` owner entry does not work on the hosted app. Team members created by an admin use their workspace name and password at `/signin/local`; Oncall sends no invitations. Anonymous first-admin bootstrap is restricted to the local loopback app. See [Team and sign-in](team.md).

Hosted D1 and your local database are separate stores. Deploy does not upload local schedules or incidents. The maintained `rer export` and `rer import` commands operate on local data; they do not transfer records to or from the hosted installation.

### Owner access without email

If the owner cannot receive mail, run this from the checkout that deployed that environment, using the same Cloudflare credentials:

```sh
rer signin --environment production --env-file "$HOME/.config/oncall/production.env"
```

For Business agent setup, run `rer signin` after deployment to print the first-owner sign-in link on its own line, then pass it only as the tool’s `sign_in` in `session.report`. Keep it out of chat and files.

This writes a single-use grant for the recorded owner in the hosted database and prints its private sign-in link once in your terminal. Open it privately within 15 minutes and press **Confirm** to enter as the owner. It works once, only for that owner, and its use is audited. Do not redirect, record, screenshot or share this output. This command proves owner recovery access; use the email test above to prove mail delivery. If the command reports no deployment for the environment, use the environment it lists and the original deploying checkout; do not create another environment to recover access.

### Update a hosted installation

Keep this checkout's `.rer/deploy/` records. Switch to the latest published release and deploy to the same environment with the same credentials.

```sh
ONCALL_TAG=$(curl -fsS -o /dev/null -w '%{redirect_url}\n' https://github.com/just-every/run-oncall/releases/latest | sed -nE 's|^.*/releases/tag/(v[0-9]+\.[0-9]+\.[0-9]+)$|\1|p') && test -n "$ONCALL_TAG" &&
git fetch --depth 1 origin tag "$ONCALL_TAG" &&
git checkout --detach "refs/tags/$ONCALL_TAG" &&
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env"
```

The command updates the hosted app and applies migrations, keeping its owner, schedules and incidents. Do not reset to upgrade. Existing hosted secrets are preserved by normal deployment, so editing the private file alone does not rotate them. To replace the mail key or sender, update the private file and explicitly change the affected Worker secret:

```sh
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --set-secret MAIL_API_KEY
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --set-secret MAIL_FROM
```

`MAIL_API_KEY` uses the same-named file entry; `SENDGRID_API_KEY` is also supported as a native SendGrid binding. Use `--set-secret SENDGRID_API_KEY` when replacing that native key. `MAIL_FROM` comes from the same-named file entry. Run only the change you need, repeat the real email sign-in test, then revoke an old SendGrid key after its replacement works.

An existing deployment inherits its bound `MAIL_PROVIDER` secret during a normal redeploy. To change the mail selection, including turning mail on or off, update `MAIL_PROVIDER` in your environment or private file and explicitly replace that secret. For example, after editing `$HOME/.config/oncall/production.env`, run:

```sh
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --set-secret MAIL_PROVIDER
```

— sd, 2026-11-15

### Remove a hosted installation

Removal deletes the hosted database and its records. Keep the deployment record and use the same account, credentials and named environment:

```sh
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --remove --yes
```

This deletes only what that environment's deployment record says `rer` created, then reads back that every recorded resource is absent. Successful removal requires that empty readback; a successful DELETE alone is insufficient. The command exits successfully only after that verification. If removal refuses or readback fails, retain the records, address the reported cause and rerun the same removal command. Your local folder and local data stay. Provider API tokens and SendGrid sender identities are not deleted by this command; revoke installation-specific credentials in their provider consoles when no longer needed.


### Hosted coordination with email off

Choose `MAIL_PROVIDER=none` deliberately in the environment or the private
0600 file passed with `--env-file`. Leave `MAIL_FROM`, `MAIL_API_KEY`,
`SENDGRID_API_KEY`, `RESEND_API_KEY`, relay, account and DKIM inputs unset.
A missing provider or a deferred choice does not turn email off. Check the plan
with `rer deploy --dry-run --env-file PATH` before deploying to your own account.

With email off, the owner runs `rer signin --environment production` from the
checkout that deployed this environment, using its Cloudflare account credentials
and its private recorded deployment. Rer checks the recorded app Worker, account,
project, environment and ownership receipt against the live deployment before
issuing a short-lived, one-time owner link. Keep that link private. A missing or
replaced deployment record cannot be bypassed with local development entry.

Email sign-in links and invitations return `503 mail_unavailable`. Existing
workspace members can still use their installation-local passwords. Schedules,
incident coordination and public pages keep working; notifications remain recorded
without a sender and paging stays OFF. This makes no delivery guarantee.

To enable mail, choose `sendgrid`, `resend`, `cloudflare` or `rer` and supply
`MAIL_FROM` and `MAIL_API_KEY`. The direct providers also accept their native
`SENDGRID_API_KEY` or `RESEND_API_KEY`. Cloudflare also requires
`MAIL_ACCOUNT_ID`; managed mail requires `MAIL_RELAY_URL`. Enabled providers
with missing inputs refuse. Remove old bound sending secrets explicitly with
`rer deploy --environment production --unset-secret NAME` before switching
an existing deployment off; a new selection does not remove old secrets.

— Run Edit Run fleet, 2026-11-15

The name saved by setup in `src/branding.json` appears in signed-in tab titles and beside the Oncall mark on phones, or below it in the desktop rail, including Settings. An installation without a saved name uses Oncall.

Local setup requires `MAIL_PROVIDER=development` for the no-email local owner entry. Selecting `MAIL_PROVIDER=none` stops setup with that correction, including on a retry; choose development and run setup again, then `rer dev`. Hosted deployments can still use `MAIL_PROVIDER=none` with guarded `rer signin`.

`GET /health` includes `buildVersion` from the compiled package version and `deployment.sourceSha` from the deploy binding, falling back to the checkout commit captured when Vite starts or builds. The source is null only if neither is known. Fingerprint and deployment version bindings keep their existing meaning; storage failures still return 503 with the same build identity, and health does not prove pager coverage. These fields contain public build identity only.

— Run Edit Run fleet, 2026-11-17

Choose the name your team sees when setup asks **What should we call this?** You can change it later in **Settings → General**. The saved name appears in the header, browser tab and both sign-in pages; without a saved name, they show Oncall. (sd, 17 November 2026.)

When a service has an acknowledgment timeout and its response policy declares an incident, the clock starts when the incident is declared. If nobody acknowledges in time, the incident, its linked alert, On call and Reviews retain the missed time and who was on call at that deadline. A later acknowledgment keeps the missed response visible for review. Expiry records a response obligation only; paging stays off, so continue using your existing pager. — Run Edit Run fleet, 17 November 2026.
