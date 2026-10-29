import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';

// Oncall provisions workspace-password members without sending invitations.
export default async function initialize({request,origin,owner}) {
 const name='Independent response reviewer',password=randomBytes(32).toString('hex');
 const created=await request(new URL('/api/members',origin).href,{method:'POST',headers:{Origin:origin,Cookie:owner.cookie,'Content-Type':'application/json'},body:JSON.stringify({name,password,role:'responder'})});
 assert.equal(created.status,201);await created.body?.cancel();
 const login=await request(new URL('/api/login',origin).href,{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name,password})});
 assert.equal(login.status,200,'Workspace-password sign-in returns its native HTTP 200 session');
 return login;
}
