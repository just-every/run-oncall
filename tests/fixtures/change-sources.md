# Change intake fixtures

These public historical bodies are retained verbatim and signed with test-only keys at the network edge. They are not mock application responses or evidence of a live connected account.

- GitHub deployment: https://raw.githubusercontent.com/octokit/webhooks/main/payload-examples/api.github.com/deployment/payload.json
- GitHub published release: https://raw.githubusercontent.com/octokit/webhooks/main/payload-examples/api.github.com/release/published.payload.json
- GitHub closed, unmerged PR: https://raw.githubusercontent.com/octokit/webhooks/main/payload-examples/api.github.com/pull_request/closed.payload.json
- GitHub fixture license: https://raw.githubusercontent.com/octokit/webhooks/main/LICENSE (retained in octokit-LICENSE.txt).
- GitLab deployment: https://gitlab.com/gitlab-org/api/client-go/-/raw/main/testdata/webhooks/deployment.json
- GitLab fixture license: https://gitlab.com/gitlab-org/api/client-go/-/raw/main/LICENSE (retained in gitlab-LICENSE.txt).

The merged-PR case in changes.mjs is explicitly derived from the unmerged example with merged=true, a test merger and current merge timestamp. No captured merged delivery was available. Native/PD-compatible cases use documented schemas and synthetic test inputs. Signatures are generated over the exact sent bytes with each provider's real algorithm. Live GitHub/GitLab/PD sender acceptance remains a contract gap. No GITHUB_TOKEN was available through the named ~/.env entry during this round.
