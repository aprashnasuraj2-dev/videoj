// Host-held, one-shot expression council approval. Plan bytes alone do not
// grant a capability: execute is bound to the exact captured workspace/handles.
import {prepareCouncil} from './council-scheduler.js';
import {admitCouncilDisclosure,projectCouncilBindings} from './council-disclosure.js';
import {validateReviewedContract} from './reviewed-claim-compiler.js';
import {runExpressionCouncil} from './expression-council.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
const SCOPE='reviewed-question-bindings-and-conditional-feedback';
const fail=c=>{throw TypeError('COUNCIL_APPROVAL_'+c);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function prepareApprovedExpressionCouncil({contractText,contractPin,disclosure,routes,workspace,maxRounds=2,maxOutputTokens=512,timeoutMs=15000,signal,roundPolicy='fixed'}={}){
 if(!['fixed','stop-on-stagnation'].includes(roundPolicy))fail('POLICY');
 const config=prepareCouncil({routes,workspace,shareScope:SCOPE,maxRounds,maxOutputTokens,timeoutMs,signal,maxSlots:8});
 const admitted=admitCouncilDisclosure(disclosure,config.team.map(x=>x.id));
 const captured=config.team.map(x=>Object.freeze({id:x.id,role:x.role,handle:x.handle,model:x.model,shareScope:SCOPE}));
 const grant=freeze({bindingIds:admitted.bindingIds,includeValues:admitted.includeValues,agentScopes:admitted.scopes});
 await validateReviewedContract(contractText,contractPin);
 const c=parseUniqueJson(contractText,{maxChars:262144,maxDepth:9});
 if(admitted.bindingIds.some(id=>!c.bindings.some(b=>b.id===id)))fail('DISCLOSURE');
 const plan=freeze({version:1,contractPin,question:c.question.text,agents:config.team.map(x=>({id:x.id,role:x.role,providerId:x.providerId,profileId:x.profileId,model:x.model,scope:grant.agentScopes.find(s=>s.agentId===x.id),bindings:projectCouncilBindings(c,grant.agentScopes.find(s=>s.agentId===x.id))})),maxRounds,maxOutputTokens,timeoutMs,roundPolicy,qualification:'This plan authorizes only the captured in-process routes and displayed evidence/feedback scope, not fallback or semantic adoption. Provider identity remains host supplied.'});
 workspace.admitOperation(plan);
 const planPin=await casePin(JSON.stringify(plan));let used=false;
 // Recheck the captured route identities after asynchronous preview generation
 // and immediately before consuming the dispatch capability. The combined
 // security workstream additionally supplies an opaque generation fence.
 const revalidate=()=>{
  const current=prepareCouncil({routes:captured,workspace,shareScope:SCOPE,maxRounds,maxOutputTokens,timeoutMs,signal,maxSlots:8});
  if(current.team.some((r,i)=>r.providerId!==config.team[i].providerId||r.profileId!==config.team[i].profileId))fail('ROUTE_CHANGED');
  config.assertPublication?.();
  workspace.admitOperation(plan);
 };
 revalidate();
 const destination=config.team.map(x=>x.providerId+'/'+x.profileId+'/'+x.model).join(' | ');
 const visible=projectCouncilBindings(c,{bindingIds:admitted.bindingIds,includeValues:admitted.includeValues});
 const consentIntent=freeze({operation:'model_inference',destination,purpose:'Generate conditional proposals from the displayed reviewed binding scope.',disclosure:[...admitted.bindingIds],planPin,...(admitted.includeValues?{preview:Object.fromEntries(visible.map(x=>[x.id,x.valueLexeme]))}:{})});
 return Object.freeze({plan,planPin,consentIntent,async execute({consentInspector,approvedPlanPin}={}){
  if(used)fail('CONSUMED');if(approvedPlanPin!==planPin)fail('PIN');if(!consentInspector||typeof consentInspector.perform!=='function')fail('CONSENT');
  // Consume even on denial/failure; no retry or substitution under old approval.
  used=true;
  return consentInspector.perform(consentIntent,async()=>{
   revalidate();
   return runExpressionCouncil({contractText,contractPin,disclosure:grant,routes:captured,workspace,maxRounds,maxOutputTokens,timeoutMs,signal,roundPolicy});
  },{signal});
 }});
}
