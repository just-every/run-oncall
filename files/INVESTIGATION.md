# Independent investigation

Author: Run Edit Run fleet (read-only trace_connect agent). Date: 2026-11-15 UTC.

Disposition: already safe; alert #20 appears false positive. No remediation commit exists or is needed for the reported path.

Facts:
- src/move-in/ConnectStep.tsx:24 takes the region select event.target.value; line 10 initializes us. The two ordinary options are us and eu. The TypeScript assertion as Region is not runtime sanitization.
- Line 30 appends region after the literal /api/move-in/pagerduty/start?region=. Arbitrary suffix content cannot replace that URL's scheme, origin or pathname. JSX assigns the href attribute through React; quotation marks do not produce additional HTML attributes.
- src/move-in/pagerduty-oauth.ts:88 canonicalizes exact eu to eu and everything else to us. Line 16 selects one of two literal PagerDuty identity origins. Lines 94-96 construct /oauth/authorize with URL and URLSearchParams. Line 85 checks current administrator authority.
- src/move-in/MoveIn.tsx:111-115 exposes this component to administrators. Source state is initialized locally at line 33. Region has no prop, URL query, upload or server-data initialization.
- git history contains only introduction commit 4e83731196a33c6ccd4ca0a97cb18f9a84810d52 (2026-10-27) for this file. It is unchanged through 98d633ee7d20ebbb1d68842eaab998bbdffb284b, so the safety properties predate the reported October 28 alert.

Compatibility invariants: keep the same-origin OAuth-start path, exact US/EU behavior, fixed identity hosts, administrator checks, and read-only-key fallback. Encoding or region validation would be optional hardening, not a demonstrated XSS fix.

Independent validation: an isolated Node URL parser probe passed for ten ordinary/adversarial suffixes, including javascript:, external URLs, newline, quote/tag injection, query/fragment, and backslash. This was a parser check rather than an emitted browser test. No files or network state were changed by the investigator.

Existing tests: tests/import-door.mjs:347-350 verifies both regional OAuth identity hosts; tests/product-browser-journey.mjs:335-341 exercises the read-key branch. Neither directly probes hostile region values. The parent subsequently supplied the emitted-Worker/Chromium probe retained in this packet.

Inference: js/xss-through-dom likely treated the href as a general dangerous URL sink without retaining the decisive fixed local prefix. The exact alert trace could not be retrieved because the injected GitHub integration returned HTTP 403; the finding is classified from the supplied location, current source, its history and focused runtime evidence.
