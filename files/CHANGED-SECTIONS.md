# README.md: Run it locally

# Run it locally

See the [Oncall Run page](https://run-oncall.com/run) for local launch and PATH help. Public source: [just-every/run-oncall](https://github.com/just-every/run-oncall). The latest tag, `v0.5.7`, includes hosted coordination. See [Getting started](docs/getting-started.md#host-for-your-team) for complete credentials and deployment instructions.

One line installs the `rer` command, clones Oncall and starts it:

```sh
curl -fsSL https://runeditrun.com/install.sh | sh -s -- dev just-every/run-oncall
```

Already have Node 22 or later? `npx -y @runeditrun/rer dev just-every/run-oncall` does the same.

macOS, Linux or Windows with WSL2. git is required; rer brings Node and pnpm.

To start it again later, run `cd run-oncall && rer dev`; after the `curl` installer, a terminal without `~/.local/bin` on PATH needs `export PATH="$HOME/.local/bin:$PATH"` first or it says `rer: command not found` (add that line to your shell startup file to keep it; `"$HOME/.local/bin/rer" cli path` shows the line for your shell). `rer dev` installs the application dependencies, creates a local development owner and prints a private `RER_OPEN` link that opens Oncall signed in. On first launch, confirm the read-only owner details at `/setup` (**Finish setup**); later launches open the app directly. To choose your own owner mailbox before the first launch, use [explicit setup](docs/getting-started.md#explicit-and-unattended-setup); unattended setup accepts a private answers file.

Open the printed link on this computer. `rer dev --as signed-out` selects the signed-out persona. The compatibility flag `rer dev --login` still opens automatic owner entry. Ordinary `/signin` email sign-in sends only through a configured remote mail provider with real credentials; no sender is configured by default. The app does not capture mail or print sign-in tokens. Stop the background server with `rer dev --stop` (Ctrl-C also stops a foreground run); stop preview with `rer preview --stop` before building, verifying or deploying. A running dev or preview server owns the local state, so even a deploy dry run refuses with exit 4 until it stops.

```sh
rer build
rer preview
rer verify
rer export --output exports/installation.rer
rer import --input exports/installation.rer --yes
rer reset --yes
rer dev --stop
rer preview --stop
rer deploy --environment production --dry-run
rer describe
rer check
```

Before the first `rer verify`, stop dev and preview, then install its browser using the dependencies `rer dev` (or `rer install`) already installed:

```sh
node node_modules/@playwright/test/cli.js install chromium
rer verify
```

This command uses Node directly; no global pnpm is needed. On Linux, add `--with-deps` to the browser install command if system libraries are missing. `rer doctor` reports a missing verification browser and prints this command. `rer check` is silent on success (exit 0); `rer check --json` prints the result.

Export includes supported durable records and the import journal, excluding sessions and dev credentials. Import requires an empty destination and explicit confirmation. If it refuses with `target_not_empty`, export any data you need to keep, stop dev and preview, then run `rer reset --yes` before importing into the now-empty installation. Configure a new owner, sign in, then explicitly map an archived administrator identity from the signed-out workspace; credentials never travel. Reset deletes local data and owner settings and keeps your exports; see [Export and restore](docs/data.md) for the in-place restore sequence.

A deploy dry run builds and validates the local deployment plan. With no env file or Cloudflare credentials, a valid local plan exits 0: it sends nothing to Cloudflare, changes nothing remotely and checks no target secrets, deployment permissions or remote readiness. Adding `--env-file` to a dry run does not enable remote checks. For those checks, prepare the private credentials file and run the real deployment described in [Host for your team](#host-for-your-team); it creates or updates hosted resources. Email delivery needs the separate sign-in test below.

Release 1 supports hosted incident coordination alongside your existing pager. Paging stays OFF; an independent standby is not required for coordination. Release 2 paging and its independent standby are not built. See [hosting instructions](docs/getting-started.md#host-for-your-team) for deployment, sign-in and removal. Use `describe` for flags and `doctor` for missing local prerequisites.


# README.md: Host for your team

### Host for your team

Hosting is in `v0.3.0` and later. Release 1 hosts coordination alongside your existing pager, with paging OFF and no standby requirement. Follow [Getting started](docs/getting-started.md#host-for-your-team) to prepare a real owner mailbox, obtain Cloudflare and SendGrid credentials with the required permissions, and save them in an owner-only `0600` file outside Git. The Install page includes each provider's menu path, verification steps and expected results.

Stop dev and preview from the hosting checkout before either the dry run or deployment (Ctrl-C also stops a foreground server). With the private file prepared as described there:

```sh
rer dev --stop
rer preview --stop
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --dry-run
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env"
```

The dry run above remains local even with the private file. The real command without `--dry-run` uses `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `SENDGRID_API_KEY` and `MAIL_FROM` from that file to check the target and deploy; a dry-run success does not prove those inputs work.

Use the same named environment for every later command; it defaults to `production` if omitted. Deployment creates the hosted installation, applies migrations, verifies deployment identity, claims the configured owner automatically and retires its one-time setup token. Open the returned address and use **Email a sign-in link**, then open the email on the same device and press **Confirm**. Finish the owner confirmation at `/setup` if shown. Local dev entry links do not work there. Admin-created team members use their workspace name and password at `/signin/local`; Oncall sends no invitations.


# docs/getting-started.md: deploy and test sign-in

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

