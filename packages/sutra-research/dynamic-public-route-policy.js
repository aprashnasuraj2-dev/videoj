// Separate dynamic document policy; never changes exact hosted-model admission.
import {isIP} from 'node:net';
import {publicAddress} from '../sutra-inference/public-route-policy.js';
import {secretLike} from './research-session.js';
const fail=code=>{throw Object.assign(Error('Dynamic route refused: '+code),{code});};
const SAFE_QUERY=new Set(['id','p','page','year','lang','format','article','articleId','doi','pii','pmid','pmcid','report','version','v','offset','limit','start','end','sort']);
const TRACKING=/^(?:utm_[a-z0-9_]+|gclid|fbclid|msclkid)$/i;
export function admitDocumentURL(raw,{allowQuery=false}={}){
 if(typeof raw!=='string'||raw.length>2048||/[\u0000-\u0020\u007f\\]/.test(raw))fail('URL');
 let u;try{u=new URL(raw);}catch{fail('URL');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname.length>253||isIP(u.hostname)||!u.hostname.includes('.')||u.hostname.endsWith('.')||!u.hostname.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))||/(?:^|\.)(localhost|local|internal|lan|home|onion|test|invalid|example|arpa)$/.test(u.hostname))fail('URL');
 if(/%(?:00|0a|0d|2f|5c)/i.test(u.pathname))fail('URL');
 try{if(secretLike(decodeURIComponent(u.pathname)))fail('SENSITIVE_URL');}catch(e){if(e?.code)throw e;fail('URL');}
 u.hash='';
 if(u.search||u.href.includes('?')){
  if(!allowQuery)fail('URL');
  const clean=new URLSearchParams(),seen=new Set();let n=0;
  for(const [key,value] of u.searchParams){
   if(++n>12)fail('QUERY_PARAMETERS');
   if(TRACKING.test(key))continue;
   if(!SAFE_QUERY.has(key)||seen.has(key)||!( /^[A-Za-z0-9._-]{1,80}$/.test(value)||(key==='id'||key==='doi'||key==='articleId')&&/^10\.\d{4,9}\/[A-Za-z0-9._;()\/+-]{1,120}$/i.test(value) )||secretLike(value)||/^[A-Za-z0-9_-]{40,}$/.test(value))fail('QUERY_PARAMETERS');
   seen.add(key);clean.append(key,value);
  }
  u.search=clean.toString();
 }
 return u.href;
}
export async function resolvePublicPeer(host,resolveAll,signal){
 if(signal?.aborted)fail('CANCELLED');
 const rows=await resolveAll(host);
 if(signal?.aborted)fail('CANCELLED');
 if(!Array.isArray(rows)||rows.length<1||rows.length>16||rows.some(r=>!r||![4,6].includes(r.family)||isIP(r.address)!==r.family||!publicAddress(r.address)))fail('DNS_ADDRESS');
 return [...rows].sort((a,b)=>a.family-b.family||a.address.localeCompare(b.address))[0];
}
