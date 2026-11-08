import {coverage, type Coverage, type CoverageMember, type Schedule} from '../family/response-operations/schedules';

/** A primary hand-over can make backup unavailable before backup's own turn. */
export function nowNext(schedule: Schedule, members: CoverageMember[], at: number) {
  const now = coverage(schedule, members, at);
  const next = Object.fromEntries(now.windows.map(window => [window.role,
    window.end ? coverage(schedule, members, Date.parse(window.end)) : null,
  ])) as Record<'primary' | 'backup', Coverage | null>;
  const backup = now.windows.find(window => window.role === 'backup')!;
  if (now.backup !== null && backup.end !== null) {
    const end = Date.parse(backup.end);
    let current = now;
    while (true) {
      const boundary = current.windows.find(window => window.role === 'primary')!.end;
      if (boundary === null || Date.parse(boundary) >= end) break;
      const future = coverage(schedule, members, Date.parse(boundary));
      if (future.backup !== now.backup) {
        backup.end = boundary;
        next.backup = future;
        break;
      }
      current = future;
    }
  }
  return {now, next};
}
