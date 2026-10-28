# Agents for incident coordination

Oncall's agent door is `/mcp`. Discovery at
`/.well-known/oauth-protected-resource/mcp` names the canonical audience and
scopes. It supports MCP versions 2026-07-28 and 2025-11-25. Tools, resources and
the response-shift prompt come from one server registry.

An agent acts **for a currently admitted native member**. Business tokens bind
their subject to a signed `owner_id` or team `id`; token email never selects an
account. The claimed owner's existing domain-member link supplies the owner
binding. A teammate needs an existing local account and an explicit native
administrator binding. An unbound teammate gets no agent authority. No
invitations or new operational accounts are created.

An administrator can inspect `GET /api/agent-members`, then use their native
session and same-origin `POST /api/agent-members` with `{business_id,member_id}`.
This binds existing accounts without promotion. A Business admin must already
be a native admin; a Business member keeps their explicitly bound native role.
Business teams supply no private-team enforcement.

Existing scoped service-account credentials remain usable at `/api/v1` and
through MCP. They retain their creating administrator, exact services,
permissions, revocation and revisions. They cannot manage members, credentials,
archive or exports. Demotion or removal suspends the client; another
administrator never inherits it.

## Company policy and people

The company chooses autonomous, review, approval or blocked for each class.
Oncall supplies no approval presets. Unanswered or expired policy and local or
Business Pause refuse agent work. People can continue native coordination.
Open **Agents** at `/agents` to inspect agents, decisions, review and approval.
A real named person decides against the exact revision and summary hash.

Signed settings use `/api/rer/business-settings`; signed policy uses
`/api/rer/agent-policy` with `{policy:<signed JWS>}`. Standalone owners configure
policy through the native Agents person door. Agent credentials cannot set
policy or Pause. Consent and agent revocation apply again at queued event
network admission.

Mutations accept the shared `idempotency_key` and native `expected_revision`.
Reuse the same key after an uncertain response; changed arguments conflict.
Reload stale records. Approval binds the proposed content and native evidence.

## A response shift

Read the service, runbook, source observations, changes and actual coverage.
Declare an incident, acknowledge it **naming an active responder**, add notes
and create follow-ups. Native history names the agent or client **for the
sponsor**; naming a responder is not that person's attestation.

Submit cited follow-up evidence. A `human-review` action, including every P1
follow-up, stays open until an eligible person accepts in the native screen.
There is no machine acceptance tool. Agent assertions, source observations,
recovery evidence and human acceptance remain distinct. Agent recovery evidence
does not produce a human recovery-attestation measurement. Response reports
count machine acknowledgments separately from person workload.

Closing a declared incident with its summary and evidence is a `commitment`.
It measures one nonmonetary sign-off, using `XXX` (no currency), not a payment.
Changing a member's eligibility for current or future coverage adds `live` to
the access change. Local erasure is `destructive` and also carries `live`,
`access` or `security` when it removes pending delivery, standing authority or
credentials. The server derives those classes from current native records.

Preview a complete coverage change, then apply the same native review digest.
Intervening schedule or membership changes require another review. Overrides
retain owned-coverage permissions and native history. Active coordination
coverage is classified `live`; it never enables a paging executor.

Automation admits one already approved endpoint's frozen minimal event. The
body contains only operation ID, type, service ID, incident ID, revision, state
and time. Public IPv4 HTTPS restrictions, signing custody, creator/client/
receiver revisions and the durable lease remain in force. Only an authenticated
receiver receipt establishes acceptance. Timeout or a missing receipt remains
uncertain; replay never blindly resends uncertain work.
Queued work retains its original agent, sponsor, consent and client revision.
A replacement token cannot take it over after consent revocation.

## Boundaries

- **Paging remains OFF.** No SMS, voice, push, remediation or independent standby
  capability is added. Continue using the existing pager.
- Access tools cannot widen their sponsor or originating agent. Client and
  endpoint updates only revoke. Provisioning, password setup, rotation and
  secret reveal remain in native person screens.
- Import apply/restore stays in the explicit import and installation doors.
  Import status reads confer no login, send or apply authority.
- No money-moving tool exists. Shared provider spend caps are **not enforced**;
  a cap document supplies no spend guarantee.

Discovery describes the implemented release-1 coordination registry. The
contract's target Agent surface also names future jobs and a different tool
table; that target is not an availability claim. The matching Base verifier
and reviewer continuation remain dependencies. Required assertions remain
enforced, with named, dated dependencies in `tests/agent-pending.mjs`; full
conformance and release acceptance remain unestablished.
