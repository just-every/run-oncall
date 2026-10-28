import {useLocation} from '@tanstack/react-router';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
import {OnCallHome} from './OnCallHome';
import {RotaPage} from './RotaPage';
import {RotaSteps} from './rota-steps/RotaSteps';

/** The section and path routes share one screen, backed by the shell's workspace lifetime. */
export function OnCallScreen() {
  const {s, actor, w} = useWorkspaceContext(), location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts[1] === 'new') return <RotaSteps state={s} actor={actor} service={new URLSearchParams(location.searchStr).get('service') ?? ''} refresh={w.refresh}/>;
  if (parts[1]) {
    let id: string;
    try {id = decodeURIComponent(parts[1]);} catch {return <p>Rota not found.</p>;}
    return <RotaPage key={id} id={id} state={s} actor={actor} value={w.onCall} refresh={w.refresh} edit={parts[2] === 'edit'} renderEdit={schedule => <RotaSteps key={id} schedule={schedule} state={s} actor={actor} refresh={w.refresh}/>}/>;
  }
  return <OnCallHome state={s} actor={actor} value={w.onCall}/>;
}
