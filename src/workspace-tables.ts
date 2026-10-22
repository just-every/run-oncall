export const tables = {keyAllowances:'oc_key_allowances',apiClients:'oc_api_clients',apiEndpoints:'oc_api_endpoints',apiOperations:'oc_api_operations',apiOutbox:'oc_api_outbox',members:'oc_members',services:'oc_services',policies:'oc_policies',events:'oc_events',alerts:'oc_alerts',incidents:'oc_incidents',audit:'oc_audit',triage:'oc_triage',changes:'oc_changes',changeSources:'oc_change_sources',intakeSources:'oc_intake_sources',intakeReceipts:'oc_intake_receipts',emailAddresses:'oc_email_addresses',emailRules:'oc_email_rules',emailSamples:'oc_email_samples',emailReceipts:'oc_email_receipts',emailQuarantine:'oc_email_quarantine'} as const;
export type Collection=keyof typeof tables;
export const collections=Object.keys(tables) as Collection[];
export const partialCollections=new Set<Collection>(['events','alerts','audit','intakeReceipts','intakeSources']);
export function authoredRow(key:Collection,row:any) {
 if(['apiOutbox','events','alerts','intakeReceipts'].includes(key))return false;
 if(key==='audit')return !row.actor.startsWith('source:');
 if(key==='intakeSources')return !(row.id.startsWith('native:')&&row.name.startsWith('Native incomplete: '));
 return true;
}
export function authoredSql(key:Collection,prefix='') {
 if(['apiOutbox','events','alerts','intakeReceipts'].includes(key))return '0';
 const data=prefix+'data';
 if(key==='audit')return `substr(json_extract(${data},'$.actor'),1,7)<>'source:'`;
 if(key==='intakeSources')return `NOT(substr(${prefix}id,1,7)='native:' AND substr(json_extract(${data},'$.name'),1,length('Native incomplete: '))='Native incomplete: ')`;
 return '1';
}
