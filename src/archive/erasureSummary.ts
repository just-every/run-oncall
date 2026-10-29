type Stores = Record<string, {deleted?: number; updated?: number}>;
const keyTables = ['sources', 'oc_intake_credentials', 'oc_incumbent_credentials', 'oc_change_credentials', 'oc_endpoint_credentials', 'oc_api_credentials', 'oc_email_credentials'];
const things: [table: string, one: string, many: string][] = [
  ['oc_events', 'event', 'events'], ['oc_alerts', 'alert', 'alerts'],
  ['oc_changes', 'change', 'changes'], ['oc_email_receipts', 'email', 'emails'], ['oc_email_samples', 'saved email', 'saved emails'],
];
const receipts = 'oc_intake_receipts';
/** What an erase removed, in plain words: "Gate PD source erased: its key and 0 receipts". */
export function erasureSummary(name: string, stores: Stores = {}) {
  const parts: string[] = [];
  if (keyTables.some(table => stores[table]?.deleted)) parts.push('its key');
  // A key's receipts are always named, even at none; the rest only when something went.
  if (stores[receipts]) parts.push(`${stores[receipts].deleted ?? 0} ${stores[receipts].deleted === 1 ? 'receipt' : 'receipts'}`);
  for (const [table, one, many] of things) {
    const deleted = stores[table]?.deleted;
    if (deleted) parts.push(`${deleted} ${deleted === 1 ? one : many}`);
  }
  if (!parts.length) return `${name} erased.`;
  return `${name} erased: ${parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts.at(-1) : parts[0]}.`;
}
