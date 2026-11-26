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
