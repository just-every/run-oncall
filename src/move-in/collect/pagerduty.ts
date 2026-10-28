import type { CollectionWindow, ReadTask } from './bundle'

export function pagerdutyTasks(window: CollectionWindow): ReadTask[] {
 return [
  { kind: 'users', path: '/users?limit=100&offset=0' },
  { kind: 'schedule-list', path: '/schedules?limit=100&offset=0' },
  { kind: 'escalation_policies', path: '/escalation_policies?limit=100&offset=0' },
 ]
}
export function pagerdutySchedule(id: string, window: CollectionWindow): ReadTask[] {
 const path = '/schedules/' + encodeURIComponent(id)
 const dates = new URLSearchParams({ since: window.since, until: window.until })
 return [
  { kind: 'detail', path: `${path}?${dates}`, schedule: id },
  { kind: 'overrides', path: `${path}/overrides?${dates}&overflow=true`, schedule: id },
 ]
}
