export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
export const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
const sensitive = (name: string) => /secret|token|password|passwd|authorization|cookie|credential|signature|^(?:key|auth)$|(?:api|routing|service|integration|endpoint|access|private|signing|client|session|auth)[_. -]?key/i.test(name);

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (isRecord(value)) return '{' + Object.keys(value).filter(k => value[k] !== undefined).sort()
    .map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}

export async function monitoringHash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/** All persisted context is an allowlisted projection passed through this scrubber. */
export function monitoringSanitizer(secret: string) {
  let truncated = false;
  const scrub = (value: string): string => {
    let clean = value;
    if (secret) for (const form of new Set([secret, encodeURIComponent(secret)])) clean = clean.replaceAll(form, '[redacted]');
    return clean.replace(/(?:Bearer|GenieKey)\s+[^\s,;"'<>]+/gi, '[redacted]')
      .replace(/((?:secret|token|password|authorization|cookie|(?:api|routing|service)[_-]?key)\s*[=:]\s*)[^&\s,"'<>]+/gi, '$1[redacted]');
  };
  const safeURL = (value: unknown): string | null => {
    if (typeof value !== 'string' || !value.trim()) { truncated = true; return null; }
    try {
      const url = new URL(value);
      let decoded = value;
      for (let i = 0; i < 3; i++) { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; }
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || value.length > 2000
        || secret && decoded.includes(secret) || [...url.searchParams.keys()].some(sensitive)
        || /\/(?:webhooks?|hooks|ingress|intake)(?:\/|\?)/i.test(decoded)
        || /(?:secret|token|password|authorization|signature|(?:api|routing|service)[_-]?key)[=:]/i.test(decoded)) {
        truncated = true; return null;
      }
      if (url.hash) { url.hash = ''; truncated = true; }
      return url.href;
    } catch { truncated = true; return null; }
  };
  const text = (value: string): string => scrub(value.replace(/https?:\/\/[^\s<>"']+/gi, url => safeURL(url) ?? '[redacted URL]'));
  const bound = (value: string, maximum = 1000): string => {
    const clean = text(value);
    if (new TextEncoder().encode(clean).length <= maximum) return clean;
    truncated = true;
    const marker = ` … [truncated; original ${new TextEncoder().encode(value).length} bytes]`;
    let prefix = clean.slice(0, maximum - marker.length);
    while (new TextEncoder().encode(prefix + marker).length > maximum) prefix = prefix.slice(0, -1);
    return prefix + marker;
  };
  const clean = (value: unknown, bounded = false, depth = 0): unknown => {
    if (typeof value === 'string') return bounded ? bound(value) : text(value);
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (depth >= 6) { truncated = true; return `[truncated; original ${jsonBytes(value)} bytes]`; }
    if (Array.isArray(value)) {
      if (bounded && value.length > 128) truncated = true;
      return (bounded ? value.slice(0, 128) : value).map(v => clean(v, bounded, depth + 1));
    }
    if (isRecord(value)) {
      const entries = Object.entries(value).filter(([key]) => !['__proto__', 'constructor', 'prototype'].includes(key)).sort(([a], [b]) => a.localeCompare(b));
      if (bounded && entries.length > 128) truncated = true;
      return Object.fromEntries((bounded ? entries.slice(0, 128) : entries).map(([key, item]) =>
        [bounded ? bound(key, 200) : scrub(key), sensitive(key) ? '[redacted]' : clean(item, bounded, depth + 1)]));
    }
    return null;
  };
  const structured = (value: Record<string, unknown>): Record<string, unknown> => {
    const originalBytes = jsonBytes(value), result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const safeKey = bound(key, 200);
      const safeValue = clean(item, true);
      result[safeKey] = safeValue;
      if (jsonBytes(result) > 7800) {
        delete result[safeKey]; truncated = true;
        // Preserve readable siblings inside large maps instead of dropping the whole map.
        if (isRecord(safeValue)) {
          const partial: Record<string, unknown> = {};
          result[safeKey] = partial;
          for (const [name, entry] of Object.entries(safeValue)) {
            partial[name] = entry;
            if (jsonBytes(result) > 7700) { delete partial[name]; break; }
          }
        }
        break;
      }
    }
    if (truncated) result._truncation = { truncated: true, originalBytes };
    return result;
  };
  return { bound, clean, structured, safeURL, get truncated() { return truncated; } };
}
