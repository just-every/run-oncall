# Runnable newcomer recipes: main-oncall-runnable-samples-1

Repository: just-every/run-oncall. Product branch: cloud/main-oncall-runnable-samples-1.

The move-in exporter and the compatible-intake samples now work using the README installer's runtime and system shell tools. No separate Node install or Base change is required. CONTRACT.md, its judgments, ACCEPTANCE.md and docs/CLAIMS.md were unchanged.

## Plan and scope

The complete execution plan is in PLAN.md. Reproduce both reports on main, use existing installer doors, share one compatible sender recipe between the source and routed-key setup, extend existing browser coverage, run touched checks, update from main and regenerate the source lock, push only the named product branch, observe exact-SHA Verify, and return the report packet through the separate evidence ref. Receiver protocols, signing and exporter collection logic are unchanged. Historical 0.1.0 upgrade recipes remain intact.

## Before and after

Two reported failures became zero. On main 8adae6c836f2fabda29e8a091b052450410c8ca5, the real Move in fallback displayed `node oncall-export.mjs opsgenie`; `node --version` exited 127 on the installer-only PATH. The real PagerDuty-compatible source displayed POST plus separate raw header/body JSON; pasting it into the same shell exited 2. baseline-receipt.json contains those actual commands, exit codes and diagnostics.

The exporter instructions now use `rer run --script ./oncall-export.mjs opsgenie` or `pagerduty`, preserving provider arguments and the hidden-key prompt. The same runtime door replaces direct-node recipes for the private checkpoint CLI and Playwright browser installation in the newcomer docs. Help text in the exporter and checkpoint CLI follows these recipes; the downloadable exporter is regenerated from its source. The exporter page explains the installer/update and PATH step before use, including WSL for Windows.

PagerDuty, Opsgenie and Splunk samples use complete curl recipes with the current receiver origin. Keys come from ONCALL_SOURCE_KEY; PagerDuty JSON escapes the printable key bytes, Opsgenie uses its authorization header, and Splunk percent-encodes the key path segment. The source page and routed-key setup share the same renderer. The sample is deliberately disclosed in details; no standalone raw protocol fragments appear on the default source screen.

The two existing browser journeys remain two; zero registrations were added or removed. eventsSourceBrowser now executes copied compatible samples, checks incumbent-shaped success and the event's bound source/service, while keeping its existing trigger/recovery/refusal assertions. providerExport's copy assertion selects the labeled export command now that the panel also shows an installer command. Contract status counts remain 26 done / 41 partial / 34 missing, 101 rows before and after. No status change or DONE claim is made.

## Local results

- Fleet launcher refresh, decrypted-bundle Git helper and commit hook were installed. The Git identity is Run Edit Run fleet. No other repository was cloned.
- `npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive` completed through cloud_run.
- Typecheck and production build passed. The source lock was generated with `node scripts/edition-authoring/cli.mjs lock` and checked with the same tool's check. Contract-document check passed without modifying the generated views.
- Focused existing `tests/product-browser.mjs` journeys: events-source and move-in-guide passed. Assertions use desktop width 1440; screenshots include 1440 and 390. No full local verify or unrelated suite was run.
- A fresh installer-only shell used rer 0.2.115 and its private Node 22.20.0. PATH contained only the installer bin and system directories; no global node was available. The downloaded exporters' help exited 0, and both displayed provider commands reached the account-region prompt in a PTY; they were stopped before key entry or provider requests. Checkpoint help exited 0. The documented Playwright install command actually installed Chromium and exited 0.
- The copied compatible samples, executed unchanged with the key only in the environment, returned PagerDuty 202, Opsgenie 202 and Splunk 200 through the emitted Worker's public endpoints. Protected state confirmed events on their bound source and service. recipe-receipt.json records commands, response status/body and proof limits without keys.
- Ten final browser screenshots show both exporter panels and all three compatible samples at 1440 and 390. These are under screens/; no evidence is committed to the product branch.

## Limits and clause claims

This is local emitted-Worker and synthetic-source evidence. No live provider account or real export, paging, cutover or hosted delivery is claimed. No new acceptance point is added and no whole clause is promoted. OC-018, OC-038 and OC-055 remain partial. This narrow recipe fix does not finish their broader acceptance points.

CLAIM OC-038 PARTIAL points=none tests=tests/product-browser-journey.mjs#providerExport
CLAIM OC-055 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser

BASE: none; standalone `rer run --script` already exists in the installed runtime.

## Product and evidence custody

Final product SHA, push result and exact-SHA CI observations are recorded in product-receipt.json and ci-receipt.json. PLAN.md, this report, receipts, relevant passing logs and explicitly selected final screenshots are transferred only through refs/heads/evidence/main-oncall-runnable-samples-1. The report-only ref is not a product READY or landing signal. The fleet's publication scan and landing stay on the Mac; the cloud does not publish main.

Product pushed successfully on its first attempt: `f4654e755dbb7e580c51321a35cfb72f5b5e402c`. There is no PR requirement in the repository landing rules, so no PR was opened. The product checkout is clean. Main was fetched and the branch rebased before the first push; main had not advanced. The final head has no skip-CI marker.

Exact-SHA Verify: run 43544330214, https://github.com/just-every/run-oncall/actions/runs/43544330214. At the first observed run status it was in progress on the product SHA; consult ci-receipt.json for subsequent observations.
