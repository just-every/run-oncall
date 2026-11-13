import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
if (!root) throw new Error('Usage: node mail-regression.test.mjs <checkout>');
const { serializeSendGridMessage, normalizeInbound } = await import(pathToFileURL(root + '/src/modules/mail/index.mjs'));
const message = from => ({ deliveryId: 'synthetic-oncall-1', from, to: ['synthetic-oncall-2@example.test'], subject: 'Synthetic observation', text: 'Synthetic message' });
const limits = {maxRawBytes: 65536, maxBodyBytes: 8192, maxAttachments: 2, maxAttachmentBytes: 8192, maxTotalAttachmentBytes: 16384};
const raw = extra => `From: synthetic-oncall-1@example.test\r\nTo: synthetic-oncall-2@example.test\r\nSubject: Synthetic observation\r\n${extra}Content-Type: text/plain; charset=utf-8\r\n\r\nSynthetic message`;
function inbound(source, overrides = {}) {
  const bytes = new TextEncoder().encode(source);
  return normalizeInbound({provider: 'cloudflare', message: {
    headers: new Headers(), rawSize: bytes.length,
    raw: new ReadableStream({start(controller) { controller.enqueue(bytes); controller.close(); }}),
  }}, {...limits, ...overrides});
}
test('mail serialization preserves supported mailboxes and rejects ambiguous or oversized addresses', {timeout: 5000}, () => {
  const valid = [
    ['synthetic-oncall-1@example.test', {email: 'synthetic-oncall-1@example.test'}],
    ['Synthetic Person <synthetic-oncall-1@example.test>', {email: 'synthetic-oncall-1@example.test', name: 'Synthetic Person'}],
    ['"Synthetic Person"  <synthetic-oncall-1@example.test>', {email: 'synthetic-oncall-1@example.test', name: 'Synthetic Person'}],
    ['Synthetic Péřson <synthetic-oncall-1@example.test>', {email: 'synthetic-oncall-1@example.test', name: 'Synthetic Péřson'}],
    ['  <synthetic-oncall-1@example.test>  ', {email: 'synthetic-oncall-1@example.test'}],
    ['x'.repeat(950) + ' <a@example.test>', {email: 'a@example.test', name: 'x'.repeat(950)}],
  ];
  for (const [source, expected] of valid) {
    const output = JSON.parse(serializeSendGridMessage(message(source)));
    assert.deepEqual(output.from, expected);
    assert.deepEqual(output.personalizations[0].to, [{email: 'synthetic-oncall-2@example.test'}]);
  }
  for (const source of [
    'x'.repeat(950) + ' '.repeat(20) + '<',
    'x '.repeat(450) + '<a@example.test',
    'Synthetic <a@example.test>, <b@example.test>',
    'Synthetic <<a@example.test>',
    'Synthetic\r\nBcc: b@example.test <a@example.test>',
    'Synthetic\u2028Person <a@example.test>',
    'x'.repeat(100000) + ' <a@example.test>',
  ]) assert.throws(() => serializeSendGridMessage(message(source)), {code: 'invalid_address'});
});
test('inbound MIME accepts ordinary folded headers and rejects malformed or over-budget headers', {timeout: 5000}, async () => {
  for (const extra of [
    'X-Synthetic: value\r\n',
    'X-Synthetic:  value\r\n\tcontinued\r\nX-Synthetic: second\r\n',
    'X-Synthetic:' + ' '.repeat(16000) + 'value\r\n',
  ]) {
    const result = await inbound(raw(extra));
    assert.equal(result.from, 'synthetic-oncall-1@example.test');
    assert.deepEqual(result.to, ['synthetic-oncall-2@example.test']);
    assert.equal(result.subject, 'Synthetic observation');
    assert.equal(result.text, 'Synthetic message');
  }
  for (const extra of [
    'X-Synthetic:' + ' '.repeat(16000) + '\u2028\r\n',
    'X-Synthetic' + ' '.repeat(16000) + ': value\r\n',
    'X-Synthetic: value\rmalformed\r\n',
    'X-Synthetic without colon\r\n',
    'Subject: duplicate\r\n',
  ]) await assert.rejects(inbound(raw(extra)), error => ['invalid_inbound_headers', 'duplicate_inbound_header'].includes(error.code));
  await assert.rejects(inbound(raw('X-Synthetic:' + ' '.repeat(100000) + '\r\n')), {code: 'inbound_raw_limit'});
  let read = false;
  await assert.rejects(normalizeInbound({provider: 'cloudflare', message: {
    headers: new Headers(), rawSize: limits.maxRawBytes + 1,
    raw: new ReadableStream({pull() { read = true; }}, {highWaterMark: 0}),
  }}, limits), {code: 'inbound_raw_limit'});
  assert.equal(read, false, 'raw size is refused before reading or parsing headers');
});
