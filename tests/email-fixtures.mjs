import {randomBytes} from 'node:crypto'
export const localPart=()=> 'oncall-test-'+randomBytes(20).toString('hex');
export const recoveryRules=()=>[
 {id:'failed',action:'trigger',match:'all',conditions:[{field:'subject',op:'matches',value:'FAILED: (\\S+)'}],key:{field:'subject',kind:'regex',pattern:'FAILED: (\\S+)',group:1},severity:'critical',urgency:'high',priority:'P1'},
 {id:'ok',action:'resolve',match:'all',conditions:[{field:'subject',op:'matches',value:'OK: (\\S+)'}],key:{field:'subject',kind:'regex',pattern:'OK: (\\S+)',group:1}}
];
export async function mail(w,local,subject,{id=randomBytes(12).toString('hex'),body='Database monitor result',auth='pass',raw,from='monitor@example.test'}={}) {
 const to=local+'@inbound.example.test';
 const mime=raw??`From: ${from}\r\nTo: ${to}\r\nSubject: ${subject}\r\nMessage-ID: <${id}@monitor.example.test>\r\nAuthentication-Results: mx.cloudflare.net; dmarc=${auth} header.from=example.test; spf=pass\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`;
 const response=await fetch(w.origin+'/cdn-cgi/local/email?'+new URLSearchParams({from,to}),{method:'POST',headers:{'content-type':'message/rfc822'},body:mime});
 return {status:response.status,text:await response.text()};
}
