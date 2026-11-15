# Independent investigation and candidate review

Author: Run Edit Run fleet (Codex), 2026-11-15 UTC. The two read-only agents below were requested by the fix-finding skill. Neither edited files, invoked network/API calls, cloned repositories, or ran tests.

## Before implementation

The investigator traced the sole application RE2JS import to src/routing/definition.ts. Patterns are authored through protected routing/email administration and move-in configuration. Provider routing uses bounded projected fields; email retains up to 256 KiB of decoded text. Runtime sinks are src/routing/engine.ts:25,35 and src/email/rules.ts:28,35, using test() or one find() and capture extraction. Imported email rules use the same compilation boundary and groupCount(). Existing routing and import-door journeys cover matching, captures, unsupported expressions, replay and inactive restore. Length and rate limits alone do not prove general complexity safety.

The parent independently inspected the dependency documentation and fetched the public advisory. It confirmed that LOOKBEHINDS is opt-in and that the application's compile(value) supplies no flag; both positive and negative lookbehind are refused in 2.8.6 under that default. The advisory specifically requires opt-in lookbehind with repeated matching. No currently exposed advisory trigger was demonstrated. The declared package remains in the advisory's affected range, so the requested minimal dependency update is retained.

## Candidate review

A fresh reviewer inspected only the finding, repository policy and candidate diff. It reported no concrete bypass, regression, unresolved vulnerable dependency or tracked scope drift. The direct declaration, importer, package and snapshot select only 2.8.7. The Node requirement increase from >=18 to >=20 is met by the project/CI pin 22.20.0. ESM exports and compile/test/matcher/find/group/groupCount APIs remain present. Installed source retains lookbehind state between repeated matches. Source-lock hashes match the dependency files. Only package.json, pnpm-lock.yaml and sources.lock.json are changed.

The reviewer supplied source-backed paths; the parent reconciled them with its own source inspection. No additional patch was needed. All original tests and assertions remain intact.

## Process deviation

I used a fresh read-only candidate-review agent under the optional fix-finding skill, despite the supplied builder rule against agents checking one's own work. The builder rule should have taken precedence. The reviewer made no edits, network/API calls or test runs. I independently inspected the full three-file diff, verified source-lock hashes, ran the affected checks, and audited the committed candidate before publication. No further agents were used. This deviation changes no product behavior or gate result.
