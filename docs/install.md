# Install and run

Oncall runs on your own computer with one command for each step. You need Node 22.20.0 and pnpm 10.12.4; the commands pick the exact Node version for you when they can.

## Run it on your computer

From the folder you cloned Oncall into:

```sh
node scripts/rer.mjs install
node scripts/rer.mjs setup
node scripts/rer.mjs dev
```

1. **Install** fetches the exact locked dependencies. It changes nothing outside the folder.
2. **Setup** asks for your email address as the owner, builds the app, prepares the local database and keeps your private settings in the folder, out of Git. Running it again keeps your owner and your data.
3. **Dev** starts Oncall at `http://127.0.0.1:8787` (or the port you chose at setup) and prints an `RER_OPEN` link. Open that link on this computer and you are signed in as the owner.

The first time, Oncall opens **Finish setup**: check your name and email, tick *I confirm this owner account is ready to use* and press **Finish setup**. After that, Oncall opens straight into the app.

Treat the `RER_OPEN` link like a password: it signs whoever opens it in as the owner. Open it only on this computer.

## Sign-in emails on your computer

While Oncall runs on your computer, no email leaves it. Sign-in links land in a local outbox instead, which the sign-in page links to as *Open the local development outbox*. Open the newest message and follow its link.

## Stop and start again

Press Ctrl-C in the terminal, or run:

```sh
node scripts/rer.mjs dev --stop
```

Your schedules, incidents and team stay in the folder until you [export them](data.md) or reset the installation.

## Unattended setup

To set up without questions, put your answers in a private file inside the folder and pass it to setup:

```sh
node scripts/rer.mjs setup --answers .seed/local-answers.json --non-interactive
```

The file is a JSON object keyed by the names in `rer-setup.json`, for example `{"OWNER_EMAIL":"you@example.com"}`. Keep it readable only by you.

Every command, flag and what it changes is in the [command reference](../RUN-LOCALLY.md). `node scripts/rer.mjs describe` prints the same from the folder you are in.
