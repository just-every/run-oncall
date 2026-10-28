import {useEffect, useRef} from 'react';
import {useLocation} from '@tanstack/react-router';
import type {Alert,State} from '../family/response-operations/domain';
import type {IntakeRun} from '../intake/CompatibleTest';
import {AlertList} from '../alerts/AlertList';
import {AlertPage} from '../alerts/AlertPage';
import '../alerts/alerts.css';
export function AlertsPanel(props: {state: State; canEdit: boolean; busy: boolean; run: IntakeRun; name: (id: string | null) => string; onDeclare: (data: unknown) => Promise<void>; onOpenIncident: (id: string) => void;onSaved:(alert:Alert)=>void;draftScope:string}) {
  const state=props.state;
  const {pathname} = useLocation();
  const selected = pathname.split('/')[2] ? decodeURIComponent(pathname.split('/')[2]) : '';
  const scroll = useRef(0), wasSelected = useRef(selected);
  useEffect(() => {
    if(selected&&selected!==wasSelected.current)requestAnimationFrame(()=>window.scrollTo(0,0));
    if(!selected&&wasSelected.current)requestAnimationFrame(()=>window.scrollTo(0,scroll.current));
    wasSelected.current=selected;
  },[selected]);
  const alert = state.alerts.find(alert => alert.id === selected);
  return <div className={'alerts-workspace' + (selected ? ' has-alert' : '')}>
    <AlertList state={state} selected={selected} onOpen={() => {if (!selected) scroll.current = window.scrollY;}} />
    {selected && (alert ? <AlertPage {...props} state={state} onSaved={props.onSaved} key={alert.id} alert={alert} /> : <section className="panel padded"><h2>Alert not found</h2><a href="/alerts">‹ Alerts</a></section>)}
  </div>;
}
