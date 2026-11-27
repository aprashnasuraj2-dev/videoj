// Separate dynamic document policy; never changes exact hosted-model admission.
import {isIP} from 'node:net';
import {publicAddress} from '../sutra-inference/public-route-policy.js';
const fail=code=>{throw Object.assign(Error('Dynamic route refused: '+code),{code});};
export function admitDocumentURL(raw){
 if(typeof raw!=='string'||raw.length>2048||/[\u0000-\u0020\u007f\\]/.test(raw))fail('URL');
 let u;try{u=new URL(raw);}catch{fail('URL');}
 // Conservative initial profile: no query, credentials, nonstandard port or IP literal.
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.href.includes('?')||u.hostname.length>253||isIP(u.hostname)||!u.hostname.includes('.')||u.hostname.endsWith('.')||!u.hostname.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))||/(?:^|\.)(localhost|local|internal|lan|home|onion|test|invalid|example|arpa)$/.test(u.hostname))fail('URL');
 if(/%(?:00|0a|0d|2f|5c)/i.test(u.pathname))fail('URL');
 u.hash='';return u.href;
}
export async function resolvePublicPeer(host,resolveAll,signal){
 if(signal?.aborted)fail('CANCELLED');
 const rows=await resolveAll(host);
 if(signal?.aborted)fail('CANCELLED');
 if(!Array.isArray(rows)||rows.length<1||rows.length>16||rows.some(r=>!r||![4,6].includes(r.family)||isIP(r.address)!==r.family||!publicAddress(r.address)))fail('DNS_ADDRESS');
 return [...rows].sort((a,b)=>a.family-b.family||a.address.localeCompare(b.address))[0];
}
