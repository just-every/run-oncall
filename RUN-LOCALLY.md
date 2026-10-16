# Run it locally

Install the `rer` command once: `curl -fsSL https://runeditrun.com/install.sh | sh`,
or `npm install -g @runeditrun/rer`.
`rer` runs every verb with the checkout's exact `@runeditrun/rer` package pin.
The `OPERATIONS.json` argv and `package.json` aliases name `rer VERB`.

## Launch with one command

From a runnable edition's root, `rer dev` is the whole launch. It installs
locked dependencies when they are missing or older than the lockfile. On a
checkout that is not set up it sets up a local owner
(`owner@<checkout-name>.test`) and fills the setup answers the seed declares a
`localDefault` for in `rer-setup.json`. Then it starts the app and prints the
`RER_READY` lines. It never prompts and never re-runs setup on a checkout that
is set up. A required setup answer with no value and no `localDefault` stops it
with exit 3 and a message naming the field.

- **Port.** The first port from 8787 that is free on both `127.0.0.1` and `::1`
  and held by no registered server. Override with `rer dev --port N`; start the
  search elsewhere with `RER_DEV_PORT_FROM=N`.
- **Detaching.** Without a terminal (an agent's shell tool) `rer dev` returns once
  the app is ready and leaves it running in the background, printing its
  private log path; in a terminal it stays in the foreground and Ctrl-C stops
  it. `--detach` and `--foreground` override that.
- **Progress and resuming.** A first launch can take several minutes. It prints
  a progress line at least every 30 seconds (`progress` events with `--json`).
  If the calling command is killed the launch carries on; run `rer dev` again to
  reattach or to finish an install or setup that stopped. A second `rer dev`
  reprints the ready lines.
- **Server limit.** Up to 10 dev or preview servers run on one computer. Set
  `RER_SERVER_LIMIT=N` to change it.
- **Idle timeout.** A server stops after 12 hours (43200 seconds) without
  activity. Set `--idle-timeout SECONDS` or `RER_SERVER_IDLE_SECONDS=N` to change
  it.
- **Stopping.** `rer dev --stop` stops the server, and any launch still preparing.

## Install for a real owner

`rer` provides the Node and pnpm versions the checkout pins; you install
neither. To install with a real owner mailbox, run the verbs yourself from the runnable
edition's root: install locked dependencies, prepare its local owner, then start
development:

```sh
rer install
rer setup --owner-email you@example.com
rer dev
```

Commands that run project work select the exact Node version declared by the
project. They use an exact matching installed runtime or a checksum-verified
copy cached at `~/.rer/node/node-vVERSION-PLATFORM-ARCH/`; when needed on
supported platforms, the runner retrieves the official Node release and checks
its SHA-256 against `SHASUMS256.txt`. It does not change global Node installations.
Set `RER_NODE_AUTO=0` to disable automatic selection. If selection is disabled
or acquisition fails, the command reports a repair invocation in this form:
`npm exec --yes --package=node@VERSION -- node SCRIPT VERB --cwd PROJECT`.
Help, check, describe, doctor and stop do not select or acquire Node.
A runtime that has just verified also drops its stale `.quarantine-` copies and
Node's unused `include/` headers, which saves about 250 MB per Node release;
`doctor` lists what it could not remove. `doctor` also warns, without failing,
about Node releases, workerd versions and pnpm pins that checkouts running on
this computer set differently (each distinct pin keeps its own copy), and about
a checkout on another volume than your home folder, where pnpm cannot clone
packages from its store.

After `RER_READY`, Oncall prints `RER_SIGNED_IN EMAIL` and a private
`RER_OPEN URL`. Open that URL on this computer to enter as the owner. On first
launch, `/setup` asks you to confirm the read-only owner details; once complete,
later launches open the app directly. Treat `RER_OPEN` as a credential.
`rer dev --as signed-out` selects the signed-out persona; the compatibility flag
`rer dev --login` still opens automatic owner entry. Ordinary `/signin` email
sign-in sends only through a configured remote mail provider with real
credentials; no sender is configured by default. The app does not capture mail or print sign-in tokens.

The saved local port is used; a first setup saves the first free port from 8787. Explicit ports are decimal
integers from 1 through 65535 and must be free; a busy requested port fails
instead of silently moving. Only `127.0.0.1`, `localhost` and `::1` are allowed.
Dev applies the selected host and port to both the listener and runtime bindings;
readiness is bounded and failure stops the owned processes. Sign-in and dev-key
cookies are named for the port, so checkouts open side by side on different
ports in one browser each keep their own sign-in.

A first `setup` without `--port` saves the first free port from 8787 and prints
it in one line; it never saves a port another process listens on, on any
address. To move a checkout whose saved port is held by another checkout (or
by nothing), run `rer setup --port N` in it: only the saved
port changes, its data is kept, no reset is needed, and setup prints the old
and new port. A refusal for a busy port names the process or checkout that
holds it and gives that exact command with a free port.

Heavy work (install, setup, build, verify) waits in a machine-wide gate in
`~/.rer/jobs` when 3 jobs are running or available memory is at or below
2 GiB. Available memory is what the OS can
reclaim (macOS: free, inactive, speculative and purgeable pages from
`vm_stat`; Linux: `MemAvailable`), not the small "free" counter. A waiting
message gives the queue position, the jobs ahead with their checkout paths and
the available memory against the floor. Change the floor with
`RER_JOBS_MIN_FREE_MEMORY_BYTES` (bytes; 0 turns it off). `dev` and `preview`
never wait behind other checkouts' jobs; they start unless available memory is
below their own floor, described next.

Missing non-interactive setup answers exit 3 and name the manifest fields.
Read `rer-setup.json` and pass a private, mode-0600 JSON object keyed by those
names using `rer setup --answers PATH --non-interactive`,
for example `{"OWNER_EMAIL":"owner@example.com"}`. Secret values stay in
private inputs and never go in command arguments. A setup rerun with the saved
owner and origin preserves existing owner/data and exact private settings.
Conflicting saved identity or origin reports an actionable recovery path.
Review reset's exact removal inventory before confirmation; export domain data
first if it should be restored, and import only into an empty destination.

Queue waits report immediately with a reason and numeric one-based position,
then refresh about every 15 seconds while waiting. From the runnable project
root, inspect the live queue with
`node node_modules/@runeditrun/rer/modules/job-queue/cli.mjs status`.

For the real owner mailbox, `setup` can prompt instead of receiving
`--owner-email` on the command line. Setup builds the app, applies local
migrations, prepares the first owner and stops its temporary app before it exits.
Existing owner data and private settings are preserved on a repeated setup.

Dev starts the real local app with assets and HMR and prints `RER_READY URL`
after the application health check. With dev identity it then prints
`RER_SIGNED_IN EMAIL` and `RER_OPEN URL`. The `RER_OPEN` URL carries this
checkout's dev key in its fragment: opening it signs the browser in through a
real dev session, and the key is removed from the address bar and kept only as a
host-only cookie. Treat that line as a credential and open it only on this
computer. The app name and browser title identify Dev mode. `dev --as PERSONA`
selects another declared persona or `signed-out`; legacy `dev --login` uses the
same automatic owner entry. Ordinary `/signin` email delivery requires a
configured remote mail provider with real credentials.

Dev and preview are managed servers. In a terminal the first invocation stays
active while serving; without one, `rer dev` returns once the app is ready and
leaves it running (see the launch section above). Use `rer dev --stop` or
`rer preview --stop` to stop them; `--idle-timeout SECONDS`
sets inactivity cleanup. Compatible repeated starts reuse the registered
server, print readiness and exit. Preview serves fixed production output; dev
serves live source edits.
Both retain the same owner and `.wrangler/state`.

Both also run the project's Cron Triggers on their schedule, read from the same
files `check` reads for the deployed Worker (`wrangler.jsonc`, `wrangler.toml`,
a deploy template such as `deploy/wrangler.template.toml`). Each run prints one
`RER_SCHEDULED TIME "CRON" ok MSms` line. If two of those files declare different
schedules the server refuses to start and names both files; make them the same.

A server stops after 12 hours (43200 seconds) without activity, so one left
running overnight is still there in the morning. Start it with
`--idle-timeout SECONDS` (or set `RER_SERVER_IDLE_SECONDS`) to change that.

Up to 10 dev or preview servers run on one computer, so several seeds can run
side by side. At the limit a start is refused and the message lists the running
servers with the command that stops each; start with `RER_SERVER_LIMIT=N` to
allow more. Machine load alone never refuses a start or holds heavy work; a
fleet that wants a load guard sets `RER_SERVERS_LOAD_THRESHOLD=N` and
`RER_JOBS_LOAD_THRESHOLD=N` (the 1-minute load) in its own environment.

A new server is refused only when available memory is below 1.5 GiB. An idle
dev server holds about 0.5-1.3 GiB and a preview about 0.4-0.8 GiB. The message
gives the available memory, the floor and the running servers with their stop
commands; start with `RER_SERVERS_MIN_MEMORY_BYTES=N` (bytes; 0 turns it off) to
start anyway. Reusing a checkout's running server is never refused for memory.

Use the following operations as needed. Reset is destructive local cleanup;
export any data you need to keep before resetting. Export saves under
`exports/`: normalized relative paths such as `exports/x.rer` and
`./exports/x.rer`, and absolute paths inside this checkout's `exports/`, are
accepted. An absolute path outside the checkout is also accepted. Export
refuses other paths in the checkout, `..` segments, unsafe symlinks and any
path served by the app. Import requires an empty destination and `--yes`
confirms the restore.

```sh
rer verify
rer reset --yes
rer export --output exports/installation.rer
rer import --input exports/installation.rer --yes
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env"
rer describe
```

Stop dev or preview with `--stop` or Ctrl-C before build or verification, and
before reset and data transfer. Reset removes only the
declared local inventory: local database/storage state, owner and sessions,
CLI and installer bookkeeping, and generated private settings. It
keeps source, dependencies, exports and deployment receipts. It refuses active
operations and ambiguous or linked state.

Local export creates a private archive with an integrity receipt and explicit
exclusions. Import validates the archive and restores into an empty destination.
After import, run setup to establish the owner and local configuration. Auth,
private settings and transient runtime state are excluded. Remote
transfer is unsupported by the maintained references and fails visibly.

Release 1 supports hosted incident coordination alongside the existing pager,
with paging OFF and no independent standby prerequisite. Release 2 paging and
independent standby are not built. `rer deploy` deploys coordination to the
operator's Cloudflare account; see [hosting instructions](docs/install.md#host-for-your-team).
`rer deploy --environment production --dry-run` validates and builds locally without a provider request. The default environment is `production`; select another with
`--environment NAME`. Local validation does not establish provider acceptance,
hosted health or mail delivery.

`rer describe` reads the current checkout's actual verbs,
flags, aliases, pins, effects and local state without installing or running
project commands. New verbs accept `--help`, `--cwd PATH`, `--non-interactive`
and `--json`. Setup also accepts `--owner-name`, `--port`, `--host` and a
private JSON `--answers FILE`. Dev and preview accept `--port`, `--host`,
`--idle-timeout`, and `--stop`. Deploy accepts `--environment`, `--env-file`, `--dry-run`, `--set-secret NAME`,
`--unset-secret NAME` and `--remove --yes`; `rer signin` accepts
`--environment` and `--env-file`;
export/import accept their target, file and restore options. `check` accepts
`--profile first-party`. Heavy commands accept `--no-queue` only when the
original caller has `CI=true`. Release retains its own compatibility flags.

Local durable state is `.wrangler/state`; CLI bookkeeping is `.rer/local`,
installer state is `.seed/installer`, and the default private settings file is
`.dev.vars` with mode 0600. Setup writes this checkout's dev key to
`.rer/local/dev-key.env` (mode 0600); a repeat setup keeps it and reset removes
it, which also ends every browser's earlier dev cookie. Dev sign-in and personas
answer only a request holding that key's cookie, so
a tunnel or local proxy to the app cannot reach them; anything else returns 404.
Any local user or process that can read the checkout can read the key and sign
in as the owner. `rer deploy` refuses the key, and `rer build` refuses output
that contains the dev layer.

The first-party command profile is optional for independently authored
projects. They may keep their own runtime, tools, installer, commands and
provider choices. RER executes only their declared operations and does not
impose Base pins, aliases or state layout.

## Update, host and remove

Hosted coordination is in `v0.3.0` and later. For first deployment, follow [Install and run](docs/install.md#host-for-your-team):
it includes real-owner setup, the Cloudflare account ID/token and SendGrid
key/verified sender, exact provider menu paths, permissions and verification,
and private `0600` credential-file creation. The examples below use that file.

`--environment NAME` selects the hosted resources and deployment record; the
default is `production`. Use the same name for deploy, sign-in, updates, secret
changes and removal. Keep the deploying checkout and its `.rer/deploy/` records.

```sh
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --dry-run
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env"
```

`--env-file` reads an owned private regular file of `KEY=VALUE` lines, relative
to the checkout or at an absolute path. File entries override process environment
values for this command. It refuses symlinks, multiple hard links, foreign
ownership and group/other permissions. Blank lines and `#` comment lines are
allowed, with one optional pair of double quotes around a value; it performs no
shell expansion. Keep local dev keys out of this file. The setup owner and fresh
hosted session/setup secrets are supplied automatically where needed.

The dry run validates and builds locally without provider requests. A successful
real deploy applies hosted migrations, checks deployment identity at `/health`,
claims the owner automatically and retires the one-time setup token. Open the
returned HTTPS address, request an owner sign-in email, open it on the same
device and press **Confirm**. Mailbox receipt and successful owner entry prove
the mail flow; deployment success alone does not. Local dev keys and owner-entry
links do not work there.

The deploying owner can sign in without email:

```sh
rer signin --environment production --env-file "$HOME/.config/oncall/production.env"
```

This uses the Cloudflare credentials to write a one-time grant for the recorded
owner into the hosted auth database. It prints a private link once, valid for
one use within 15 minutes; its use is audited. Open it privately and press
**Confirm**. Never redirect or share the output. Run from the original deploying checkout and use
the environment named in its deployment record.

Update this checkout from `main` without resetting its data:

```sh
git pull --ff-only
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env"
```

`rer` installs a pulled change of its own pin before it runs and provides the
pinned Node and pnpm versions. Updates keep the hosted owner and data. Local
and hosted databases are separate; deployment does not upload local records.
Existing hosted secrets are preserved even if the file's values have changed.
To rotate the mail credential or sender after editing the private file, run the
applicable command and repeat the real email sign-in test:

```sh
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --set-secret MAIL_API_KEY
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --set-secret MAIL_FROM
```

`MAIL_API_KEY` reads the file's `SENDGRID_API_KEY`; `MAIL_FROM` reads `MAIL_FROM`.
These explicit changes update the Worker secret without rebuilding.

Removal deletes the hosted database and its records. Use the same Cloudflare
credentials, deployment record and environment:

```sh
rer deploy --environment production --env-file "$HOME/.config/oncall/production.env" --remove --yes
```

This deletes only recorded resources created by that deployment and reads back
that each is absent. Successful removal requires that empty readback. Keep the
record if any step fails and repeat the same command after fixing the reported
cause. Your local folder and local data stay.
