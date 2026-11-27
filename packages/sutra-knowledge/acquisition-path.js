import {selectedSpan} from './reviewed-draft.js';
// Replay a caller-declared path through a recomputed finite policy.
// Observation labels are hypotheses, not authenticated measurements.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {planRobustAcquisition} from './robust-acquisition.js';
const fail=c=>{throw TypeError('ACQUISITION_PATH_'+c);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
export async function replayAcquisitionPath({versionText,versionPin,gridText,gridPin,policyText,policyPin,traceText,tracePin}={}){
 if(await casePin(traceText)!==tracePin)fail('PIN');
 const t=parseUniqueJson(traceText,{maxChars:8192,maxDepth:4});
 if(!keys(t,['version','policyPin','events'])||t.version!==1||t.policyPin!==policyPin||!Array.isArray(t.events)||t.events.length>6)fail('TRACE');
 const result=await planRobustAcquisition(versionText,versionPin,gridText,gridPin,policyText,policyPin);
 if(result.status!=='FINITE_DECLARED_POLICY')fail('UNRESOLVED');
 let node=result.plan,costUpper=0,exposure=0;const steps=[];
 for(const e of t.events){
  if(!keys(e,['actionId','outcome'])||node.kind!=='observe'||e.actionId!==node.actionId||typeof e.outcome!=='string')fail('ACTION');
  const branch=node.branches.find(b=>b.outcome===e.outcome);if(!branch)fail('OUTCOME');
  costUpper+=node.acquisitionCostUpper+node.readCostUpper;exposure+=node.exposure;
  steps.push({actionId:e.actionId,outcome:e.outcome,beforeCells:node.cells,afterCells:branch.next.cells});
  node=branch.next;
 }
 return {version:1,versionPin,gridPin,policyPin,tracePin,status:node.kind==='stop'?'DECLARED_TERMINAL':'AWAITING_DECLARED_OBSERVATION',steps,survivingCells:node.cells,costUpper,exposure,declaredDecision:node.kind==='stop'?node.decision:null,nextAction:node.kind==='observe'?node.actionId:null,decisionAuthority:'NONE',qualification:'Recomputed synthetic policy and caller-declared labels only. No real observation receipt, source authentication, external contact or action approval.'};
}

// A receipt binds the exact text that the caller declared as an observation.
// Neither the text nor the mapping to an action authenticates a measurement.
export async function replaySourceBoundAcquisitionPath(input={}){
 const {receiptsText,receiptsPin,traceText,tracePin}=input;
 if(await casePin(receiptsText)!==receiptsPin||await casePin(traceText)!==tracePin)fail('RECEIPT_PIN');
 const envelope=parseUniqueJson(receiptsText,{maxChars:131072,maxDepth:7}),trace=parseUniqueJson(traceText,{maxChars:8192,maxDepth:4});
 if(!keys(envelope,['version','tracePin','receipts'])||envelope.version!==1||envelope.tracePin!==tracePin||!Array.isArray(envelope.receipts)||!Array.isArray(trace.events)||envelope.receipts.length!==trace.events.length||envelope.receipts.length>6)fail('RECEIPT_SHAPE');
 const evidence=[];
 for(let i=0;i<envelope.receipts.length;i++){
  const r=envelope.receipts[i],e=trace.events[i];
  if(!keys(r,['actionId','outcome','sourceId','sourceText','sourcePin','start','end'])||r.actionId!==e?.actionId||r.outcome!==e?.outcome||typeof r.sourceId!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(r.sourceId)||typeof r.sourceText!=='string'||r.sourceText.length>16384||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<0||r.end<=r.start||r.end>r.sourceText.length||r.sourceText.slice(r.start,r.end)!==r.outcome)fail('RECEIPT_MAPPING');
  if(await casePin(r.sourceText)!==r.sourcePin)fail('RECEIPT_SOURCE_PIN');
  const span=selectedSpan(r.sourceId,r.sourceText,r.start,r.end);
  evidence.push({actionId:r.actionId,outcome:r.outcome,sourceId:r.sourceId,sourcePin:r.sourcePin,span});
 }
 const path=await replayAcquisitionPath(input);
 return {version:1,receiptsPin,path,evidence,observationAuthentication:'NOT_ESTABLISHED',decisionAuthority:'NONE',qualification:'Exact caller-declared observation labels are bound to pinned text and spans. No authentication, measurement validity, causal inference, external contact or action approval.'};
}
