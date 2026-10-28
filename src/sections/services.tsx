import {useLocation, useNavigate} from '@tanstack/react-router';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
import {ServicesHome} from '../services/ServicesHome';
export function ServicesSection() {
  const {w, s, actor, admin, command, page} = useWorkspaceContext();
  const {pathname} = useLocation(), navigate = useNavigate();
  if (page !== 'services') return null;
  const match = /^\/settings\/services\/([^/]+)\/?$/.exec(pathname);
  let selected = '';
  try {selected = match ? decodeURIComponent(match[1]) : '';} catch {selected = ''}
  return <><ServicesHome state={s} actor={actor} admin={admin} busy={w.busy} command={async input => {const result=await command(input);if(result)w.setNotice('');return result;}} run={w.run} refresh={w.refresh} selected={selected} open={path => {void navigate({to: path, resetScroll: false} as any);}}/></>;
}
