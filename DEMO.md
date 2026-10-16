# Oncall demo

Run `rer demo` and open its private `RER_OPEN` link. It opens signed in as Alex Morgan in **Oncall Demo**, with six teammates, Checkout API and Payments worker, weekly rotations, cover overrides, escalation policies, two resolved incidents and an open checkout incident with its paging trail. Dates are relative to the start of each demo.

Acknowledge the open incident, or choose **Send test page** in its detail. Paging, SMS, voice, push and email complete through Base's demo effect guard and the incident timeline records the page as sent. No recipient or provider is contacted. Public reads and checks still run for real. There is no demo bar or captured-mail inbox. Ordinary installations retain the existing paging-OFF boundary.

Stop with `rer demo --stop` or Ctrl-C. Each start has fresh data under `.rer/demo/`; edits do not survive another start and the owner's `.wrangler/state` stays untouched.

All copied Base source is pinned together to `rer-v0.2.27` in `base-copies.json`, with provenance in `edition.json` and `sources.lock.json`. `deploy-demo.json` and `.github/workflows/run-demo.yml` prepare the hosted demo. `rer deploy --demo --dry-run` on 0.2.27 still requires a container declaration. Container adoption is intentionally deferred: retry the dry run, native hosting and the homepage CTA after the native Worker runtime release.
