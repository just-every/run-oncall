/** Failure-only diagnostics. Redact complete lines before retaining a bounded tail. */
export function redact(value, environment = process.env) {
 let text = String(value)
 for (const [name, secret] of Object.entries(environment)) {
  if (secret && /secret|token|password|cookie|authorization|api.?key|private.?key|access.?key|credential|dev.?key/i.test(name)) for(const part of secret.split(/\r?\n/).filter(Boolean)) text = text.split(part).join('[redacted]')
 }
 return text
  .replace(/([?&#]rer-dev=)[^&#\s"'<>]+/gi, '$1[redacted]')
  .replace(/(["']?[\w.-]*(?:secret|token|password|credential|api.?key|private.?key|access.?key|auth)[\w.-]*["']?\s*[:=]\s*)[\[{][^\r\n]*/gi, '$1[redacted structured value]')
  .replace(/\b(?:cookie|set-cookie|authorization|proxy-authorization)\s*[:=]\s*[^\r\n]+/gi, '[redacted header]')
  .replace(/([?&#](?:[^=&#\s]*?(?:token|key|secret|password|code|signature|credential)[^=&#\s]*)=)[^&#\s"'<>]+/gi, '$1[redacted]')
  .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[redacted]@')
  .replace(/(["']?[\w.-]*(?:secret|token|password|credential|api.?key|private.?key|access.?key|dev.?key)[\w.-]*["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,;\]}]+)/gi, '$1[redacted]')
  .replace(/\bBearer\s+[^\s"',;]+/gi, 'Bearer [redacted]')
}
export function workerDiagnostics(environment, limit = 12 * 1024) {
 let tail = '', reported = false
 const streams = new Map()
 const append = line => { tail = (tail + line + '\n').slice(-limit) }
 return {
  attach(stream, label) {
   const state = { pending: '', dropping: false, sensitiveDepth: 0 }; streams.set(label, state)
   stream.setEncoding('utf8')
   stream.on('data', chunk => {
    for (const piece of chunk.split(/(?<=\n)/)) {
     if (!state.dropping) state.pending += piece
     if (state.pending.length > limit) { state.pending = ''; state.dropping = true }
     if (piece.endsWith('\n')) {
      const line=state.pending.trimEnd(),structured=line.match(/["']?[\w.-]*(?:secret|token|password|credential|api.?key|private.?key|access.?key|auth)[\w.-]*["']?\s*[:=]\s*([\[{].*)/i)
      const nesting=value=>(value.match(/[\[{]/g)?.length??0)-(value.match(/[\]}]/g)?.length??0)
      if(state.sensitiveDepth>0){state.sensitiveDepth=Math.max(0,state.sensitiveDepth+nesting(line));append(`[${label}] [redacted structured continuation]`)}
      else {if(structured)state.sensitiveDepth=Math.max(0,nesting(structured[1]));append(`[${label}] ${state.dropping ? '[oversized diagnostic line omitted]' : redact(line, environment)}`)}
      state.pending = ''; state.dropping = false
     }
    }
   })
  },
  report(reason) {
   if (reported) return
   reported = true
   for (const [label, state] of streams) if (state.pending || state.dropping) append(`[${label}] ${state.dropping ? '[oversized diagnostic line omitted]' : state.sensitiveDepth ? '[redacted structured continuation]' : redact(state.pending, environment)}`)
   console.error(`Worker diagnostics (${redact(reason, environment)}):\n${tail || '[no Worker output captured]'}`)
  },
 }
}
