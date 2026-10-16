import type { ReactNode } from 'react'
import './export-help.css'

const opsDocs = 'https://docs.opsgenie.com/docs/'
const pdDocs = 'https://docs.pagerduty.com/developer/api/reference/rest/'

function Endpoint({path,href,children}:{path:string;href:string;children:ReactNode}) {
 return <li><code>GET {path}</code><p>{children} <a href={href} target="_blank" rel="noreferrer">Provider reference</a></p></li>
}

export function ExportHelp({vendor}:{vendor:string}) {
 const ops=vendor==='opsgenie',name=ops?'Opsgenie':'PagerDuty'
 const template=JSON.stringify(ops?{users:[],schedules:[],overrides:[],escalations:[],timelines:[]}:{users:[],schedules:[],overrides:[],escalation_policies:[]},null,2)
 return <details className="move-in-export-help" key={vendor}>
  <summary>How to export from {name}</summary>
  <p>Prepare one JSON bundle using the steps below. Calendar (.ics) and CSV downloads cannot supply the rotation settings this importer needs. Oncall only reads the file you choose; your existing pager stays in charge.</p>
  <h3>1. Get read-only access in {name}</h3>
  {ops?<>
   <p>Ask your Opsgenie administrator for an API integration key with configuration access and read-only access. In the integration settings, select <strong>Limit to Read-Only Access</strong> and leave <strong>Restrict Access to Configurations</strong> unselected. <a href={opsDocs+'api-integration'} target="_blank" rel="noreferrer">API integration</a> · <a href={opsDocs+'api-access-management'} target="_blank" rel="noreferrer">Access settings</a></p>
   <p>In your API client, use base URL <code>https://api.opsgenie.com</code>, or <code>https://api.eu.opsgenie.com</code> for an EU account. Add the request header <code>Authorization: GenieKey YOUR_API_KEY</code>, replacing the placeholder privately in that client.</p>
  </>:<>
   <p>Ask your PagerDuty administrator for a read-only REST API key. To create one in PagerDuty, open <strong>Integrations → API Access Keys</strong> (under Developer Tools), choose <strong>Create New API Key</strong>, enter a description, select <strong>Read-only API Key</strong> and create the key. <a href="https://support.pagerduty.com/main/docs/api-access-keys" target="_blank" rel="noreferrer">REST API key instructions</a></p>
   <p>In your API client, use base URL <code>https://api.pagerduty.com</code>. Add headers <code>Authorization: Token token=YOUR_API_KEY</code> and <code>Accept: application/vnd.pagerduty+json;version=2</code>, replacing the key placeholder privately in that client. Use a REST key, not a service’s Events API integration key.</p>
  </>}
  <p>For each request below, choose GET, append the path to the base URL, send it, then save the successful JSON response <strong>body</strong> to a private .json file. Do not save request headers or credentials. A 401 or 403 response needs your provider administrator’s help; do not bundle an error response.</p>
  <h3>2. Save the responses</h3>
  {ops?<>
   <ol>
    <Endpoint path="/v2/users?limit=100&offset=0" href={opsDocs+'user-api'}>Save users under <code>users</code>, including every person referenced by a rotation or override.</Endpoint>
    <Endpoint path="/v2/schedules?expand=rotation" href={opsDocs+'schedule-api'}>Save under <code>schedules</code>. Keep the expanded <code>rotations</code>. If absent, GET <code>/v2/schedules/SCHEDULE_ID</code> for each schedule and use those detail responses instead. Copy each schedule’s <code>id</code> for the next requests.</Endpoint>
    <Endpoint path="/v2/schedules/SCHEDULE_ID/overrides" href={opsDocs+'schedule-override-api'}>Repeat for each schedule. In each saved response, add <code>"scheduleId": "SCHEDULE_ID",</code> immediately after its opening <code>{'{'}</code>, replacing SCHEDULE_ID with that schedule’s actual ID; keep <code>data</code> unchanged. Save under <code>overrides</code>.</Endpoint>
    <Endpoint path="/v2/escalations" href={opsDocs+'escalation-api'}>Save under <code>escalations</code>.</Endpoint>
    <Endpoint path="/v2/schedules/SCHEDULE_ID/timeline?interval=2&intervalUnit=weeks" href={opsDocs+'schedule-api'}>Optional: repeat per schedule and save under <code>timelines</code>. This captures a comparison window starting now; set <code>date</code> to an ISO timestamp for another window. Keep <code>_parent</code>, window dates and <code>finalTimeline</code>.</Endpoint>
   </ol>
   <p>For paginated lists, save every page: follow <code>paging.next</code> or the <code>X-Paging-Next</code> response header until no next page remains. <a href={opsDocs+'pagination'} target="_blank" rel="noreferrer">Opsgenie pagination</a></p>
  </>:<>
   <p>Choose a start and end for the period you want to compare and for the overrides you need. Replace SINCE and UNTIL with ISO timestamps such as <code>2026-10-16T00:00:00Z</code> and <code>2026-11-16T00:00:00Z</code>. URL-encode query values in your client. For a timezone with clock changes, include a clock change in this window; Oncall requires matching final coverage across it.</p>
   <ol>
    <Endpoint path="/users?limit=100&offset=0" href={pdDocs+'users/list-users'}>Save all pages under <code>users</code>, including each referenced person’s email.</Endpoint>
    <Endpoint path="/schedules?limit=100&offset=0" href={pdDocs+'schedules/list-schedules'}>Use all pages to find schedule IDs. Then get each detail below; do not bundle both the list and details.</Endpoint>
    <Endpoint path="/schedules/SCHEDULE_ID?since=SINCE&until=UNTIL" href={pdDocs+'schedules/get-schedule'}>Repeat per schedule, replacing SCHEDULE_ID with its actual ID. Save the entire response under <code>schedules</code>, including <code>schedule_layers</code> and <code>final_schedule</code>.</Endpoint>
    <Endpoint path="/schedules/SCHEDULE_ID/overrides?since=SINCE&until=UNTIL&overflow=true" href={pdDocs+'schedules/list-schedule-overrides'}>Repeat per schedule using the same window; overflow preserves full override boundaries. Add <code>"schedule_id": "SCHEDULE_ID",</code> immediately after each response’s opening <code>{'{'}</code>, using its actual schedule ID. Keep <code>overrides</code> unchanged. Save under <code>overrides</code>. Overrides outside the requested window are not included.</Endpoint>
    <Endpoint path="/escalation_policies?limit=100&offset=0" href={pdDocs+'escalation-policies/list-escalation-policies'}>Save all pages under <code>escalation_policies</code>, retaining <code>escalation_rules</code>.</Endpoint>
   </ol>
   <p>When a list response has <code>more: true</code>, request the next page with <code>offset</code> increased by the returned <code>limit</code>; save every page until <code>more: false</code>.</p>
  </>}
  <h3>3. Assemble your bundle</h3>
  <p>Create a plain-text file named <code>{vendor}-export.json</code> with this structure. Inside each empty array, paste the entire saved response body for that kind, including its outer braces. Separate multiple responses (pages or schedules) with commas. Paste JSON objects, not filenames or quoted JSON strings. Leave an array empty only if there are no records, or for the optional Opsgenie timeline.</p>
  <pre aria-label={`${name} bundle structure`}><code>{template}</code></pre>
  <p>Keep names, emails, IDs, rotation settings and response envelopes. Include each record once; do not combine an unexpanded schedule list with the same schedules’ details. Leave API keys, tokens, routing keys, webhook URLs and calendar URLs out: a credential-bearing field anywhere refuses the whole file. Keep the bundle private; the limit is 500 KB and 500 objects.</p>
  <h3>4. Review before making anything live</h3>
  <p>Choose your bundle under <strong>Export JSON</strong>, then <strong>Preview import</strong>. Review every rejection, difference and coverage comparison. Preview saves nothing. <strong>Confirm paused import</strong> keeps the accepted data paused. Then choose <strong>Make schedule live</strong> and explicitly match its service and people. Paging stays OFF.</p>
  <p>Supported: one daily or weekly rotation of individuals, non-overlapping individual overrides and simple schedule-based escalations. Unsupported settings are named in the preview. A timeline comparison covers only its saved window. <a href="/docs/move-in">Full compatibility, undo and erasure guide</a>.</p>
 </details>
}
