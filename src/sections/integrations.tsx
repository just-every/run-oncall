import {useLocation} from '@tanstack/react-router';
import {IntegrationWorkspace} from '../integrations/IntegrationWorkspace';
import {AutomationSettings} from '../automation/AutomationSettings';
import {EmailWorkspace} from '../email/EmailWorkspace';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
export function IntegrationsSection() {
 const {w,s,admin,page}=useWorkspaceContext(),{pathname}=useLocation();
 if(page!=='integrations')return null;
 const props={state:s,admin,busy:w.busy,run:w.run};
 return <IntegrationWorkspace {...props} path={pathname} panels={<AutomationSettings {...props}/>} emailPage={source=><EmailWorkspace {...props} addressId={source.id.slice(6)}/>}/>;
}
