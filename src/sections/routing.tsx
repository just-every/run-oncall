import {RoutingWorkspace} from '../routing/RoutingWorkspace';
import {CoordinationRules} from '../routing/CoordinationRules';
import {CompareHistory} from '../routing/CompareHistory';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
import '../routing/settings-routing.css';
export function RoutingSection() {
 const {w,page,s,admin}=useWorkspaceContext();
 const props={state:s,admin,busy:w.busy,run:w.run};
 if(page!=='routing')return null;
 return <div className="routing-settings">{!admin&&<p>An administrator manages routing keys and rules.</p>}<RoutingWorkspace {...props}/><CoordinationRules {...props}/><CompareHistory state={s}/><a className="integration-link" href="/docs/routed-intake">How routing works</a></div>;
}
