import {useState} from 'react';
import type {SnsConfiguration} from './sns-config';
import {request} from '../useWorkspace';

export function SnsFields({value,onChange}:{value:{account:string;region:string;topic:string};onChange:(value:{account:string;region:string;topic:string})=>void}) {
  return <fieldset><legend>AWS topic</legend>
    <label className="field">AWS account ID<input aria-label="AWS account ID" required pattern="[0-9]{12}" maxLength={12} value={value.account} onChange={e=>onChange({...value,account:e.target.value})}/></label>
    <label className="field">AWS region<select aria-label="AWS region" value={value.region} onChange={e=>onChange({...value,region:e.target.value})}>{['us-east-1','us-east-2','us-west-1','us-west-2','us-gov-east-1','us-gov-west-1','cn-north-1','cn-northwest-1'].map(r=><option key={r}>{r}</option>)}</select></label>
    <label className="field">Topic ARN<input aria-label="Topic ARN" required maxLength={256} placeholder="arn:aws:sns:us-east-1:123456789012:alerts" value={value.topic} onChange={e=>onChange({...value,topic:e.target.value})}/></label>
  </fieldset>;
}
export function SnsSettings({id,config,credential,active=true,canReveal=true}:{id:string;config:SnsConfiguration;credential?:string;active?:boolean;canReveal?:boolean}) {
  const [key,setKey]=useState(''),[error,setError]=useState('');
  const endpoint=(secret:string)=>window.location.origin+'/api/sns/'+encodeURIComponent(id)+'/'+encodeURIComponent(secret);
  return <section aria-label="SNS subscription"><h3>Amazon SNS</h3>
    <p role="status">{active?config.status:'Revoked'} · Last notification: {config.lastNotification?new Date(config.lastNotification).toLocaleString():'None'}</p>
    <p style={{overflowWrap:'anywhere'}}>{config.topic}</p>
    <p>Subscribe this HTTPS endpoint to the topic. Oncall verifies AWS signatures before confirming. Keep the endpoint private. Rotation requires updating the subscription endpoint.</p>
    {(credential||key)&&active?<label className="field">SNS endpoint URL<input aria-label="SNS endpoint URL" readOnly value={endpoint(credential||key)} onFocus={e=>e.currentTarget.select()}/></label>:active&&canReveal&&<button type="button" onClick={async()=>{try{const result=await request('/api/integrations/intake/'+encodeURIComponent(id)+'/reveal',{});setKey(result.key);setError('');}catch{setError('An administrator must reveal the endpoint.');}}}>Show SNS endpoint</button>}
    {error&&<p role="alert">{error}</p>}
    {config.status==='unsubscribed'&&<p role="alert">AWS reports this subscription was removed. The integration owner must restore its subscription and maintain alternate coverage. Paging stays OFF.</p>}
  </section>;
}
