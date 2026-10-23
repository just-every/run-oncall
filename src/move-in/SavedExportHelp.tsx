import {vendorName} from './vendor-formats'

const guides:Record<string,{url:string;shape:string;limits:string}>={
 splunk:{url:'https://portal.victorops.com/public/api-docs.html',shape:'Place saved users responses under users, team lists under teams, current teamsOnCall responses under oncall, and saved integration metadata under integrations. Users may be nested lists. Keep username, email, foreign IDs and timestamps.',limits:'A current on-call snapshot is history, not a recurring schedule. Rotations, escalation repeats and unsupported objects remain named in the journal; no recurring coverage is invented.'},
 jsm:{url:'https://developer.atlassian.com/cloud/jira/service-desk-ops/rest/v2/api-group-schedules/',shape:'Place every saved values page under users, schedules, overrides, escalations or integrations. A schedule includes its rotations. Put scheduleId beside each override response. Users need an exported email or emailAddress; accountId alone does not grant access or establish an email match.',limits:'Only one daily or weekly rotation of individual users and non-overlapping individual overrides can become a paused schedule. Team participants, restricted windows and repeats are named instead of approximated.'},
 betterstack:{url:'https://betterstack.com/docs/uptime/api/list-all-existing-on-call-calendars/',shape:'Place saved JSON:API on-call calendar data pages under schedules, the included user resources under users, and saved calendar events responses under events. Keep every page and resource ID. Put any saved integration metadata under integrations.',limits:'Current on_call_users and finite starts_at/ends_at events do not describe a recurring rotation. Calendar events and original timestamps stay in the journal; they do not become ongoing coverage.'},
}
export function SavedExportHelp({vendor}:{vendor:string}) {
 const guide=guides[vendor]
 if(!guide)return null
 return <details className="move-in-export-help"><summary>How to export from {vendorName(vendor)}</summary>
  <p>File input only. Ask your administrator for saved responses from the documented export/API surfaces. Oncall makes no provider request. <a href={guide.url} target="_blank" rel="noreferrer">Vendor format documentation</a>.</p>
  <ol><li>Save all pages and the details your account permits. Remove every key, token, password, signing secret and credential-bearing calendar URL before saving. A credential-bearing file is refused in full.</li>
  <li>{guide.shape} The top-level bundle is an Oncall assembly convention, not a vendor-generated whole-account export.</li>
  <li>Upload the JSON, review every object and named limitation, then confirm the paused import. An integration says “incumbent key: not supplied”; nothing activates automatically.</li></ol>
  <p>{guide.limits}</p><p>Contact numbers remain unverified history and never count as paging routes. Open incidents and historical timelines remain source evidence, never live delivery.</p>
  <p>Format assumptions are unverified against a live account. A saved file cannot prove account completeness; check every pagination link and object against your own inventory. The local input limit is 512 KiB and 500 source objects.</p>
  <p>Readiness checklist: reconcile your Opsgenie migration before its <strong>5 April 2027</strong> shutdown. Keep the incumbent pager in charge while reviewing differences.</p>
  <a href={'/docs/move-in#'+vendor+'-saved-responses'}>Source-specific assumptions and remaining gaps</a>
 </details>
}
