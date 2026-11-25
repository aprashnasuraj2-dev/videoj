// Original synthetic statistics lesson. No empirical or causal authority.
// Peer publishes ONLY a proposed observation capability. The caller derives
// its partition from executable local worlds, and reads local source bytes.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {createVerifier} from './index.js';
import {evaluateFrontier} from './frontier.js';
import {loadPeerNetwork,runNetwork} from '../sutra-runtime/index.js';
import {QUIZ_SOURCE_TEXT} from './examples/quiz-source.mjs';
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const refuse=()=>{throw TypeError('QUIZ_CAPABILITY_REFUSED');};
export const CASE_ID='quiz_strata_v1',SCOPE='synthetic_quiz_strata',COST_UNIT='synthetic_effort';
const rowIds=['a_beginner','a_advanced','b_beginner','b_advanced'];
const allowedNodes=['a_total_rate','b_total_rate','a_beginner_n','a_advanced_n','b_beginner_n','b_advanced_n','a_beginner_rate','a_advanced_rate','b_beginner_rate','b_advanced_rate'];
const input=(id,value,basis)=>({id,kind:'input',value:String(value),dimension:[0,0,0],basis});
const derive=(id,op,a,b)=>({id,kind:'derive',op,args:[a,b]});
const constraint=(id,op,a,b)=>({id,kind:'constraint',op,args:[a,b]});
const balanced={a_beginner:[40,50],a_advanced:[40,50],b_beginner:[30,50],b_advanced:[30,50]};
const reversal=JSON.parse(QUIZ_SOURCE_TEXT).rows;
const baseOffers=[{nodeId:'a_total_rate',cost:1},{nodeId:'a_beginner_rate',cost:6}];
const digest=async text=>'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
function graph(rows){
 if(!keys(rows,rowIds))refuse();
 const nodes=[input('two',2,'Equal standardization weight divisor')];
 for(const id of rowIds){
  const pair=rows[id];
  if(!Array.isArray(pair)||pair.length!==2||!pair.every(Number.isSafeInteger)||pair[0]<0||pair[1]<1||pair[0]>pair[1]||pair[1]>100000)refuse();
  nodes.push(input(id+'_pass',pair[0],'Declared passes'),input(id+'_n',pair[1],'Declared sample count'),derive(id+'_rate','div',id+'_pass',id+'_n'));
 }
 for(const method of ['a','b']){
  const b=method+'_beginner',a=method+'_advanced';
  nodes.push(derive(method+'_total_pass','add',b+'_pass',a+'_pass'),derive(method+'_total_n','add',b+'_n',a+'_n'),
   derive(method+'_total_rate','div',method+'_total_pass',method+'_total_n'),derive(method+'_rate_sum','add',b+'_rate',a+'_rate'),
   derive(method+'_standardized','div',method+'_rate_sum','two'));
 }
 nodes.push(constraint('a_standardized_higher','gt','a_standardized','b_standardized'));
 return JSON.stringify({schemaVersion:1,nodes});
}
function admitOffer(offer){
 if(!keys(offer,['nodeId','cost'])||!allowedNodes.includes(offer.nodeId)||!Number.isSafeInteger(offer.cost)||offer.cost<1||offer.cost>1000000)refuse();
 return {nodeId:offer.nodeId,cost:offer.cost};
}
const label=value=>'v_'+value.replace('-','neg_').replace('/','_');
const find=(r,id)=>r.report.receipts.find(x=>x.id===id);
async function evaluateWorlds(){
 const worlds=[];
 for(const [id,rows] of [['balanced',balanced],['reversal',reversal]]){
  const graphText=graph(rows),r=await createVerifier().evaluate(graphText);
  worlds.push({id,graphText,constraintId:'a_standardized_higher',r});
 }
 return worlds;
}
async function prepare(extra=[],sourceAvailable=true){
 if(typeof sourceAvailable!=='boolean')refuse();
 if(!Array.isArray(extra)||extra.length>6)refuse();
 const offers=[...baseOffers,...extra.map(admitOffer)];
 if(new Set(offers.map(o=>o.nodeId)).size!==offers.length)refuse();
 const worlds=await evaluateWorlds();
 const observations=(sourceAvailable?offers:[]).map(o=>({id:o.nodeId,cost:o.cost,outcomes:Object.fromEntries(worlds.map(w=>[w.id,label(find(w.r,o.nodeId).outcome.value)]))}));
 const caseText=JSON.stringify({version:1,decisionId:CASE_ID,costUnit:COST_UNIT,worlds:worlds.map(({id,graphText,constraintId})=>({id,graphText,constraintId})),observations});
 const result=await evaluateFrontier(caseText);
 return {worlds,offers,caseText,result};
}
export async function planQuiz(extra=[],{sourceAvailable=true}={}){
 const p=await prepare(extra,sourceAvailable);
 // Reveal aggregates, not hidden subgroup rates before the learner observes.
 return freeze({caseId:CASE_ID,caseText:p.caseText,plan:p.result,aggregates:p.worlds.map(w=>({id:w.id,a:find(w.r,'a_total_rate').outcome.value,b:find(w.r,'b_total_rate').outcome.value})),
  offers:p.offers.map(o=>({...o})),sourceAvailable,scope:SCOPE,truthStatus:'synthetic_model_only'});
}
export async function readQuizObservation({extra=[],nodeId,prediction,sourceText=QUIZ_SOURCE_TEXT,sourceAvailable=true}={}){
 if(sourceAvailable!==true)refuse();
 if(!['a_higher','not_a_higher','unsure'].includes(prediction))refuse();
 const p=await prepare(extra);
 if(p.result.plan?.kind!=='observe'||p.result.plan.observationId!==nodeId)refuse();
 // Independent host-pinned source, not a peer receipt or asserted outcome.
 // Exact bytes are fixed for this original lesson. No source trust promotion.
 if(typeof sourceText!=='string'||sourceText.length>8192||await digest(sourceText)!==await digest(QUIZ_SOURCE_TEXT))refuse();
 const src=parseUniqueJson(sourceText,{maxChars:8192,maxDepth:6});
 if(!keys(src,['version','id','sourceVersion','scope','rows'])||src.version!==1||src.scope!==SCOPE||src.id!=='quiz_group_table'||src.sourceVersion!=='v1')refuse();
 const actual=await createVerifier().evaluate(graph(src.rows));
 const observed=find(actual,nodeId),value=observed.outcome.value;
 const survivors=p.worlds.filter(w=>find(w.r,nodeId).outcome.value===value);
 if(!survivors.length)return freeze({status:'outside_declared_worlds',truthStatus:'synthetic_model_only',nodeId,value});
 const reduced=JSON.parse(p.caseText);reduced.worlds=reduced.worlds.filter(w=>survivors.some(s=>s.id===w.id));
 reduced.observations=reduced.observations.filter(o=>o.id!==nodeId).map(o=>({...o,outcomes:Object.fromEntries(survivors.map(w=>[w.id,o.outcomes[w.id]]))}));
 const remaining=await evaluateFrontier(JSON.stringify(reduced));
 const answer=remaining.status==='invariant_decision'?(remaining.plan.decision==='constraint_satisfied'?'a_higher':'not_a_higher'):null;
 const standardized=Object.fromEntries(['a_standardized','b_standardized','a_beginner_rate','a_advanced_rate','b_beginner_rate','b_advanced_rate'].map(id=>[id,find(actual,id).outcome.value]));
 return freeze({status:answer?'conditional_question_resolved':'more_observations_needed',truthStatus:'synthetic_model_only',nodeId,value,prediction,answer,
  feedback:!answer?'unresolved':prediction==='unsure'?'uncertainty_resolved':prediction===answer?'prediction_supported':'prediction_revised',
  excludedWorlds:p.worlds.filter(w=>!survivors.some(s=>s.id===w.id)).map(w=>w.id),remaining,standardized,
  evidence:{sourceText,sourceDigest:await digest(sourceText),sourceVersion:src.sourceVersion,scope:src.scope,observationReceipt:observed,
   graphDigest:actual.report.graphDigest,level:'host_pinned_synthetic_source'},cost:p.result.plan.cost,
  explanation:'Equal-weighted subgroup comparison is conditional on the declared exercise; it does not establish causal effectiveness.'});
}
export function validateQuizCapability(metadata){
 const v=metadata?.sutraObservation;
 if(!keys(v,['version','caseId','scope','costUnit','nodeId','cost'])||v.version!==1||v.caseId!==CASE_ID||v.scope!==SCOPE||v.costUnit!==COST_UNIT)refuse();
 return freeze(admitOffer({nodeId:v.nodeId,cost:v.cost}));
}
export async function discoverQuizCapability({peerUrl,inspector,signal}={}){
 const peer=await loadPeerNetwork({peerUrl,inspector,signal,timeoutMs:30000});
 const offer=validateQuizCapability(peer.definition.metadata);
 // A publisher supplies a single leaf data-only adviser, not an executable
 // tool or a network able to make additional contacts. The caller runs it.
 if(peer.definition.tools.length!==1||peer.definition.tools[0].tools.length!==0)refuse();
 const candidate=await runNetwork({definition:peer.definition,name:peer.name,frontMan:peer.frontMan,
  request:JSON.stringify({caseId:CASE_ID,scope:SCOPE,allowedObservation:offer.nodeId}),
  model:{mode:'scripted-test',async chat({signal}){signal?.throwIfAborted();return {content:JSON.stringify({version:1,nodeId:offer.nodeId}),toolCalls:[]};}},
  signal,limits:{maxDepth:2,maxAgents:1,maxSteps:2,maxModelCalls:2,maxOutputChars:2000,timeoutMs:5000}});
 const proposal=parseUniqueJson(candidate.text,{maxChars:1024,maxDepth:3});
 if(!keys(proposal,['version','nodeId'])||proposal.version!==1||proposal.nodeId!==offer.nodeId||candidate.agentCalls!==1)refuse();
 return freeze({offer,publisherOrigin:peer.origin,artifacts:peer.artifacts,network:peer.name,mode:candidate.mode,agentCalls:candidate.agentCalls,modelCalls:candidate.modelCalls,
  authority:'declared_capability_only'});
}
export function quizTransfer(answer){
 if(!['causal','standardized_only','aggregate_only'].includes(answer))refuse();
 return freeze({correct:answer==='standardized_only',explanation:'A common weighting makes the subgroup comparison comparable within the model. It cannot establish causation without a suitable study design.'});
}
