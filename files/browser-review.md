# Browser review

Candidate: b094e12602a77d199f94ee85aab3cba4418e82ce
Journey: ONCALL_MEMBER_JOURNEY=incident-saves node tests/member-coordination-browser.mjs
Browser: /usr/bin/chromium, headless, --no-sandbox, real HOME; context is isolated and synthetic.

The journey passed and all twelve PNGs were opened for visual inspection. Each of the six states has one 1440-wide and one 390-wide capture:

- Runbook saved: Saved remains beside the runbook label; both synthetic steps read back through the public state door.
- Runbook error: entered text remains, success feedback is absent, the failure message and Retry stay visible. Retry persists the third step across reload.
- Incident header: only present fields render; no empty separator slot. At 390, the timestamp starts its own line without a leading dot.
- Review error: the unsaved draft remains visible with the failure message and Retry; no success feedback.
- Review saved: Review, Root cause and Impact each retain Saved after the prior two-second timeout. Draft edits add zero incident timeline entries.
- Accepted timeline: one attributed human-accepted review appears, alongside the pre-existing transitions. The phone layout stays within the viewport.

The maintained journey asserts the changed flows at 1440 and checks the phone-specific separator behavior at 390. It also checks serious/critical accessibility violations. Screens are proof artifacts only and are outside the product checkout.
