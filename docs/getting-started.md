# Getting started

Oncall runs on your own computer first. Open a terminal (on a Mac, Terminal in Applications → Utilities; on Windows, your WSL2 distribution), copy this line into it and press Enter:

```sh
curl -fsSL https://runeditrun.com/install.sh | sh -s -- dev just-every/run-oncall
```

Git is required; rer brings Node and pnpm. Already have Node 22 or later? `npx -y @runeditrun/rer dev just-every/run-oncall` does the same.

The line installs `rer`, the Run Edit Run command, clones Oncall into a `run-oncall` folder, installs everything, prepares the local database and a local owner, and starts Oncall. It prints a private `RER_OPEN` link: open it on the same computer and you are signed in as the owner. Treat it like a password. The first time, Oncall opens **Finish setup**: tick *I confirm this owner account is ready to use* and press **Finish setup**. This free copy runs only on your computer: it sends no email, and nobody else can open it.

If the installer prints a line that puts `rer` on your PATH, run that line too. To start Oncall again later, run the same line from the same folder, or `cd run-oncall && rer dev`. `rer dev --stop` stops it.

Next: [Install and run](install.md) covers explicit setup, updates and hosting Oncall for your team.
