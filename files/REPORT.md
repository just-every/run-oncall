# Oncall: deliberate hosted mail off
Author: Run Edit Run fleet. Date: 2026-11-15.
Repository: just-every/run-oncall
Branch: cloud/main-oncall-mail-off-1
Candidate: aa6bf82183a90a109a29c0619bca31c64c7028cb
Base checked before publication: de562d49f481af1827a59112dd172dbcc63ae033
No PR was required or created.

Plan and completed work:
1. Incorporated the prepared rer 0.2.118 pin on current main, regenerating the conflicted source lock rather than hand-editing it.
2. Read the package's mail-off documentation and Base foundation facade. Made native setup, operations, deployment preflight, installer and runtime agree on explicit none. Enabled providers retain sender/key and provider-specific requirements; missing or deferred selection never means off.
3. Declared the released guarded rer signin command, disabled email links and invitations honestly, and changed only the existing sign-in frame's mail-off guidance. Existing password members retain their established door; no hosted dev entry was added.
4. Extended the existing member/owner journey, checked the changed screen at 1440 and 390, and ran touched checks plus typecheck. Regenerated the source lock with the pinned package used by Verify. Kept the historical vendored tool intact.
5. Published product commits only to the named cloud branch, preserving published history. Awaited exact-SHA Verify with one REST watcher per candidate, never concurrently, 15 minutes before the first read and at least 300 seconds between reads. Report transport is a separate evidence ref; the fleet owns publication scan and main landing.

Implementation:
- Optional deployment mappings carry MAIL_PROVIDER and enabled-provider inputs into the actual Worker. Fixed Wrangler defaults no longer contradict them.
- Native policy refuses none plus sending credentials, relay/account or DKIM inputs. Missing selection stays unconfigured; an enabled provider with a missing input refuses.
- Runtime none yields no sender. Native email requests return 503 mail_unavailable uniformly; authenticated invitations do the same without creating a pending operator or email token.
- Managed and native delivery specifications agree, including public account inputs, optional credential names and their ordering.
- The transfer privacy check distinguishes a declared public enum from a private sentinel. Every sender, key, token and unknown value remains checked against output and every built artifact. No privacy assertion was removed.

Proof on the corrected head:
- tests/mail-off.mjs#mailOffJourney, invoked by tests/member-coordination-browser.mjs: setup model and validateSetupValue accept none without sender/key/DKIM; native operations, deploy policy, production preflight, managed packaging parity and the public offline deploy command pass. The deployment projection supplies runtime none.
- The same journey: every enabled provider refuses each missing required input; public CLI dry runs refuse incomplete SendGrid input and none plus a key before building; operations also rejects contradictory input.
- The same journey: known owner and unknown addresses both get 503 mail_unavailable for email links and authenticated invitations; no pending person or email token is created. A responder notification is retained with no sender, automatic false and paging off, never sent; zero outbound requests.
- The same journey: schedules and incidents persist across restart; public home/docs/health work; signed-out state and documents reveal no incident. Hosted anonymous bootstrap, local-dev and one-click entry refuse.
- The same journey: the released rer signin handler checks the recorded Worker, account, project, environment and ownership receipt, refuses wrong/replaced targets before issuing a grant, then writes one grant through the fake Cloudflare edge into the real auth D1; native HTTP consumes it once. No sign-in token or email form appears on the public page.
- Browser proof: changed sign-in screen captured at 1440 and 390; assertions run at 1440 with no overflow or serious/critical WCAG violations. Only these two changed-screen captures are selected.
- tests/runtime.mjs with ONCALL_RUNTIME_PART=delivery: exact managed/native specification parity and 18 hosted public links pass on the emitted production Worker.
- tests/transfer.mjs: complete fresh-clone setup/dev/build/preview, offline deploy privacy, archive/import/reset, protected owner mapping, inactive receiving authority and erasure fences pass. The former artifact exclusion assertion now passes while retaining all private inputs.
- The full pre-existing member-coordination journey passed on 70cd214 before the metadata-only correction, including password sign-in, reload attribution, viewer and revoked-session refusals, and paging OFF. The corrected head reruns its focused mail-off leg; branch Verify runs the complete journey again.

Actual receipts:
- checks-final.json: corrected-head typecheck, installed source-lock check, contract generator check, native export journey, first-party rer check and diff check all exit 0.
- journeys-final.json: corrected-head delivery, full fresh-clone transfer and focused mail-off commands all exit 0; log and screenshot hashes.
- product.json and product-push-fix.txt: exact product head and successful guarded push.
- Earlier checks.json, journeys.json, member-full.txt and their selected logs describe the initial 70cd214 candidate. They are retained as earlier actual receipts, not relabeled as corrected-head proof.

Counts:
- rer 0.2.113 -> 0.2.118.
- Product version 0.5.15 -> 0.5.15; migrations 68 -> 68.
- CI journey command entries 18 -> 18; no test registration added or removed.
- No CONTRACT.md Status, Gap or Evidence cell or clause text changes; no generated acceptance/claims view committed; clause status changes: zero.

CI:
- Initial Verify 43738779447 on 70cd214eee0b2706bcd90ea9a90961bc645fe530 failed runtime job 132887745398 on spec parity and transfer job 132887745415 on the public-enum/private-sentinel confusion. Build, source-lock validation and browser passed. Both failed job archives were read once; ci-failures.json and selected assertion excerpts retain actual diagnostics without workflow environment dumps.
- Corrected Verify 43740686605 is on aa6bf82183a90a109a29c0619bca31c64c7028cb. Its observed first attempt was cancelled: build and all seven non-browser shards passed, including the corrected runtime and transfer journeys. Browser job 132893586182 was cancelled after about 15 minutes; the jobs API reported no failed assertion step. The aggregate verify job 132897947247 consequently failed. The one allowed failed-jobs rerun was requested and accepted with HTTP 201; it was not polled afterward because the ten-call task budget was exhausted. ci-run.json, ci-jobs.json and ci-rerun-request.json preserve those separate observations. No exact-SHA green is claimed.
- No main or default branch was pushed; no published commit was rewritten. Product commits are 38541c39e74f57c4c2d1770aac28155f0dc5fb5c (save, skip ci), 70cd214eee0b2706bcd90ea9a90961bc645fe530, and aa6bf82183a90a109a29c0619bca31c64c7028cb. All authors/committers are fleet identity, with no trailers. The final candidate has no skip marker.

CLAIM OC-018 PARTIAL points=none tests=tests/mail-off.mjs#mailOffJourney; tests/transfer.mjs#managed
DEFAULT OC-018: only explicit none disables mail; the recorded deploying owner uses rer signin and existing password members retain their established sign-in door.
GAP OC-018: no new real hosted field proof or live delivery claim. Historical R-1 and R-2 entries printed by the health journey are dated prior evidence, explicitly not executed in this run. This bounded adoption claim does not promote a contract status.

No real deployment, provider account operation or live mail was performed. Paging remains OFF; no independent standby or delivery guarantee is claimed. The Cloudflare provider edge is faked only for the released owner CLI; application auth, D1, HTTP and authority remain native. The local test edge forwards a canonical HTTPS origin without weakening application host/origin checks.

— Run Edit Run fleet, 2026-11-15

Terminal custody: product branch PUSHED at aa6bf82183a90a109a29c0619bca31c64c7028cb; CI retry accepted, green not yet observed. This is not READY or a landing claim. Local touched checks and journeys all pass. No product defect is known to remain; the unresolved verification item is the cancelled browser shard and its unobserved retry.
