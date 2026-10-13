import type { DevPersona } from './modules/operator-auth/dev/index.mjs'

// Oncall uses the real installation owner and signed-out persona. Product
// responders are managed in the workspace; dev identities grant no mapping.
export function devPersonas(): DevPersona[] {
 return []
}
