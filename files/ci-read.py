import datetime,json,subprocess,sys
from pathlib import Path
packet=Path(__file__).resolve().parent if False else Path.home()/'rer-consolidation/work/sd-oncall-runtime-cishape-20261106-1-pc1/packet'
receipt_file=packet/'RECEIPT.json';receipt=json.loads(receipt_file.read_text())
now=datetime.datetime.now(datetime.timezone.utc);last=datetime.datetime.fromisoformat(receipt['last_ci_read']);elapsed=(now-last).total_seconds()
if elapsed<300:raise SystemExit('No GitHub request made: next read is due in '+str(round(300-elapsed,1))+'s')
log=packet/'github-calls.jsonl';calls=[json.loads(line) for line in log.read_text().splitlines()]
if len(calls)>=10:raise SystemExit('No GitHub request made: ten-call budget exhausted')
mode=sys.argv[1];run=str(receipt['ci_run_id'])
if mode=='run':
 endpoint='repos/just-every/run-oncall/actions/runs/'+run
 jq='{status,conclusion,head_sha,html_url}'
 target=packet/('candidate-run-status-'+str(len(calls)+1)+'.json')
elif mode=='jobs':
 endpoint='repos/just-every/run-oncall/actions/runs/'+run+'/jobs?per_page=100'
 jq='{total_count,jobs:[.jobs[]|{id,run_id,name,status,conclusion,started_at,completed_at,steps:[.steps[]|{name,conclusion,started_at,completed_at}]}]}'
 target=packet/'candidate-jobs.json'
else:raise SystemExit('Use run or jobs')
command=['python3','/tmp/fleet-gh.py','api',endpoint,'--jq',jq]
result=subprocess.run(command,capture_output=True,text=True)
call=dict(call=len(calls)+1,purpose='candidate '+mode+' exact-SHA evidence',at=now.isoformat(),command='gh api '+endpoint+' --jq '+jq,seconds_since_prior_read=round(elapsed,3),exit_code=result.returncode)
calls.append(call);log.write_text(''.join(json.dumps(row)+'\n' for row in calls))
receipt.update(last_ci_read=now.isoformat(),github_diagnostic_calls=len(calls))
if result.returncode:
 receipt_file.write_text(json.dumps(receipt,indent=2)+'\n');raise SystemExit('GitHub request failed; inspect sanitized transport diagnostic before any retry')
data=json.loads(result.stdout);target.write_text(json.dumps(data,indent=2)+'\n')
if mode=='run':
 assert data['head_sha']==receipt['head'],'Refuse evidence from a different SHA'
 receipt.update(ci_status=data['status'],ci_conclusion=data['conclusion'],ci_exact_head_sha=data['head_sha'],ci_run_url=data['html_url'])
 print(json.dumps(data,indent=2))
else:
 assert len(data['jobs'])==data['total_count']
 assert all(job['run_id']==receipt['ci_run_id'] for job in data['jobs'])
 print(json.dumps({k:data[k] for k in ['total_count']}))
 print(json.dumps([dict(id=j['id'],name=j['name'],status=j['status'],conclusion=j['conclusion']) for j in data['jobs']],indent=2))
receipt_file.write_text(json.dumps(receipt,indent=2)+'\n')
