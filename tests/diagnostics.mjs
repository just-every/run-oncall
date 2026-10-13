/** Failure-only diagnostics. Redact complete lines before retaining a bounded tail. */
const sensitiveName = /secret|token|password|cookie|auth|session|api.?key|private.?key|access.?key|credential|dev.?key/i
const sensitiveAssignment = new RegExp(String.raw`["']?([\w.-]*(?:${sensitiveName.source})[\w.-]*)["']?\s*[:=][ \t]*`, 'gi')

// Keep only lexical state across lines, never a sensitive value. Quotes inside a
// structured value must not close its nesting, and escaped quotes stay quoted.
function consumeValue(text, start, state) {
 const value = state.value
 let index = start
 if (value.waiting) {
  while (/\s/.test(text[index] ?? '') && index < text.length) index++
  if (index === text.length) return index
  value.waiting = false
  const first = text[index]
  if (first === '"' || first === "'") { value.quote = first; index++ }
  else if (first === '{' || first === '[') { value.depth = 1; index++ }
  else {
   const end = value.header ? /[\r\n]/ : /[\s,;\]}]/
   while (index < text.length && !end.test(text[index])) index++
   state.value = null
   return index
  }
 }
 for (; index < text.length; index++) {
  const character = text[index]
  if (value.quote) {
   if (value.escaped) value.escaped = false
   else if (character === '\\') value.escaped = true
   else if (character === value.quote) {
    value.quote = ''
    if (!value.depth) { state.value = null; return index + 1 }
   }
  } else if (character === '"' || character === "'") value.quote = character
  else if (character === '[' || character === '{') value.depth++
  else if (character === ']' || character === '}') {
   if (--value.depth === 0) { state.value = null; return index + 1 }
  }
 }
 return index
}

function redactText(value, environment, state) {
 let input = String(value)
 for (const [name, secret] of Object.entries(environment)) {
  if (secret && sensitiveName.test(name)) for (const part of secret.split(/\r?\n/).filter(Boolean)) input = input.split(part).join('[redacted]')
 }
 let text = '', index = 0
 if (state.value) {
  index = consumeValue(input, 0, state)
  text = '[redacted continuation]'
 }
 // A fresh matcher avoids sharing lastIndex between streams or report reasons.
 const assignments = new RegExp(sensitiveAssignment)
 while (!state.value) {
  assignments.lastIndex = index
  const match = assignments.exec(input)
  if (!match) break
  text += input.slice(index, match.index) + match[0] + '[redacted]'
  state.value = { waiting: true, depth: 0, quote: '', escaped: false, header: /cookie|auth/i.test(match[1]) }
  index = consumeValue(input, assignments.lastIndex, state)
 }
 text += input.slice(index)
 return text
  .replace(/([?&#]rer-dev=)[^&#\s"'<>]+/gi, '$1[redacted]')
  .replace(/([?&#](?:[^=&#\s]*?(?:token|key|secret|password|code|signature|credential)[^=&#\s]*)=)[^&#\s"'<>]+/gi, '$1[redacted]')
  .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[redacted]@')
  .replace(/\bBearer\s+[^\s"',;]+/gi, 'Bearer [redacted]')
}

export function redact(value, environment = process.env) {
 return redactText(value, environment, {})
}

export function workerDiagnostics(environment, limit = 12 * 1024) {
 let tail = '', reported = false
 const streams = new Map()
 const append = line => { tail = (tail + line + '\n').slice(-limit) }
 return {
  attach(stream, label) {
   const state = { pending: '', suppressed: false, value: null }; streams.set(label, state)
   stream.setEncoding('utf8')
   stream.on('data', chunk => {
    if (state.suppressed) return
    for (const piece of chunk.split(/(?<=\n)/)) {
     if (state.pending.length + piece.length > limit) {
      // Once the complete line cannot be retained, its assignment/value
      // boundary is unknown. Never infer a safe restart from truncated syntax.
      state.pending = ''; state.value = null; state.suppressed = true
      append(`[${label}] [oversized diagnostic line omitted; stream suppressed]`)
      return
     }
     state.pending += piece
     if (piece.endsWith('\n')) {
      append(`[${label}] ${redactText(state.pending, environment, state).trimEnd()}`)
      state.pending = ''
     }
    }
   })
  },
  report(reason) {
   if (reported) return
   reported = true
   for (const [label, state] of streams) if (state.pending) append(`[${label}] ${redactText(state.pending, environment, state).trimEnd()}`)
   console.error(`Worker diagnostics (${redact(reason, environment)}):\n${tail || '[no Worker output captured]'}`)
  },
 }
}
