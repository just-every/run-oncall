const encoder = new TextEncoder();
async function sign(key, value) {
  const imported = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', imported, encoder.encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
const refuse = () => new Response('Invalid synthetic receiver request', { status: 403 });

// The isolated paid edge has no native database, permissions or network access.
export default {
  async fetch(request, { fixture } = {}) {
    const url = new URL(request.url);
    if (url.origin !== 'https://8.8.8.8' || url.pathname !== '/oncall-agent' || url.search || url.hash || request.method !== 'POST' ||
      request.headers.get('content-type') !== 'application/json' || typeof fixture?.key !== 'string' || fixture.key.length < 32) return refuse();
    const raw = await request.text();
    if (encoder.encode(raw).length > 16384) return refuse();
    let body;
    try { body = JSON.parse(raw); } catch { return refuse(); }
    if (!body || Array.isArray(body) || Object.keys(body).sort().join(',') !== 'at,incident,operationId,revision,service,state,type' ||
      typeof body.operationId !== 'string' || !body.operationId || typeof body.incident !== 'string' || !body.incident ||
      body.service !== 'agent-service' || !Number.isSafeInteger(body.revision) || body.revision < 1 || !Number.isFinite(Date.parse(body.at)) ||
      !['trigger', 'acknowledgment', 'reassignment', 'resolution', 'role', 'follow-up'].includes(body.type) ||
      !['declared', 'acknowledged', 'mitigating', 'recovered', 'resolved'].includes(body.state)) return refuse();
    const timestamp = request.headers.get('x-oncall-timestamp');
    if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
      request.headers.get('x-oncall-operation') !== body.operationId ||
      request.headers.get('x-oncall-signature') !== await sign(fixture.key, `${timestamp}.${raw}`)) return refuse();
    return new Response(null, { status: 200, headers: { 'x-oncall-result': 'accepted',
      'x-oncall-receipt': await sign(fixture.key, `${body.operationId}.${timestamp}.accepted`) } });
  },
};
