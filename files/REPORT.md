# Oncall dependency alert 65

Codex, 18 November 2026

## Result

No product change. GitHub withdrew GHSA-fc5q-39xc-vjpf at 15:38:56 UTC on 18 November 2026, before the fleet alert was recorded at 20:55:25 UTC. The advisory links to the picomatch maintainer's explanation that the reported behavior concerns caller-controlled glob patterns. The CVE record remains marked PUBLISHED. This assessment applies to the Oncall deployment on main, where the flagged package is absent from the emitted client and Worker JavaScript.

- GitHub Advisory Database entry GHSA-fc5q-39xc-vjpf
- [Upstream maintainer explanation](https://github.com/micromatch/picomatch/pull/235#issuecomment-6315749381)
- [CVE record](https://www.cve.org/CVERecord?id=CVE-2026-112366)

## Plan and findings

1. Compare the advisory range and any fixed version with the committed lockfile and npm registry. The historical range is through 4.0.7. GitHub lists no first patched version and the public npm registry's latest picomatch version is 4.0.7. The lockfile already resolves to that version.
2. Trace every incoming lockfile edge and check where the package executes. One picomatch resolution has five direct parents. TanStack Start's plugin core, tinyglobby, unplugin and Vite declare it as a dependency. fdir uses it as an optional peer. From the root, TanStack React Start reaches these build tools even though React Start is a production dependency. Vite is also a development dependency and a peer of the Cloudflare and React Vite plugins. The installed matcher call sites consume build plugin configuration, filesystem glob patterns, and module paths. The checkout supplies its Vite config and uses TanStack Start's default plugin configuration. The checked source has no direct application matcher import.
3. Verify what the checked-out application ships. Frozen install, the standard rer build and typecheck all passed with Node 22.20.0 and pnpm 10.12.4. A local source-map build mapped 41 of 41 browser scripts and 61 of 62 Worker-side scripts. The one unmapped file is the generated TanStack route manifest, inspected separately. No emitted script imports or refers to picomatch, and none of the source maps contains a picomatch module. The check also covered tinyglobby and TanStack Start's plugin core. This verifies the affected matcher is absent from the shipped JavaScript. No tests were added or rerun because no product code or dependency resolution changed.
4. Preserve the clean checkout and return the evidence. Main advertised 82a4b02d2be3a0031afbeb08bca7ccdd25cc5a72 during the run. The local branch cloud/gr-mt-oncall-dep-9 points at the same commit. There is no product commit, PR or candidate CI run. Contract counts remain 26 done, 41 partial and 34 missing. There were no clause status changes.

## Remaining visibility

The repository-specific Dependabot endpoint returned HTTP 403, Resource not accessible by integration, on five attempts. The withdrawn public GHSA and the exact-main artifact inspection establish the basis for this no-change disposition. The repository alert's internal state remains unverified. No alert state was edited.

Lockfile evidence is pnpm-lock.yaml from the clean exact-main checkout, SHA-256 77353f7c25d4a50d34b00a295f0a064cfd72160a31b4473e8d358ee48f26d243.
