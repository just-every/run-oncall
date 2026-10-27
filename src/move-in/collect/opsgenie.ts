import type { CollectionWindow, ReadTask } from './bundle'

export function opsgenieTasks(): ReadTask[] {
 return [
  { kind: 'users', path: '/v2/users?limit=100&offset=0' },
  { kind: 'schedule-list', path: '/v2/schedules' },
  { kind: 'escalations', path: '/v2/escalations' },
 ]
}
export function opsgenieSchedule(id: string, window: CollectionWindow): ReadTask[] {
 const path = '/v2/schedules/' + encodeURIComponent(id)
 const query = new URLSearchParams({ date: window.since, interval: String(window.days), intervalUnit: 'days' })
 return [
  { kind: 'detail', path, schedule: id },
  { kind: 'overrides', path: `${path}/overrides`, schedule: id },
  { kind: 'timelines', path: `${path}/timeline?${query}`, schedule: id },
 ]
}
