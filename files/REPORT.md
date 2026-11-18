# PagerDuty import gate fixes

Compared the built Worker and D1 at three revisions on 18 November 2026 UTC.

| Revision | Commit |
| --- | --- |
| Gate baseline | `fb54c79d904d66342f166910d64996aa399bddf9` |
| Previous candidate | `f14b9337969e42646cc7a36272ac1e7fb6e4e8a2` |
| Fixed candidate | `99d5821836301d0cf2c7788625f92df2c335427d` |
| Main used for the fixed candidate | `76e7ed5eb83d6cf3dba8b591a10cf63028eb4f4a` |

| Public-door trigger | Previous candidate | Fixed candidate |
| --- | --- | --- |
| A1. Re-upload the same bytes through the administrator door after applying on the baseline and retaining its database | 409 `snapshot_mapping_changed_use_new_namespace` | 200. Apply reused the same completed job. Every native object and revision matched the pre-replay readback. |
| A2. Apply 40 users, then reverse the saved list and submit it via signed bounded Business catch-up | 409 `catchup_requires_proposal:change_must_be_under_five_percent` | 200 with 0 created, 0 updated, 40 unchanged and 0 gone. |
| A3. Preview two empty subscriber pages for two business services | 400 `Incomplete PagerDuty subscribers pagination` | 200. The plan included the user, both individually refused services and both empty-list pointers. |
| A4. Preview `pagerduty-layers.json` | Layer 0 start and member were mapped to primary. Layer 2 start and member were retained in the journal. | Layer 2 start and member map to the paused primary anchored at `2026-03-02T09:00`. The two ended layers supply history, with member fields retained for review. |

The 1440 and 390 browser runs opened the original 498-object account in Move in. Both copied and downloaded the exact 6,211-field report, expanded the object list through its last entry and fit the viewport. Screenshots show the summary and the end of the expanded list at each width.

[Gate baseline output](base-heldout.json) · [Previous candidate output](previous-heldout.json) · [Fixed candidate output](fixed-heldout.json)

[1440 summary](fixed-summary-1440.png) · [1440 expanded](fixed-expanded-1440.png) · [390 summary](fixed-summary-390.png) · [390 expanded](fixed-expanded-390.png)

The pinned source lock, contract documents, fixture comparison and typecheck passed. The built import-door and focused Move in browser journeys passed on the fixed head. The import-door journey accounted for 498 objects and 6,211 field decisions, verified both doors with 132 paused targets, resumed from a checkpoint after restart, reconciled, and undid the changes in order. Erasure and credential refusal passed in the same journey. The explicit response-binding case also refused two offset-zero responses assigned to one parent.

Signed Codex 2026-11-18T00:10:37Z.
