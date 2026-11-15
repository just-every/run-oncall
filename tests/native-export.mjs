import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateCandidateSpec} from '../scripts/delivery/base/spec.mjs';

// Bound the whole declaration journey in a child so a backtracking regression
// fails instead of wedging the verification shard.
if (process.argv[2] !== '--bounded') {
  const result = spawnSync(process.execPath, [import.meta.filename, '--bounded'], {encoding:'utf8', timeout:5000});
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  console.log('Native export declarations accept supported paths and promptly refuse malformed paths');
} else {
  const sql = 'CREATE VIRTUAL TABLE synthetic_export USING fts5(content);';
  const candidate = (path, covers = ['SYNTHETIC_EXPORT']) => ({
    schema:1, compatibilityDate:'2026-01-01', compatibilityFlags:[],
    resources:[{kind:'d1',binding:'SYNTHETIC_DB'}],
    migrations:[{binding:'SYNTHETIC_DB',name:'synthetic-export.sql',sql,sha256:createHash('sha256').update(sql).digest('hex')}],
    durableObjects:[{binding:'SYNTHETIC_EXPORT',className:'SyntheticExport'}],
    durableObjectMigrations:[], publicVariables:{}, secretNames:[],
    schedules:[], queueConsumers:[], healthPath:'/health', recovery:'Synthetic recovery instructions',
    nativeExport:{path,covers},
  });
  for (const path of ['/', '/export', '/export/', '/api/native-export_v1.0~/', '/' + 'a'.repeat(255), '/a'.repeat(127) + '/']) {
    for (const covers of [['SYNTHETIC_EXPORT'], ['SYNTHETIC_DB'], ['SYNTHETIC_EXPORT','SYNTHETIC_DB']]) {
      const spec = candidate(path, covers);
      assert.equal(validateCandidateSpec(spec), spec);
    }
  }
  for (const path of ['', 'export', '//export', '/a//b', '/.', '/..', '/a/../b', '/export?x=1', '/export#part', '/export%2fother', '/export\\other', '/export name', '/' + 'a'.repeat(256), '/' + 'a'.repeat(254) + '!', '/a/' + 'b'.repeat(252) + '!']) {
    assert.throws(() => validateCandidateSpec(candidate(path)), /Native export path/);
  }
}
