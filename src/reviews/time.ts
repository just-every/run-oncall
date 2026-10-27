export const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export function shortTime(value: string, zone = browserZone()) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString([], {timeZone: zone, month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'Time unavailable';
}
export function shortDate(value: string, zone = browserZone()) {
  return new Date(value + 'T12:00:00Z').toLocaleDateString([], {timeZone: zone, month: 'short', day: 'numeric'});
}
export function zonedMidnight(date: string, zone: string) {
  const target = Date.parse(date + 'T00:00:00Z');
  let instant = target;
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  for (let n = 0; n < 5; n++) {
    const p = Object.fromEntries(parts.formatToParts(instant).map(p => [p.type,p.value]));
    const local = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    const difference = target - local;
    if (!difference) break;
    instant += difference;
  }
  return new Date(instant).toISOString();
}
export function periodBounds(period: string, zone: string, from: string, to: string, now = Date.now()) {
  if (period === 'custom') return {from:zonedMidnight(from,zone),to:zonedMidnight(to,zone)};
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
  const day = Date.UTC(+p.year,+p.month-1,+p.day);
  const start = period === 'quarter' ? Date.UTC(+p.year,Math.floor((+p.month-1)/3)*3,1) : day - (period === '7' ? 7 : 30)*86400000;
  return {from:zonedMidnight(new Date(start).toISOString().slice(0,10),zone),to:new Date(now).toISOString()};
}
