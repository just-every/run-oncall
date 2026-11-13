# Release note source evidence

Comparison: released v0.5.11 tree (tag 20c636ce167fb7439b55c1cd13d380ebfbd35b40) to main 37fd6d2446588971e8c611b826461d01eb192a0d. These are existing main changes, not product changes made by this metadata candidate.

- Bulk selections/revisions, selected merge target and retained merge results: src/app/IncidentBulkActions.tsx and src/app/IncidentTriage.tsx.
- Clickable follow-up evidence: src/reviews/work.css removes the overlapping absolute-positioned action layout.
- Existing business-service audience editing: src/business-status/StatusAudience.tsx, StatusPanel.tsx and model.ts; removal retires excluded stakeholder subscriptions/notices.
- Explicit responders:read and active responder/admin ID/name lookup: src/automation/model.ts and api.ts, src/agent-door/read-tools.ts and rest.ts; documented in docs/response-api.md and docs/agents.md.
- Saved guided policy editing with advanced-document fallback for unrepresentable settings: src/modules/agent-door/pages.ts and page-style.ts.
- Readable sender names/service scope and nested key identifiers: src/routing/RoutedSenderSetup.tsx, RoutedKeyCreate.tsx, RoutingWorkspace.tsx and src/integrations/RequestExample.tsx.
- Readable source names in audit and product name in Readiness: src/archive/ConfigurationAudit.tsx and src/readiness/ReadinessPage.tsx.
- Test refusal guidance and PagerDuty-compatible key reuse for recovery: src/integrations/SourceTest.tsx, SourcePage.tsx and key-refusals.ts.
- Rendered-overflow timeline hint: src/on-call/WeekBands.tsx.
- No migration or dependency-pin differences: the released-to-main diff changes no migration files or package.json. The metadata candidate keeps @runeditrun/rer 0.2.108 and pnpm-lock.yaml unchanged.

The notes make no new delivery, cutover, paging or contract-completion claims.
