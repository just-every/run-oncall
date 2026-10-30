# Getting started

Oncall runs on your own computer first. Open a terminal (on a Mac, Terminal in Applications → Utilities; on Windows, your WSL2 distribution), copy this line into it and press Enter:

<!-- rer:local-recipe -->
```sh
curl -fsSL https://runeditrun.com/install.sh | sh -s -- dev just-every/run-oncall
```

Already have Node 22 or later? `npx -y @runeditrun/rer dev just-every/run-oncall` does the same.

macOS, Linux or Windows with WSL2. git is required; rer brings Node and pnpm.
<!-- /rer:local-recipe -->

The line installs `rer`, the Run Edit Run command, clones Oncall into a `run-oncall` folder, installs everything, prepares the local database and a local owner, and starts Oncall. It prints a private `RER_OPEN` link: open it on the same computer and you are signed in as the owner. Treat it like a password. The first time, Oncall opens **Finish setup**: tick *I confirm this owner account is ready to use* and press **Finish setup**. This free copy runs only on your computer: it sends no email, and nobody else can open it.

To start Oncall again later, run the same line from the same folder. Adding `rer` to your shell's PATH is optional for future terminals; the one-line launch already finds it for this run.

For Assisted, Managed and the walkthrough for your own Cloudflare account, see [Put Oncall online](https://run-oncall.com/docs/hosting).

## Sign-in emails on your computer

`rer dev --as signed-out` selects the signed-out persona. The compatibility flag `rer dev --login` still opens automatic owner entry. Ordinary `/signin` email sign-in sends only through a configured remote mail provider with real credentials; no sender is configured by default. The app does not capture mail or print sign-in tokens. Use a real owner mailbox for that flow. After delivery is configured, request an email link on the sign-in page, open the email on the same device and press **Confirm**. The default `rer dev` owner entry above needs no email delivery.

## Stop and start again

Stop the background server with the command below. For a foreground run, Ctrl-C also works:

```sh
rer dev --stop
```

Your schedules, incidents and team stay in the folder until you [export them](data.md) or reset the installation.

## Explicit and unattended setup

To choose a real owner mailbox before the first launch, run `npx -y @runeditrun/rer setup just-every/run-oncall` (set up only; in an interactive terminal it asks for your owner email), then `cd run-oncall && rer dev`. Or, from the checkout, one verb at a time:

```sh
rer install
rer setup --owner-email you@example.com
rer dev
```

`rer install` fetches the locked dependencies. `rer setup` builds the app, applies local migrations and prepares the owner, keeping private settings inside the checkout and out of Git. Setup starts a temporary app to complete those steps and stops it before exiting. Run `rer dev` afterwards to keep Oncall running. Repeating setup preserves the existing owner and data; it is not an owner editor.

In an interactive terminal, `rer setup` can ask for your owner email instead of receiving `--owner-email`. Piping an email to stdin does not answer setup. For unattended use, create an owner-only JSON file, for example `.seed/local-answers.json` containing `{"OWNER_EMAIL":"you@example.com"}`, then run:

```sh
chmod 600 .seed/local-answers.json
rer install
rer setup --answers .seed/local-answers.json --non-interactive
rer dev
```

The answers object uses the exact field names in `rer-setup.json`. Other fields have defaults or managed generated values; missing required answers cause a refusal naming those fields. Keep the file out of Git and never put secret answers in command arguments.

Every command, flag and what it changes is in the [command reference](../RUN-LOCALLY.md). `rer describe` prints the same from the folder you are in.

## Update, host and remove

### From 0.1.0

Stop the old servers **before pulling**: 0.1.0 uses the checkout's runner, which the update removes.

```sh
node scripts/rer.mjs dev --stop
node scripts/rer.mjs preview --stop
```

Then, from this checkout on `main`, update and start it with `npx`, which needs no separate install of `rer`:

```sh
git pull --ff-only
npx -y @runeditrun/rer dev
```

The update applies Oncall's additive migrations. Your data, owner and password accounts are kept; people who sign in with a workspace password sign in once more after updating to 0.3.0. Do not reset to upgrade.

### Later local updates

Update this checkout without resetting its data:

```sh
rer dev --stop
rer preview --stop
git pull --ff-only
rer dev
```

This restarts the updated local app, applies migrations and keeps your owner, schedules and incidents. `rer` installs a pulled change of its own pin before it runs and provides the pinned Node and pnpm versions. Do not reset to upgrade.

## Host for your team

Compare the shared [hosting options](https://run-oncall.com/docs/hosting), or follow the Oncall-specific deployment details below.

Release 1 supports hosted incident coordination alongside your team's existing pager. Paging stays OFF; coordination does not need an independent standby. Release 2 paging and independent standby are not built. Keep the pager's routes and notification settings in place.

**Hosting is in `v0.3.0` and later.** Use a fresh checkout of `main` for the following steps; a checkout already set up with a development owner keeps that owner when setup runs again.

```sh
npx -y @runeditrun/rer install just-every/run-oncall --dir oncall-hosted
cd oncall-hosted
rer setup --owner-email you@example.com
```

Replace `you@example.com` with a real mailbox you can open. Setup prepares the owner and private settings locally and stops its temporary app before returning. Repeating setup preserves the configured owner; it does not change their email.

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

Hosted email-link sign-in sends real email through SendGrid, selected by `deploy.json`. Use a SendGrid account enabled for sending and complete its account verification and two-factor authentication prompts. See [SendGrid account verification](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/verifying-your-account).

**`MAIL_FROM` is the sender address recipients see**, for example `oncall@example.com`. It is separate from the owner's recipient mailbox and must be verified in the same SendGrid account as the key:

- For a team installation, open the [SendGrid console](https://app.sendgrid.com/) → **Settings → Sender Authentication → Domain Authentication → Get Started**. Select your DNS host, choose whether to brand links, enter the domain you send from, then continue to the DNS records. Add the exact records SendGrid gives you at your DNS provider. Return to SendGrid and click **Verify**; wait until verification succeeds. Set `MAIL_FROM` to an address on that exact authenticated domain. See [SendGrid's domain authentication guide](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication).
- For an initial test using a mailbox you control, use **Settings → Sender Authentication → Single Sender Verification → Verify a Single Sender**. Fill in the sender details, including **From Email Address**, click **Create**, then open the verification email in that mailbox and follow its link. Set `MAIL_FROM` to that exact address. Complete domain authentication before production sending, as SendGrid recommends. See [single sender verification](https://www.twilio.com/docs/sendgrid/ui/sending-email/sender-verification) and [sender identity requirements](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/sender-identity).

**`SENDGRID_API_KEY` authorizes sign-in mail.** In SendGrid, open **Settings → API Keys → Create API Key**. Name it for Oncall, select **Custom Access** (also called **Restricted Access**), and enable **Mail Send → Mail Send → Full Access** only (`mail.send`). Leave **Scheduled Sends** and other groups at **No Access**. Click **Create & View**, then copy the complete API key into your password manager or the private file below; it is displayed once. This app submits to `/v3/mail/send` and needs no template, contacts or API-key-management permissions. See [SendGrid API key creation](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/api-keys) and its [Mail Send permission guidance](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/quickstart-go).

### 3. Save credentials in a private file

The following macOS/Linux/WSL shell commands create a file outside the checkout, readable and writable only by your user (`0600`). The creation step refuses to overwrite an existing file. Run it once, then use your editor to replace the four placeholders with the copied values; do not paste real secrets into shell commands or shared logs.

```sh
mkdir -p "$HOME/.config/oncall"
chmod 700 "$HOME/.config/oncall"
(
  umask 077
  set -C
  cat > "$HOME/.config/oncall/production.env" <<'ENV'
CLOUDFLARE_ACCOUNT_ID=replace-with-account-id
CLOUDFLARE_API_TOKEN=replace-with-token-secret
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

From the hosting checkout, run:

```sh
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --dry-run
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env"
```

Check each result:

1. **Dry run:** validates and builds locally, then uses Cloudflare credentials to read the target Worker and secret bindings, without provider writes. Missing credentials, unreadable bindings or required secrets refuse. It does not establish deployment permissions, hosted health or email delivery.
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

This writes a single-use grant for the recorded owner in the hosted database and prints its private sign-in link once in your terminal. Open it privately within 15 minutes and press **Confirm** to enter as the owner. It works once, only for that owner, and its use is audited. Do not redirect, record, screenshot or share this output. This command proves owner recovery access; use the email test above to prove mail delivery. If the command reports no deployment for the environment, use the environment it lists and the original deploying checkout; do not create another environment to recover access.

### Update a hosted installation

Keep this checkout's `.rer/deploy/` records, use the same environment and credentials, and update from `main`:

```sh
git pull --ff-only
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env"
```

The command updates the hosted app and applies migrations, keeping its owner, schedules and incidents. Do not reset to upgrade. Existing hosted secrets are preserved by normal deployment, so editing the private file alone does not rotate them. To replace the mail key or sender, update the private file and explicitly change the affected Worker secret:

```sh
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --set-secret MAIL_API_KEY
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --set-secret MAIL_FROM
```

`MAIL_API_KEY` is the Worker binding populated from `SENDGRID_API_KEY`; `MAIL_FROM` comes from the same-named file entry. Run only the change you need, repeat the real email sign-in test, then revoke an old SendGrid key after its replacement works.

### Remove a hosted installation

Removal deletes the hosted database and its records. Keep the deployment record and use the same account, credentials and named environment:

```sh
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --remove --yes
```

This deletes only what that environment's deployment record says `rer` created, then reads back that every recorded resource is absent. Successful removal requires that empty readback; a successful DELETE alone is insufficient. The command exits successfully only after that verification. If removal refuses or readback fails, retain the records, address the reported cause and rerun the same removal command. Your local folder and local data stay. Provider API tokens and SendGrid sender identities are not deleted by this command; revoke installation-specific credentials in their provider consoles when no longer needed.
