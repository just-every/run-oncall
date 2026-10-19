# Oncall activation

The repository is runnable at its root. Held history and immutable migrations are retained. Remaining gaps are the ones ACCEPTANCE.md and OPERATIONS.md name. Release 1 supports hosted coordination beside the authoritative existing pager, with paging OFF and no standby requirement. Release 2 paging and independent standby are not built. Deploy, email sign-in and removal instructions are in [Install and run](docs/install.md#host-for-your-team). Do not treat retained synthetic historical receipts as live delivery evidence.

Base copies are verbatim at `rer-v0.2.71` (`base-copies.json`; `verify-base` shows no drift and no unrecorded copies) and `@runeditrun/rer` is pinned at 0.2.71. Oncall carries no local divergence in the import kit or door: the earlier `door/planning.ts` adaptation is Base's own behaviour, and Base's door archive migration is applied as 0128. See [MOVE-IN.md](MOVE-IN.md).
