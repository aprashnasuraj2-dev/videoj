// Bounded robust decision-value planning over a completely evaluated finite
// synthetic grid. Overlapping/no-result observation branches are not probabilities.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {evaluateSemanticWorldGrid} from './semantic-world-grid.js';
export const VERSION='sutra-robust-acquisition/v1';
const fail=x=>{throw TypeError('ACQUISITION_'+x);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const amount=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000&&!Object.is(x,-0);
const sort=(a,b)=>a<b?-1:a>b?1:0;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const parse=(s,d=10)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const STATES=['constraint_satisfied','constraint_refuted'];
// Exact minimax over the admitted finite model, with an optional stop at
// every node. Each observation is available at most once per branch.
function solve(cells,decisions,actions,sources,initial,exposureBudget){
 const all=(1<<cells.length)-1,sourceIndex=new Map(sources.map((s,i)=>[s.id,i]));
 const initialMask=initial.reduce((m,s)=>m|(1<<sourceIndex.get(s)),0),memo=new Map();
 const included=mask=>cells.filter((_,i)=>mask&(1<<i));
 function stop(mask){
  const active=included(mask);
  const rows=decisions.map(d=>({id:d.id,worstLoss:Math.max(...active.map(c=>d.loss[c.state]))})).sort((a,b)=>a.worstLoss-b.worstLoss||Number(b.id==='abstain')-Number(a.id==='abstain')||sort(a.id,b.id));
  return {kind:'stop',decision:rows[0].id,cells:active.map(c=>c.id),worstObjective:rows[0].worstLoss,worstExposure:0,alternatives:rows};
 }
 function visit(mask,used,acquired,left){
  const key=[mask,used,acquired,left].join('|');if(memo.has(key))return memo.get(key);
  if(memo.size>=12000)fail('STATE_LIMIT');
  let best=stop(mask);
  for(let i=0;i<actions.length;i++){
   const a=actions[i],bit=1<<i;if(used&bit||a.exposure>left)continue;
   const groups=new Map();
   for(let j=0;j<cells.length;j++)if(mask&(1<<j))for(const label of a.labels[cells[j].id])groups.set(label,(groups.get(label)??0)|(1<<j));
   // A wholly uninformative action cannot improve the objective with
   // nonnegative costs; an informative read of the same source can acquire it later.
   if([...groups.values()].every(m=>m===mask))continue;
   const si=sourceIndex.get(a.sourceId),sbit=1<<si,acquisitionCost=acquired&sbit?0:sources[si].costUpper;
   const cost=acquisitionCost+a.readCostUpper,branches=[];
   for(const [outcome,subset] of [...groups].sort(([a],[b])=>sort(a,b))){
    branches.push({outcome,next:visit(subset,used|bit,acquired|sbit,left-a.exposure)});
   }
   const candidate={kind:'observe',actionId:a.id,sourceId:a.sourceId,cells:included(mask).map(c=>c.id),acquisitionCostUpper:acquisitionCost,readCostUpper:a.readCostUpper,exposure:a.exposure,
    worstObjective:cost+Math.max(...branches.map(b=>b.next.worstObjective)),worstExposure:a.exposure+Math.max(...branches.map(b=>b.next.worstExposure)),branches};
   // Prefer stopping when information offers no strict worst-case benefit.
   if(candidate.worstObjective<best.worstObjective||(candidate.worstObjective===best.worstObjective&&best.kind==='observe'&&sort(candidate.actionId,best.actionId)<0))best=candidate;
  }
  memo.set(key,best);return best;
 }
 const noObservation=stop(all),plan=visit(all,0,initialMask,exposureBudget);
 const perfectInformationLowerBound=Math.max(...cells.map(c=>Math.min(...decisions.map(d=>d.loss[c.state]))));
 return {plan,noObservation,perfectInformationLowerBound,worstCaseImprovement:noObservation.worstObjective-plan.worstObjective,statesEvaluated:memo.size};
}
export async function planRobustAcquisition(versionText,versionPin,gridText,gridPin,policyText,policyPin){
 if(typeof policyPin!=='string'||await casePin(policyText)!==policyPin)fail('PIN');
 const grid=await evaluateSemanticWorldGrid(versionText,versionPin,gridText,gridPin),p=parse(policyText),raw=parse(versionText,6),contract=parse(raw.contractText);
 if(!keys(p,['version','versionDigest','gridDigest','costUnit','exposureUnit','exposureBudget','sourceCosts','initiallyAcquired','decisions','actions'])||p.version!==1||p.versionDigest!==versionPin||p.gridDigest!==gridPin||!id(p.costUnit)||!id(p.exposureUnit)||!amount(p.exposureBudget))fail('POLICY');
 // Refuse rather than silently optimize over only the convenient grid rows.
 if(grid.coverage.truncated||grid.coverage.totalCandidateCells>16||grid.worlds.some(w=>w.rows.some(r=>!STATES.includes(r.state))))return freeze({version:VERSION,versionDigest:versionPin,gridDigest:gridPin,policyDigest:policyPin,status:'UNRESOLVED_OR_EXCESSIVE_GRID',coverage:grid.coverage,decisionAuthority:'NONE',qualification:'No plan: complete decisive grid required, with at most 16 candidate-world cells.'});
 const cells=grid.worlds.flatMap(w=>w.rows.map(r=>({id:w.id+':'+r.id,worldId:w.id,candidateId:r.id,state:r.state,assignment:w.assignment})));
 const byBinding=new Map(contract.bindings.map(b=>[b.id,b.span.sourceId])),axes=new Map(grid.axes.map(a=>[a.bindingId,a.values]));
 if(!Array.isArray(p.sourceCosts)||p.sourceCosts.length>8||p.sourceCosts.some(s=>!keys(s,['id','costUpper'])||!contract.sources.some(x=>x.id===s.id)||!amount(s.costUpper))||new Set(p.sourceCosts.map(s=>s.id)).size!==p.sourceCosts.length)fail('SOURCE_COSTS');
 const sources=p.sourceCosts.slice().sort((a,b)=>sort(a.id,b.id));
 if(!Array.isArray(p.initiallyAcquired)||new Set(p.initiallyAcquired).size!==p.initiallyAcquired.length||p.initiallyAcquired.some(s=>!sources.some(x=>x.id===s)))fail('ACQUIRED');
 if(!Array.isArray(p.decisions)||p.decisions.length<2||p.decisions.length>6||!p.decisions.some(d=>d?.id==='abstain')||new Set(p.decisions.map(d=>d?.id)).size!==p.decisions.length||p.decisions.some(d=>!keys(d,['id','loss'])||!id(d.id)||!keys(d.loss,STATES)||STATES.some(s=>!amount(d.loss[s]))))fail('DECISIONS');
 if(!Array.isArray(p.actions)||p.actions.length>6||new Set(p.actions.map(a=>a?.id)).size!==p.actions.length)fail('ACTIONS');
 const actions=p.actions.map(a=>{
  if(!keys(a,['id','sourceId','bindingId','readCostUpper','exposure','outcomes'])||!id(a.id)||!sources.some(s=>s.id===a.sourceId)||byBinding.get(a.bindingId)!==a.sourceId||!axes.has(a.bindingId)||!amount(a.readCostUpper)||!amount(a.exposure)||!Array.isArray(a.outcomes))fail('ACTION');
  const values=axes.get(a.bindingId);
  if(a.outcomes.length!==values.length||new Set(a.outcomes.map(o=>o?.value)).size!==values.length||a.outcomes.some(o=>!keys(o,['value','labels'])||!values.includes(o.value)||!Array.isArray(o.labels)||!o.labels.length||o.labels.length>4||o.labels.some(l=>!id(l))||new Set(o.labels).size!==o.labels.length))fail('OUTCOMES');
  const labels=new Map(a.outcomes.map(o=>[o.value,o.labels]));
  if(new Set(a.outcomes.flatMap(o=>o.labels)).size>6)fail('OUTCOME_LIMIT');
  return {id:a.id,sourceId:a.sourceId,readCostUpper:a.readCostUpper,exposure:a.exposure,labels:Object.fromEntries(cells.map(c=>[c.id,labels.get(c.assignment.find(x=>x.bindingId===a.bindingId).value)]))};
 }).sort((a,b)=>sort(a.id,b.id));
 const result=solve(cells,p.decisions,actions,sources,p.initiallyAcquired,p.exposureBudget);
 return freeze({version:VERSION,versionDigest:versionPin,gridDigest:gridPin,policyDigest:policyPin,status:'FINITE_DECLARED_POLICY',coverage:grid.coverage,costUnit:p.costUnit,exposureUnit:p.exposureUnit,exposureBudget:p.exposureBudget,
  cells,availableActions:actions.map(a=>({id:a.id,outcomeCells:[...new Set(Object.values(a.labels).flat())].sort(sort).map(label=>({label,cells:cells.filter(c=>a.labels[c.id].includes(label)).map(c=>c.id)}))})),...result,decisionAuthority:'NONE',
  qualification:'Exact minimax of declared abstract terminal loss plus upper-bound acquisition/read costs under a worst-branch exposure cap. Overlapping possible readings and failed observations are adversarial, not probabilistic; no correlation constraints across actions, no physical feasibility, real cost, completeness, recommendation or execution authority. All programs and worlds are supplied synthetic cases.'});
}
