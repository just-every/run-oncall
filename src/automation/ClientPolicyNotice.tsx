import { useEffect, useState } from 'react';
import { apiClientPolicyUnset, type ClientPolicyStatus } from './client-policy';

export function ClientPolicyNotice({revision}:{revision:number}) {
 const [policy,setPolicy]=useState<ClientPolicyStatus>();
 useEffect(()=>{
  const controller=new AbortController();
  const refresh=async()=>{
   try {
    const response=await fetch('/api/automation',{signal:controller.signal});
    if(!response.ok)throw new Error('Policy status unavailable');
    const value=await response.json() as {policy:ClientPolicyStatus};
    if(!controller.signal.aborted)setPolicy(value.policy);
   }catch {
    if(!controller.signal.aborted)setPolicy({state:'unknown',setupUrl:'/agents'});
   }
  };
  void refresh();window.addEventListener('focus',refresh);
  return ()=>{controller.abort();window.removeEventListener('focus',refresh);};
 },[revision]);
 const message=policy?.state==='unset'?apiClientPolicyUnset
  :policy?.state==='set'?'Agent policy is set. Requests still need the granted permissions and an allowed policy decision.'
  :policy?.state==='paused'?'API clients are paused. An owner must resume agents in Agent policy.'
  :policy?.state==='expired'?'API clients wait for the Business policy to be renewed.'
  :policy?.state==='unknown'?'Agent policy could not be checked. Ask the installation owner to check it before using this client.'
  :'Checking agent policy before API clients can be used…';
 return <div className="api-client-policy" aria-label="API client policy">
  <p role="status">{message}</p>
  {policy?.state==='unset'&&<p>An owner or administrator sets the policy for this installation. In Business, ask the Business owner.</p>}
  {/* The policy has its own document handler outside the workspace router. */}
  <a className="integration-link" href={policy?.setupUrl??'/agents'} target="_self">{policy?.state==='unset'?'Set agent policy':'Agent policy'}</a>
 </div>;
}
