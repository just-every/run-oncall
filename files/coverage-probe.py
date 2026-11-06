from pathlib import Path
import subprocess,json,os,hashlib,re
root=Path.cwd(); packet=root.parent/'packet'
def run(args, env=None, ok=True):
    values=dict(os.environ);[values.pop(k,None) for k in ['ONCALL_VERIFY_LANE','ONCALL_RUNTIME_PART','ONCALL_TRIAGE_PART','ONCALL_VERIFY_PREBUILT']]
    values.update(env or {})
    result=subprocess.run(args,env=values,capture_output=True,text=True)
    if ok: assert result.returncode==0,result.stderr
    return result
def groups(part=None,before=False):
    env={'PROBE_BEFORE':str(int(before))}
    if part:env['ONCALL_TRIAGE_PART']=part
    return [x[6:] for x in run(['node','--import','/tmp/oncall-triage-group-preload.mjs','tests/triage.mjs'],env).stdout.splitlines() if x.startswith('GROUP ')]
def capture(before):
    plan=json.loads((packet/'original/scripts/verify-shards.json' if before else root/'scripts/verify-shards.json').read_text())
    selections={}
    for lane in [None,*plan['lanes']]:
        for category in ['default','--flows','--browser'] if lane is None else ['default']:
            env={'PROBE_BEFORE':str(int(before))}
            if lane:env['ONCALL_VERIFY_LANE']=lane
            output=run(['node','--import','/tmp/oncall-discovery-preload.mjs','tests/verify.mjs',*([category] if category!='default' else [])],env).stdout
            selections[(lane or 'all')+':'+category]=[json.loads(line[10:]) for line in output.splitlines() if line.startswith('SELECTION ')]
    return dict(plan=plan,selections=selections)
def expanded(rows):
    result=[]
    for row in rows:
        if row['command']!='node' or not row['args'][0].startswith('tests/'):continue
        if row['args'][0]=='tests/triage.mjs':
            for part in groups(row['triagePart']):result.append('tests/triage.mjs:'+part)
        else:result.append(row['args'][0]+':'+str(row['runtimePart']))
    return sorted(result)
before,after=capture(True),capture(False)
for key in ['all:default','all:--flows','all:--browser']:
    assert expanded(before['selections'][key])==expanded(after['selections'][key]),key
assert groups(before=True)==groups()==['bulk','bounds','storm','reports']
for part in ['bulk','bounds','storm','reports']:assert groups(part)==[part]
invalid=run(['node','--import','/tmp/oncall-triage-group-preload.mjs','tests/triage.mjs'],{'ONCALL_TRIAGE_PART':'unknown'},ok=False)
assert invalid.returncode and 'Unknown triage journey' in invalid.stderr and 'GROUP ' not in invalid.stdout
for capture in [before,after]:
    rows=[row for shard in capture['plan']['push'] for lane in shard['lanes'] for row in capture['selections'][lane+':default']]
    full=expanded(rows)
    assert full==expanded(capture['selections']['all:default'])
    assert len(full)==len(set(full))
    assert len([x for x in capture['plan']['push'] if x['hosted']])==1
    assert capture['plan']['nightly']==[]
# Remove only the selection scaffolding and compare the entire original triage byte string.
a=(root/'tests/triage.mjs').read_text();b=(packet/'original/tests/triage.mjs').read_text()
a=a.replace("// Select whole independent journeys; the default still runs every group in order.\nconst triagePart=process.env.ONCALL_TRIAGE_PART??'all';\nif(!['all','bulk','bounds','storm','reports'].includes(triagePart))throw Error(`Unknown triage journey: ${triagePart}`);\nconst selected=part=>triagePart==='all'||triagePart===part;\n",'',1)
a=a.replace("if(selected('bulk'))await triageBulkCompletion();\nif(selected('bounds'))await triageAlertResolveBounds();",'await triageBulkCompletion();\nawait triageAlertResolveBounds();',1)
a=a.replace("if(selected('storm')) {\n// One storm",'// One storm',1)
a=a.replace("}\n\n// Coordinated incidents feed fair response reports, matching CSV and erasure-safe denominators.\nif(selected('reports')) {",'// Coordinated incidents feed fair response reports, matching CSV and erasure-safe denominators.\n{',1)
assert a==b,'Any change beyond whole-journey selection is forbidden'
for name,value in [('before-discovery.json',before),('after-discovery.json',after)]:
    (packet/name).write_text(json.dumps(value,indent=2)+'\n')
report=dict(push_jobs_before=len(before['plan']['push']),push_jobs_after=len(after['plan']['push']),entrypoint_invocations_before=len([r for r in before['selections']['all:default'] if r['command']=='node' and r['args'][0].startswith('tests/')]),entrypoint_invocations_after=len([r for r in after['selections']['all:default'] if r['command']=='node' and r['args'][0].startswith('tests/')]),expanded_existing_groups_before=expanded(before['selections']['all:default']),expanded_existing_groups_after=expanded(after['selections']['all:default']),expanded_group_count=len(expanded(after['selections']['all:default'])),duplicate_or_missing_groups=0,triage_original_bodies_byte_identical=True,unchanged_default_group_order=groups(),invalid_selector_refuses=True,browser_category_unchanged=True,flows_category_unchanged=True,hosted_command_once=True,runtime_parts=['core','machines'])
(packet/'coverage-proof.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
