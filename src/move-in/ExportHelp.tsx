import {SavedExportHelp} from './SavedExportHelp'
import { useState } from 'react'
import './export-help.css'

const opsSetup = 'https://support.atlassian.com/opsgenie/docs/create-a-default-api-integration/'
const opsAccess = 'https://docs.opsgenie.com/docs/api-access-management'
const pdSetup = 'https://support.pagerduty.com/main/docs/api-access-keys'

export function ExportHelp({vendor}:{vendor:string}) {
 const ops=vendor==='opsgenie',name=ops?'Opsgenie':'PagerDuty'
 const command=`cd ~/Downloads\nnode oncall-export.mjs ${vendor}`
 const [copyStatus,setCopyStatus]=useState('')
 async function copyCommand() {
  try {await navigator.clipboard.writeText(command);setCopyStatus('Command copied')}
  catch {setCopyStatus('Select and copy the command below')}
 }
 if(!['opsgenie','pagerduty'].includes(vendor))return <SavedExportHelp key={vendor} vendor={vendor}/>
 return <details className="move-in-export-help" key={vendor}>
  <summary>How to export from {name}</summary>
  <p>Use the downloadable exporter on your computer to create one ready-to-upload JSON file. It reads {name} with GET requests, handles every page, gets schedule details and joins each override to its schedule. Your existing pager stays in charge.</p>
  <h3>1. Get a read-only key in {name}</h3>
  {ops?<>
   <p>Ask your Opsgenie administrator to create a separate API integration for this export:</p>
   <ol>
    <li>Open <strong>Settings → Integrations</strong>, choose <strong>Add integration</strong>, search for <strong>API</strong> and select it.</li>
    <li>Name it <strong>Oncall export</strong> and select <strong>Continue</strong>. Expand <strong>Steps to configure the integration</strong> to find its API key.</li>
    <li>In its access settings, select <strong>Limit to Read-Only Access</strong> and leave <strong>Restrict Access to Configurations</strong> unselected. Save the settings and select <strong>Turn on integration</strong>. Copy the key privately.</li>
   </ol>
   <p>If Settings has no Integrations page, use <strong>Teams → your team → Integrations → Add integration</strong>, then the same API steps. A team key can read only schedules that team can access; ask your administrator to check the export scope. <a href={opsSetup} target="_blank" rel="noreferrer">Official setup steps</a> · <a href={opsAccess} target="_blank" rel="noreferrer">Access settings</a>.</p>
  </>:<>
   <p>Ask a PagerDuty admin or account owner to create a key:</p>
   <ol>
    <li>Open <strong>Integrations → Developer Tools → API Access Keys</strong>.</li>
    <li>Select <strong>Create New API Key</strong>, enter <strong>Oncall export</strong> as the description and check <strong>Read-only API Key</strong>.</li>
    <li>Select <strong>Create Key</strong>, copy it privately, then select <strong>Close</strong>. The full key is shown only once.</li>
   </ol>
   <p>Use this REST API key. A service’s Events API integration key cannot read schedules. <a href={pdSetup} target="_blank" rel="noreferrer">Official key instructions</a>.</p>
  </>}
  <h3>2. Download and run the exporter</h3>
  <p>You need <strong>Node.js 22 or later</strong>, an interactive terminal and internet access to {name}. No packages or API client are needed. Open Terminal on macOS/Linux, or PowerShell on Windows. Run <code>node --version</code>; if it is missing or below v22, install the current LTS from <a href="https://nodejs.org/en/download" target="_blank" rel="noreferrer">nodejs.org</a> and reopen your terminal.</p>
  <p><a href="/move-in/oncall-export.mjs.txt" download="oncall-export.mjs">Download oncall-export.mjs</a> and save it to your <strong>Downloads</strong> folder with that exact name. You can open it in a text editor to inspect it before running it.</p>
  <p>Copy these two lines into Terminal and press Enter:</p>
  <button type="button" onClick={copyCommand}>Copy {name} export command</button>
  <span role="status" className="move-in-export-copy-status">{copyStatus}</span>
  <pre aria-label={`${name} export command`}><code>{command}</code></pre>
  <p>In Windows PowerShell, use <code>cd "$HOME\Downloads"</code> for the first line. If you saved the script elsewhere, change to that folder first. Keep the filename <code>oncall-export.mjs</code>, without a <code>.txt</code> suffix. Do not paste your key into a command.</p>
  <h3>3. Answer the terminal prompts</h3>
  <ol>
   <li><strong>Account region:</strong> enter <code>us</code> or <code>eu</code>. {ops?'Choose eu for an app.eu.opsgenie.com account; otherwise choose us.':'Choose eu when your PagerDuty address includes .eu.pagerduty.com; otherwise choose us.'}</li>
   <li><strong>Comparison dates:</strong> enter start and end dates as <code>YYYY-MM-DD</code>, or press Enter for today through 14 days later. Dates mean midnight UTC; the end is exclusive. Choose 1–31 days. For PagerDuty in a zone with clock changes, include a clock change in the window so the preview can check it.</li>
   <li><strong>API key:</strong> paste only the key at the hidden prompt and press Enter. No characters appear while you type or paste; this is expected. The key stays in the exporter process and is never printed, saved or sent to Oncall.</li>
  </ol>
  <p>The exporter reads all people, schedules and escalation policies accessible to the key. It includes {ops?'all returned schedule overrides and a final timeline for your chosen dates':'overrides overlapping your chosen dates, preserving their full start and end, and the final schedule for that same window'}. Overrides outside a PagerDuty window are not exported. It omits credential fields such as calendar URLs, while keeping rotation and rule fields for review.</p>
  <h3>4. Upload the saved file and review</h3>
  <p>Success prints <strong>Saved</strong>, the full filename and object count. The file is in the folder where you ran the command, normally Downloads, named <code>{vendor}-export-DATE-TIME.json</code>. Each run creates a new file. Keep it private: it contains people’s names, emails and schedules. No manual JSON assembly is needed.</p>
  <p>Return here, choose that file under <strong>Export JSON</strong>, to open <strong>Review</strong>. Review every rejection, difference and coverage comparison. Preview saves nothing; export success does not mean every setting is supported. <strong>Import paused</strong> asks once and keeps accepted data paused. Choose <strong>Make schedule live</strong> later to match its service and people explicitly. Paging stays OFF.</p>
  <p>If the command stops: <strong>401/403</strong> means your administrator must check the key, region and permissions; <strong>429</strong> means wait a few minutes and run again. Network, malformed response or pagination errors stop without saving a bundle. Exports above <strong>512 KiB or 500 objects</strong> also stop: ask your administrator for a smaller provider access scope, and keep every referenced person. Do not upload an old file from a failed run.</p>
  {ops&&<p><strong>Opsgenie 422:</strong> the key may be malformed. Copy the full API key again and paste only the key, without <code>GenieKey</code> or header text. If it still fails, check the selected US/EU region and ask your administrator to verify read-only access with access to configurations allowed.</p>}
  <p>Supported: one daily or weekly rotation of individuals, non-overlapping individual overrides and simple schedule-based escalations. Other settings are named in preview. Comparison covers only the saved window. After exporting, have your administrator revoke the dedicated export key. <a href="/docs/move-in">Full compatibility, undo and erasure guide</a>.</p>
 </details>
}
