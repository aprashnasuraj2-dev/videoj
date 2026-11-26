// Models may generate NEW formulas over caller-reviewed evidence bindings.
// The closed expression parser and compiler own every numerical leaf and result.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {validateReviewedContract} from './reviewed-claim-compiler.js';
import {compileReviewedExpression} from './reviewed-expression.js';
import {triageReviewedInterpretations} from './semantic-triage.js';
import {prepareCouncil,runCouncilRounds,councilClosed,councilFail,councilText,denseCouncilArray} from './council-scheduler.js';
const SCOPE='reviewed-question-bindings-and-conditional-feedback';
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function runExpressionCouncil({contractText,contractPin,disclosure,routes,workspace,maxRounds=2,maxOutputTokens=512,timeoutMs=15000,signal}={}){
 const config=prepareCouncil({routes,workspace,shareScope:SCOPE,maxRounds,maxOutputTokens,timeoutMs,signal,maxSlots:8});
 if(!councilClosed(disclosure,['bindingIds','includeValues'])||!Array.isArray(disclosure.bindingIds)||disclosure.bindingIds.length<1||disclosure.bindingIds.length>16||!denseCouncilArray(disclosure.bindingIds)||typeof disclosure.includeValues!=='boolean'||disclosure.bindingIds.some(x=>typeof x!=='string'||!ID.test(x))||new Set(disclosure.bindingIds).size!==disclosure.bindingIds.length)councilFail('DISCLOSURE');
 const allowed=new Set(disclosure.bindingIds),includeValues=disclosure.includeValues;
 // Snapshot disclosure and route choices BEFORE asynchronous admission.
 await validateReviewedContract(contractText,contractPin);
 const contract=parseUniqueJson(contractText,{maxChars:262144,maxDepth:9});
 if(!councilText(contract.question.text,2000)||[...allowed].some(id=>!contract.bindings.some(b=>b.id===id)))councilFail('DISCLOSURE');
 const question=contract.question.text,bindings=freeze(contract.bindings.filter(b=>allowed.has(b.id)).map(b=>({id:b.id,type:b.type,...(includeValues?{valueLexeme:b.span.quote}:{})})));
 const result=await runCouncilRounds(config,{
  operation:(route,round,feedback)=>({kind:'reviewed-expression-council-v1',agentId:route.id,role:route.role,question,bindings,round,feedback,instruction:'Propose a single mathematical comparison representing a possible interpretation of the question. Use only offered [binding_id] references, parentheses, + - * / and exactly one of == < <= > >=. No numeric literals, code, URLs, new inputs, or claimed verdict. Return JSON {version:1,kind:"expression",expression:"..."} or {version:1,kind:"abstain"}. Prior verification is conditional only; challenge incorrect interpretations rather than vote.'}),
  admit:text=>{
   const p=parseUniqueJson(text,{maxChars:8192,maxDepth:3});
   if(councilClosed(p,['version','kind'])&&p.version===1&&p.kind==='abstain')return null;
   if(!councilClosed(p,['version','kind','expression'])||p.version!==1||p.kind!=='expression'||!councilText(p.expression,4096))councilFail('PROPOSAL_REFUSED');
   // A guessed but undisclosed binding must not be used even though it exists
   // in the locally retained full contract. The parser subsequently validates
   // the complete grammar, so an obfuscated or malformed reference cannot pass.
   for(const m of p.expression.matchAll(/\[([A-Za-z][A-Za-z0-9_-]{0,63})\]/g))if(!allowed.has(m[1]))councilFail('PROPOSAL_REFUSED');
   return p.expression;
  },
  async verify(expression){
   const e=await compileReviewedExpression(contractText,contractPin,expression);
   if(e.usedBindings.some(id=>!allowed.has(id)))councilFail('VERIFICATION_REFUSED');
   return freeze({expression,proposalText:e.proposalText,proposalDigest:e.proposalDigest,usedBindings:e.usedBindings,target:e.target,authorship:'MODEL_PROPOSAL',semanticReview:'REQUIRED'});
  },
  feedbackRow:(round,row,artifact)=>({round,agentId:row.agentId,expression:row.candidateKey,verification:artifact.target.status})
 });
 const rounds=result.rounds.map(row=>freeze({round:row.round,agents:row.agents.map(({candidateKey,...other})=>candidateKey===undefined?other:{...other,expression:candidateKey})}));
 // Keep every valid model expression and every agent occurrence. Compare unique
 // compiled proposal bytes, not a popularity vote. The existing triage profile
 // has an eight-proposal bound, enforced by maxSlots before any model call.
 const unique=[...new Map(result.artifacts.map(x=>[x.proposalDigest,x])).values()];
 let triage=null,batchText=null;
 if(unique.length>=2&&result.termination!=='CANCELLED_OR_TIMEOUT'&&!signal?.aborted){
  batchText=JSON.stringify({version:1,contractDigest:contractPin,proposals:unique.map((p,i)=>({id:'candidate_'+(i+1),proposalText:p.proposalText}))});
  triage=await triageReviewedInterpretations(contractText,contractPin,batchText);
 }
 const cancelled=result.termination==='CANCELLED_OR_TIMEOUT'||signal?.aborted;
 if(cancelled){triage=null;batchText=null;}
 const state=cancelled?'INCOMPLETE_CANCELLED':triage?triage.state:unique.length===1?'SINGLE_ADMITTED_PROPOSAL':'NO_ADMITTED_PROPOSALS';
 return freeze({profile:'sutra-reviewed-expression-council/v1',mode:'injected-transport-laboratory',contractDigest:contractPin,disclosure:{bindingIds:bindings.map(x=>x.id),includeValues},rounds,candidates:result.artifacts,uniqueCompiledProposals:unique.length,batchText,triage,state,termination:cancelled?'CANCELLED_OR_TIMEOUT':result.termination,agreement:result.agreement,semanticReview:'REQUIRED',decisionAuthority:'NONE',qualification:'New model-generated formulas over host-reviewed bindings, not human-approved meanings. Numeric computation is conditional; no semantic coverage, external evidence truth, or decision authority. Binding values are shared only with explicit value scope; conditional feedback can reveal relations among approved bindings. No live provider or key entry.'});
}
