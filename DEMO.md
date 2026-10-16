# Oncall demo

Run `rer demo` and open its private `RER_OPEN` link. It opens signed in as Alex Morgan in **Oncall Demo**, with six teammates, Checkout API and Payments worker, weekly rotations, cover overrides, escalation policies, two resolved incidents and an open checkout incident with its paging trail. Dates are relative to the start of each demo.

Acknowledge the open incident, or choose **Send test page** in its detail. Paging, SMS, voice, push and email complete through Base's demo effect guard and the incident timeline records the page as sent. No recipient or provider is contacted. Public reads and checks still run for real. There is no demo bar or captured-mail inbox. Ordinary installations retain the existing paging-OFF boundary.

Stop with `rer demo --stop` or Ctrl-C. Each start has fresh data under `.rer/demo/`; edits do not survive another start and the owner's `.wrangler/state` stays untouched.

All copied Base source is pinned together to `rer-v0.2.33` in `base-copies.json`, with provenance in `edition.json` and `sources.lock.json`.

## Hosted demo

`https://demo.run-oncall.com/` runs on rer's native Worker demo host, deployed by `.github/workflows/run-demo.yml` (Base's template) from `deploy-demo.json`. Turnstile admits each visitor into their own Worker Loader isolate with its own SQLite storage, seeded as above and signed in as Alex Morgan. The same demo effect guard completes paging, SMS, voice, push and email without contacting anyone. A copy ends after 60 minutes, 15 idle minutes or on sign-out, and its storage is erased. Base's `default-seed/DEMO.md` (https://github.com/runeditrun/base) describes the run-demo environment, test hosts, upgrades and removal.
