import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {localWorker} from './tests/worker.mjs';
import {autonomousCoordination} from './tests/agent-policy-fixture.mjs';
import {missedAcknowledgmentFlow} from './tests/missed-ack-flow.mjs';

const w = await localWorker({}, {clock: true});
try {
  const ok = (r, status = 200) => {
    assert.equal(r.status, status, JSON.stringify(r.value));
    return r.value;
  };
  const setup = await w.request('/api/setup', {name: 'Example Owner', password: randomBytes(32).toString('hex')});
  const admin = ok(setup).member;
  await autonomousCoordination(w, setup.cookie);
  await missedAcknowledgmentFlow({w, req: (path, input) => w.request(path, input, setup.cookie), ok, admin});
} finally {
  await w.close();
}
