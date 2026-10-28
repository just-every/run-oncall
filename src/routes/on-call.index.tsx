import {createFileRoute} from '@tanstack/react-router';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
import {OnCallScreen} from '../on-call/OnCallScreen';
export function OnCallSection() {
  const {page}=useWorkspaceContext();
  return page==='on-call'?<OnCallScreen/>:null;
}
export const Route=createFileRoute('/on-call/')({component:()=>null});
