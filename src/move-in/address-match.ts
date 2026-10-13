// An erased person's address is found wherever it appears in imported text: exact and case-insensitive, as a whole address (erasing ed@example.test never touches sed@example.test or ed@example.test.invalid), also percent-encoded as inside URLs.
const NAME = /[A-Za-z0-9_+-]/

/** The character at `index` and how many characters it spans, reading a %XX escape as the character it encodes. */
function unit(text: string, index: number): { char: string; length: number } {
  const escape = /^%([0-9a-f]{2})/i.exec(text.slice(index, index + 3))
  return escape ? { char: String.fromCharCode(parseInt(escape[1], 16)), length: 3 } : { char: text[index], length: 1 }
}

/** Whether the text right after an occurrence still belongs to a longer address. A dot closes a sentence unless a name character follows it. */
function continuesAfter(text: string, index: number) {
  for (let at = index; at < text.length;) {
    const { char, length } = unit(text, at)
    if (char === '.') { at += length; continue }
    return NAME.test(char) || (char === '%' && length === 1)
  }
  return false
}

/** Whether the text right before an occurrence is part of a longer address (a dot, percent sign or name character). */
function continuesBefore(text: string, index: number) {
  if (index === 0) return false
  const escaped = index >= 3 && /^%[0-9a-f]{2}$/i.test(text.slice(index - 3, index))
  const char = escaped ? unit(text, index - 3).char : text[index - 1]
  return NAME.test(char) || char === '.' || char === '%'
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Each whole-address occurrence of the email in the text, as [start, end) ranges, in order. */
export function addressRanges(text: string, email: string): [number, number][] {
  const forms = new Set([email, encodeURIComponent(email), email.replace(/@/g, '%40')])
  const found = new RegExp([...forms].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|'), 'gi')
  const ranges: [number, number][] = []
  for (const match of text.matchAll(found)) {
    const start = match.index!, end = start + match[0].length
    if (!continuesBefore(text, start) && !continuesAfter(text, end)) ranges.push([start, end])
  }
  return ranges
}
