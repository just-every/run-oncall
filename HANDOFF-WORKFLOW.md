# Reviewed handoffs remain unsent

The protected `/api/handoffs` API retains prepared copy, exact review, withdrawal and source drift diagnostics. A review never grants sending or publication authority. `/api/recovery/checkpoint` captures coordination, schedules and handoffs together; explicit replacement validates the checkpoint and holds old approvals for review.

The held-password helper `node scripts/handoffs.mjs --help` accepts an existing private password-session file. New installations use Base identity and the protected HTTP API. No paging login or dispatch helper remains. Complete installation transfer uses the root `rer export/import` commands, excludes credentials and requires an explicit archived-administrator mapping after the new owner signs in.
