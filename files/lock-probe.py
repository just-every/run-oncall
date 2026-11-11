import json, os, signal, subprocess, time
from pathlib import Path
root = Path('/workspace/run-oncall')
packet = Path.home() / 'rer-consolidation/work/main-oncall-run-docs-1/packet'
log_path = packet.parent / 'dev-private.log'
fd = os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd,'w') as log:
    proc = subprocess.Popen(['python3','/tmp/rer-reap.py','npx','-y','@runeditrun/rer','dev','--foreground'], cwd=root, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    try:
        deadline = time.monotonic() + 120
        while time.monotonic() < deadline:
            data = log_path.read_text()
            if 'RER_OPEN' in data:
                break
            if proc.poll() is not None:
                raise RuntimeError('dev exited before ready; private log retained outside packet')
            time.sleep(1)
        else:
            raise RuntimeError('dev readiness deadline; private log retained outside packet')
        result = subprocess.run(['npx','-y','@runeditrun/rer','deploy','--environment','production','--dry-run'], cwd=root,capture_output=True,text=True,timeout=120)
        output = result.stdout + result.stderr
        (packet/'dry-run-dev-active.log').write_text(output + f'\ndry-run-dev-active exit={result.returncode}\n')
        print(output)
        print('dry-run-dev-active exit=' + str(result.returncode))
        (packet/'lock-probe-receipt.json').write_text(json.dumps({'dev_ready':True,'started_process_group':proc.pid,'probe_command':'npx -y @runeditrun/rer deploy --environment production --dry-run','exit':result.returncode,'cleanup':'SIGINT only to the process group started by this probe; no rer dev --stop executed'}, indent=2)+'\n')
    finally:
        if proc.poll() is None:
            os.killpg(proc.pid,signal.SIGINT)
            try:
                proc.wait(timeout=45)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid,signal.SIGTERM)
                proc.wait(timeout=30)
