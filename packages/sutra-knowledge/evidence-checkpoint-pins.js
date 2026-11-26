// Convenience transport of independently retained pins, never authentication.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
const PROFILE='sutra-evidence-checkpoint-pins/v1';
const REVISION=Object.freeze(['snapshotDigest','ancestorDigest','revisionPlanDigest','revisedDigest']);
const RECOVERY=Object.freeze([...REVISION,'recoveryPlanDigest','recoveredDigest']);
const fields=mode=>mode==='revision'?REVISION:mode==='recovery'?RECOVERY:null;
const fail=reason=>{throw TypeError('REVISION_PIN_CARD_'+reason);};
const pin=x=>typeof x==='string'&&/^sha256:[a-f0-9]{64}$/.test(x);
const closed=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export function makeEvidencePinCard(mode,values){
 const names=fields(mode);
 if(!names||!Array.isArray(values)||values.length!==names.length||names.some((_,i)=>!pin(values[i])))fail('FIELDS');
 return JSON.stringify({profile:PROFILE,mode,pins:Object.fromEntries(names.map((n,i)=>[n,values[i]]))},null,2)+'\n';
}
export function readEvidencePinCard(text){
 if(typeof text!=='string'||!text.length||text.length>2048||new TextEncoder().encode(text).length>2048)fail('SIZE');
 const p=parseUniqueJson(text,{maxChars:2048,maxDepth:4});
 if(!closed(p,['profile','mode','pins'])||p.profile!==PROFILE)fail('PROFILE');
 const names=fields(p.mode);
 if(!names||!closed(p.pins,names)||names.some(n=>!pin(p.pins[n])))fail('FIELDS');
 return Object.freeze({mode:p.mode,values:Object.freeze(names.map(n=>p.pins[n]))});
}
