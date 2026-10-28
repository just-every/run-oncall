import {Link} from '@tanstack/react-router';
import type {OnCallRota} from './read';
import {RotaTime, zoneName} from './time';
export function RotaRow({rota}: {rota: OnCallRota}) {
  const rhythm = rota.rhythm.every === 7 ? `${rota.rhythm.weekday}s` : rota.rhythm.every === 1 ? 'Daily' : `Every ${rota.rhythm.every} days`;
  return <article className="oc-rota-row" data-rota={rota.id}>
    <div className="oc-rota-name"><h2><Link aria-label={rota.service.name + ' · ' + rota.name} to={'/on-call/' + encodeURIComponent(rota.id) as any}>{rota.service.name}</Link></h2><p>{rota.name} · {rhythm} {rota.rhythm.time} · {zoneName(rota.zone)}</p></div>
    <div className="oc-rota-now"><h3>Now</h3><p className={rota.now.primary ? 'oc-on-now' : ''}><strong>{rota.now.primary?.name ?? '⚠ Nobody on call'}</strong></p><p>Backup · {rota.now.backup?.name ?? 'Nobody on call'}</p></div>
    <div className="oc-rota-next"><h3>Next hand-over</h3>{rota.next ? <><p><RotaTime at={rota.next.at} zone={rota.zone}/></p><p>{rota.next.primary?.name ?? 'Nobody on call'} · backup {rota.next.backup?.name ?? 'Nobody on call'}</p></> : <p>No next hand-over</p>}</div>
    <div className="oc-rota-gaps"><h3>Gaps this week</h3>{rota.gaps.length ? <ul>{rota.gaps.map(gap => <li key={gap.role + gap.from}>{gap.role === 'primary' ? 'Primary' : 'Backup'} · <RotaTime at={gap.from} zone={rota.zone}/> – <RotaTime at={gap.to} zone={rota.zone}/></li>)}</ul> : <p>Covered</p>}</div>
  </article>;
}
