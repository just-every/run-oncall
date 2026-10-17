// One archive policy for `rer export`/`rer import` (scripts/installer/local.mjs) and for the
// restore fence the Worker's person erasure commits (src/move-in/erasure.ts).
export const portabilityPolicy = {
  product: 'just-every/oncall',
  includeTables: ['oc_members', 'oc_services', 'oc_policies', 'oc_events', 'oc_alerts', 'oc_incidents', 'oc_audit', 'oc_triage'],
  replaceableTables: ['workspace_control', 'paging_control', 'handoff_state'],
  excludeTables: ['credentials', 'sessions', 'sources', 'login_attempts', 'operator_members', 'rer_erasure_blobs', 'rer_erasure_guard', 'rer_erasure_scope'],
  requiredConfiguration: ['OWNER_EMAIL', 'SESSION_SECRET', 'SETUP_TOKEN', 'AUTH_ORIGIN', 'MAIL_PROVIDER', 'MAIL_FROM'],
}
