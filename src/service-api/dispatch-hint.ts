// Set when a committed write queued an outbound event, so the Worker entry can start delivery after it responds.
let due = false
export const markDispatchDue = () => { due = true }
export function takeDispatchDue() { const value = due; due = false; return value }
