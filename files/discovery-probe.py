import subprocess,os,json,hashlib
from pathlib import Path
label=__import__('sys').argv[1]
plan=json.loads(Path('scripts/verify-shards.json').read_text())
rows={}
for lane in [None,*plan['lanes']]:
 env=dict(os.environ)
 env.pop('ONCALL_VERIFY_PREBUILT',None)
 env.pop('ONCALL_RUNTIME_PART',None)
 if lane:env['ONCALL_VERIFY_LANE']=lane
 else:env.pop('ONCALL_VERIFY_LANE',None)
 for category in [None,'--flows','--browser']:
  result=subprocess.run(['node','--import','/tmp/oncall-discovery-preload.mjs','tests/verify.mjs',*([category] if category else [])],env=env,capture_output=True,text=True,check=True)
  rows[(lane or 'all')+':'+(category or 'default')]=[json.loads(x[10:]) for x in result.stdout.splitlines() if x.startswith('SELECTION ')]
records={p.as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('tests').rglob('*') if p.is_file()}
Path('../packet/'+label+'-discovery.json').write_text(json.dumps(dict(plan=plan,selections=rows,test_sources=records),indent=2)+'\n')
print(label, 'test files',len(records),'default registrations',len(rows['all:default'])-3,'shards',len(plan['push']))
