import {useEffect, useState} from 'react';
import {leaveAfterSaving} from '../app/autosave/leaveGuard';
import {IncidentHead} from './IncidentHead';
import {PeoplePicker} from './PeoplePicker';
import {NextStep} from './NextStep';
import {Runbook} from './Runbook';
import {Timeline} from './Timeline';
import {MoreMenu, incidentActions, type IncidentAction} from './MoreMenu';
import {ActionSheet} from './more/ActionSheet';
import {Followups} from './more/Followups';
import {People} from './more/People';
import {Responders} from './more/Responders';
import {Snooze} from './more/Snooze';
import {Merge} from './more/Merge';
import {Split} from './more/Split';
import {TestPage} from './more/TestPage';
import {Handoff} from './more/Handoff';
import {Changes} from './more/Changes';
import {ServiceContext} from './more/ServiceContext';
import {useMutateAfterSaves} from './refreshAfterWrite';
import type {IncidentProps} from './types';
import './incident.css';

const sheets = {followups: Followups, people: People, responders: Responders, snooze: Snooze, merge: Merge, split: Split, test: TestPage, handoff: Handoff, changes: Changes, context: ServiceContext};
export function IncidentPage(incidentProps: IncidentProps) {
  const [menu, setMenu] = useState(false);
  const [action, setAction] = useState<IncidentAction | null>(null);
  const after = useMutateAfterSaves(incidentProps.mutate);
  const props = {...incidentProps, mutate: after.mutate, busy: incidentProps.busy || after.waiting};
  const Sheet = action ? sheets[action] : null;
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('.incident-head h1');
    heading?.focus({preventScroll: true});
    window.scrollTo({top: 0, behavior: 'instant'});
  }, [props.incident.id]);
  return <div className="incident-record">
    <a className="incident-back" href="/incidents">‹ Incidents</a>
    <section className="panel detail incident-page" aria-label="Incident">
      <IncidentHead {...props} actions={() => setMenu(true)} />
      <div className="incident-people"><PeoplePicker {...props} field="commander" label="Lead" /><PeoplePicker {...props} field="assignee" label="Assignee" /></div>
      <NextStep {...props} />
      <div className="incident-body"><Runbook {...props} /><Timeline {...props} /></div>
    </section>
    {menu && <MoreMenu demo={props.demo && props.incident.state !== 'resolved'} canEdit={props.canEdit} close={() => setMenu(false)} choose={action => {setMenu(false);setAction(action);}} />}
    {action && Sheet && <ActionSheet title={incidentActions.find(([id]) => id === action)![1]} close={() => {void leaveAfterSaving(() => setAction(null));}}><Sheet {...props} /></ActionSheet>}
  </div>;
}
