// Host-owned, single-span read capability. No network, write or ambient workspace access.
import {createLocalActionRegistry} from '../sutra-actions/index.js';
import {validateData} from './vendor/nsdeploy/actions.js';
export const WORKSPACE_EVIDENCE_REF='/local/workspace-evidence';
const fail=code=>{const e=Error(code);e.code=code;throw e;};
const pin=/^sha256:[a-f0-9]{64}$/;
const enc=new TextEncoder();
const schema={type:'object',properties:{sourceId:{type:'string',minLength:1,maxLength:64},start:{type:'integer',minimum:0,maximum:16384},end:{type:'integer',minimum:1,maximum:16384}},required:['sourceId','start','end'],additionalProperties:false};
const definition={name:'inspect_evidence',description:'Read only the exact human-approved UTF-16 source span. Use the supplied sourceId, start and end without modification. No other source or factual verification is available.',inputSchema:schema};
export async function prepareWorkspaceEvidence(input){
 const keys=['sourceId','sourceText','start','end'],d=input&&Object.getOwnPropertyDescriptors(input);
 if(!d||Object.getPrototypeOf(input)!==Object.prototype||Reflect.ownKeys(d).length!==keys.length||keys.some(k=>!d[k]?.enumerable||!Object.hasOwn(d[k],'value')))fail('EVIDENCE_CONFIG');
 const {sourceId,sourceText,start,end}=Object.fromEntries(keys.map(k=>[k,d[k].value]));
 if(typeof sourceId!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(sourceId)||typeof sourceText!=='string'||sourceText.length>16384||enc.encode(sourceText).length>65536||/[\ud800-\udfff]/u.test(sourceText)||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||Object.is(start,-0)||start<0||end<=start||end>sourceText.length||end-start>1000)fail('EVIDENCE_CONFIG');
 const quote=sourceText.slice(start,end);
 if(!quote.trim()||/[\ud800-\udfff]/u.test(quote)||enc.encode(quote).length>2000)fail('EVIDENCE_SPAN');
 const sourceDigest='sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(sourceText))),v=>v.toString(16).padStart(2,'0')).join('');
 return Object.freeze({sourceId,sourceDigest,start,end,quote,coordinateSystem:'utf16-extracted-text',truthStatus:'UNVERIFIED',authority:'NONE'});
}
export function createWorkspaceEvidenceClient({evidence,assertCurrent,signal}={}){
 if(!evidence||!pin.test(evidence.sourceDigest??'')||typeof assertCurrent!=='function')fail('EVIDENCE_CONFIG');
 const snapshot=Object.freeze({...evidence});let consumed=false;
 const current=()=>{if(signal?.aborted)fail('CANCELLED');if(assertCurrent()!==true)fail('EVIDENCE_STALE');};
 const matches=a=>a.sourceId===snapshot.sourceId&&a.start===snapshot.start&&a.end===snapshot.end;
 const registry=createLocalActionRegistry([{name:'inspect_evidence',effect:'read_local',destination:'approved model router',description:definition.description,validate:matches,execute:()=>{current();return snapshot;}}]);
 return Object.freeze({async listTools(){current();return [structuredClone(definition)];},async callTool(name,args){
  current();if(consumed)fail('EVIDENCE_CONSUMED');if(name!==definition.name)fail('EVIDENCE_TOOL');
  try{validateData(schema,args);}catch{fail('EVIDENCE_ARGUMENTS');}
  if(!matches(args))fail('EVIDENCE_ARGUMENTS');consumed=true;
  const proposal=registry.prepare(name,args);const result=await registry.execute(proposal.id);current();return JSON.stringify(result);
 }});
}
