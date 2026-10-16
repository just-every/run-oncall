# Install and run

Install the `rer` command once:

```sh
curl -fsSL https://runeditrun.com/install.sh | sh
```

Or use `npm install -g @runeditrun/rer`. You need Git and Node 22 or later, on macOS, Linux or Windows with WSL2; `rer` provides the checkout's pinned Node and pnpm tooling.

## Run it on your computer

```sh
git clone https://github.com/just-every/run-oncall.git oncall
cd oncall
rer dev
```

`rer dev` installs the locked dependencies, prepares the local database and creates a local development owner (`owner@<checkout-name>.test`). It starts Oncall and prints a private `RER_OPEN` link. Open that link on this computer and you are signed in as the owner. Use the printed address: the default port starts at 8787 and another free port is selected if needed; `rer dev --port N` requests a specific free port.

The first time, Oncall opens **Finish setup**. Name and Email are read-only; a default local owner is named **Owner**. Review the displayed email, tick *I confirm this owner account is ready to use* and press **Finish setup**. This screen confirms the owner; it does not edit their name or email. After that, Oncall opens straight into the app. To choose a real owner mailbox before first launch, use the explicit setup steps below.

Treat the `RER_OPEN` link like a password: it signs whoever opens it in as the owner. Open it only on this computer.

`rer dev` can detach and return after printing the ready links. The app keeps running in the background; `rer dev --stop` stops it. If it is running in the foreground, Ctrl-C stops it too.

Before the first `rer verify`, stop dev and preview, then install its browser using the dependencies `rer dev` (or `rer install`) already installed:

```sh
node node_modules/@playwright/test/cli.js install chromium
rer verify
```

This command uses Node directly; no global pnpm is needed. On Linux, add `--with-deps` to the browser install command if system libraries are missing. `rer doctor` reports a missing verification browser and prints this command. `rer check` is silent on success (exit 0); `rer check --json` prints the result.

## Sign-in emails on your computer

`rer dev --as signed-out` selects the signed-out persona. The compatibility flag `rer dev --login` still opens automatic owner entry. Ordinary `/signin` email sign-in sends only through a configured remote mail provider with real credentials; no sender is configured by default. The app does not capture mail or print sign-in tokens. Use a real owner mailbox for that flow. After delivery is configured, request an email link on the sign-in page, open the email on the same device and press **Confirm**. The default `rer dev` owner entry above needs no email delivery.

## Stop and start again

Stop the background server with the command below. For a foreground run, Ctrl-C also works:

```sh
rer dev --stop
```

Your schedules, incidents and team stay in the folder until you [export them](data.md) or reset the installation.

## Explicit and unattended setup

To choose a real owner mailbox before the first launch, run:

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

Install the `rer` command once, while you still have the old checkout:

```sh
curl -fsSL https://runeditrun.com/install.sh | sh
```

Open a new terminal if the installer asks you to, or use `npm install -g @runeditrun/rer`. Then, from this checkout on `main`:

```sh
git pull --ff-only
rer dev
```

There are no new migrations in 0.2.0. Your data, owner and password accounts are kept. Do not reset to upgrade.

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

Release 1 supports hosted incident coordination alongside your team's existing pager. Paging stays OFF; coordination does not need an independent standby. Release 2 paging and independent standby are not built. Keep the pager's routes and notification settings in place.

Before first launch, choose a real owner mailbox in a checkout prepared for hosting:

```sh
rer install
rer setup --owner-email you@example.com
```

Setup prepares the owner and private settings locally and stops its temporary app before returning. Repeating setup preserves the configured owner; it does not replace a development owner with a new email. Use a checkout configured for the real mailbox you intend to use on the hosted installation.

Supply these environment variables privately to the deployment process:

- `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` for your own Cloudflare account.
- `SENDGRID_API_KEY` and `MAIL_FROM` for the remote sign-in mail provider. The deployment declaration selects SendGrid; use a sender verified by that account.

A configured remote mail provider is required for hosted email-link sign-in. Local `RER_OPEN` owner entry requires no mail and does not work on the hosted app. Keep credentials out of Git, shell arguments and shared logs.

```sh
rer deploy --dry-run
rer deploy
```

The dry run builds and validates locally without provider requests. `rer deploy` creates the hosted Worker and database, applies migrations and verifies the deployed identity at `/health`. It claims the configured owner automatically and retires its one-time setup token. There is no setup token to copy or delete.

Open the app address returned by deployment, enter the owner email and press **Email a sign-in link**. Open the email on the same device and press **Confirm**. Complete **Finish setup** at `/setup` if shown. The owner uses native email links. Team members created by an admin use their workspace name and password at `/signin/local`, on the local or hosted app. These credentials belong to that installation; Oncall sends no invitations. Anonymous first-admin bootstrap is restricted to the local loopback app. See [Team and sign-in](team.md).

Hosted D1 and your local database are separate stores. Deploy does not upload local schedules or incidents. The maintained `rer export` and `rer import` commands operate on local data; they do not transfer records to or from the hosted installation.

### Update a hosted installation

Keep the deployment record in this checkout and use the same Cloudflare credentials:

```sh
git pull --ff-only
rer deploy
```

The command updates the hosted app and applies migrations, keeping its owner, schedules and incidents. Keep remote-mail configuration available for deployment and sign-in. Do not reset to upgrade.

### Remove a hosted installation

Keep the deployment record and use the same Cloudflare credentials:

```sh
rer deploy --remove --yes
```

This deletes only what the deployment record says `rer deploy` created (the Worker, database and any queues), then reads back that every recorded resource is absent. Successful removal requires that empty readback. Removal deletes the hosted database and its records. It touches nothing else; your local folder and local data stay.
