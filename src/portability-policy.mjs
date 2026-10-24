// One archive policy for `rer export`/`rer import` (scripts/installer/local.mjs) and for the
// restore fence the Worker's person erasure commits (src/move-in/erasure.ts).
export const portabilityPolicy = {
  product: 'just-every/oncall',
  includeTables: ['oc_schedule_records','oc_business_services','oc_erasure_fences','oc_native_prefixes','oc_key_allowances','oc_api_clients','oc_api_endpoints','oc_api_operations','oc_api_outbox','oc_audit_clock', 'oc_admin_audit', 'oc_import_lifecycle', 'oc_members', 'oc_services', 'oc_policies', 'oc_events', 'oc_alerts', 'oc_incidents', 'oc_audit', 'oc_triage', 'oc_changes', 'oc_change_sources', 'oc_intake_sources', 'oc_intake_receipts', 'oc_email_addresses', 'oc_email_rules', 'oc_email_samples', 'oc_email_receipts', 'oc_email_quarantine'],
  replaceableTables: ['oc_audit_clock', 'workspace_control', 'paging_control', 'handoff_state'],
  excludeTables: ['rer_command_receipts','oc_incumbent_credentials','oc_key_rate_usage','oc_key_rate_notified','oc_api_credentials','oc_endpoint_credentials','oc_email_erased_samples', 'oc_email_credentials', 'oc_audit_identities', 'oc_intake_credentials', 'oc_change_credentials', 'credentials', 'sessions', 'sources', 'login_attempts', 'operator_members', 'rer_erasure_blobs', 'rer_erasure_guard', 'rer_erasure_scope'],
  requiredConfiguration: ['OWNER_EMAIL', 'SESSION_SECRET', 'SETUP_TOKEN', 'AUTH_ORIGIN', 'MAIL_PROVIDER', 'MAIL_FROM'],
}
