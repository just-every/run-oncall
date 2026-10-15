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

In a terminal, dev stays running until you stop it. Without an interactive terminal it can start in the background and return after printing the ready links; `rer dev --stop` stops it.

## Sign-in emails on your computer

While Oncall runs on your computer, no email leaves it. Sign-in links land in a local outbox instead. To try ordinary sign-in, run `rer dev --as signed-out` and open its printed `RER_OPEN` link in the browser you will use. This authorizes that browser for the private outbox. Then request an email link and choose *Open the local development outbox*, open the newest message and follow its link. `rer dev --login` also prints a sign-in/outbox link.

The outbox needs this checkout's dev-key cookie. A fresh browser that goes straight to the outbox sees instructions to run `rer dev --as signed-out` and open its printed link in that same browser first.

## Stop and start again

Press Ctrl-C in the terminal, or run:

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

Update this checkout without resetting its data:

```sh
git pull --ff-only
rer deploy
```

`rer` installs a pulled change of its own pin before it runs, so there is nothing to install by hand, and it provides the Node and pnpm versions this checkout pins. Hosting for a team is held: `rer deploy` refuses before any provider request until a hosted release with an independent standby is approved, and paging stays OFF until a real-phone drill passes. Use `rer deploy --dry-run` to build and validate locally. Once hosting is approved, `rer deploy` deploys to your own Cloudflare account (it reads `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` from the environment), claims the owner you set up automatically and removes its one-time setup token; there is no token to copy or delete, and you sign in at the app address with an emailed link. An update keeps that owner. To take a hosted installation down again, with the same credentials:

```sh
rer deploy --remove --yes
```

This deletes only what the deployment record says `rer deploy` created (the Worker, database and any queues), reads back that each is gone and touches nothing else. Your local folder and data stay.
