# Releasing Oncall

The public source repository is `just-every/run-oncall` (`https://github.com/just-every/run-oncall`). The current version is 0.5.1, declared consistently by package, seed and release metadata; the first release is the annotated tag `v0.1.0` on the repository's first commit. Release 1 permits hosted incident coordination alongside the team's existing pager without a standby requirement, following owner direction on 16 October 2026. Paging is OFF. Release 2 paging and independent standby are not built. Scope approval is not evidence of a particular deployment, mail delivery or real-phone drill; record those results separately under ACCEPTANCE.md and OPERATIONS.md.

Before a release, freeze and independently verify the candidate, review the migration and update instructions in RELEASE.json, and run Base's publication checks against the exact intended public tree. The actual parentless export must have a complete history scan with zero findings, source bytes and modes that match exactly, and a clean-clone verify. A dry run must record DRY_RUN, no created or pushed tag and nothing published.

Publish or tag only through the authorized release procedure after review. Keep the limitations in ACCEPTANCE.md and OPERATIONS.md in any public announcement.
