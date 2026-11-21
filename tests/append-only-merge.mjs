import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const file = 'tests/agent-door-browser.mjs';
const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const lastFunction = Array.from(source.matchAll(/^(?:export )?(?:async )?function \w+\(/gm)).at(-1);
assert.ok(lastFunction, 'The browser test has a function at the start of the fixture tail');

const first = '// First round\nassert.equal(1 + 1, 2);';
const second = '// Second round\nassert.deepEqual([3, 4].slice(1), [4]);';
const scratch = mkdtempSync(join(tmpdir(), 'oncall-append-merge-'));
const fixture = join(scratch, file);
const testEmail = 'tester' + '@' + 'example.test';
// Keep the scratch repository independent of the invoking checkout and Git configuration.
const gitEnv = {
 ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))),
 GIT_CONFIG_GLOBAL: '/dev/null',
 GIT_CONFIG_NOSYSTEM: '1',
 GIT_AUTHOR_NAME: 'Oncall merge test',
 GIT_AUTHOR_EMAIL: testEmail,
 GIT_COMMITTER_NAME: 'Oncall merge test',
 GIT_COMMITTER_EMAIL: testEmail,
};

function git(...args) {
 try {
  execFileSync('git', args, { cwd: scratch, env: gitEnv, encoding: 'utf8', stdio: 'pipe' });
 } catch (error) {
  const output = [error.stdout, error.stderr].filter(Boolean).join('').trim();
  throw new Error(`git ${args.join(' ')} failed: ${output || error.message}`);
 }
}

function check(operation) {
 const merged = readFileSync(fixture, 'utf8');
 assert.doesNotMatch(merged, /^(?:<{7}|\|{7}|={7}|>{7})(?: |$)/m, operation + ' left conflict markers');
 for (const block of [first, second]) {
  assert.equal(merged.split(block).length - 1, 1, operation + ' must keep each assertion block once');
 }
 execFileSync(process.execPath, ['--check', fixture], { stdio: 'inherit' });
}

try {
 git('init', '--quiet', '--initial-branch=base', '--template=');
 mkdirSync(join(scratch, 'tests'));
 copyFileSync(new URL('../.gitattributes', import.meta.url), join(scratch, '.gitattributes'));
 writeFileSync(fixture, source.slice(lastFunction.index));
 git('add', '.gitattributes', file);
 git('commit', '--quiet', '-m', 'Browser test tail');

 for (const [branch, block] of [['first', first], ['second', second]]) {
  git('switch', '--quiet', '-c', branch, 'base');
  appendFileSync(fixture, '\n' + block + '\n');
  git('add', file);
  git('commit', '--quiet', '-m', 'Append assertions for ' + branch);
 }

 git('switch', '--quiet', '--detach', 'first');
 git('merge', '--no-edit', 'second');
 check('Merge');
 git('switch', '--quiet', 'second');
 git('rebase', 'first');
 check('Rebase');
 console.log('Append-only browser assertions survive merge and rebase exactly once and parse successfully');
} finally {
 rmSync(scratch, { recursive: true, force: true });
}
