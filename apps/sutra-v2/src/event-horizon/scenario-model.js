import {createVerifier,replayReport} from '../../../../packages/sutra-knowledge/index.js';
import {exactMagnitude} from './local-computation.js';
import {parseGraph,graphText,starterGraph} from './proof-model.js';

export const SCENARIO_LIMITS=Object.freeze({axisValues:12,cases:36,nodeCases:2048});
const fail=code=>{throw Error(code);};
function freeze(value){
 if(value&&typeof value==='object'){
  for(const x of Object.values(value))freeze(x);
  Object.freeze(value);
 }
 return value;
}
export function parseAxisValues(text){
 if(typeof text!=='string'||text.length>2048)fail('SCENARIO_AXIS');
 const values=text.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean).map(exactMagnitude);
 if(!values.length||values.length>SCENARIO_LIMITS.axisValues||new Set(values).size!==values.length)fail('SCENARIO_AXIS_VALUES');
 return Object.freeze(values);
}
function validateAxis(axis,nodes){
 if(!axis||typeof axis.id!=='string'||!Array.isArray(axis.values)||axis.values.length<1||axis.values.length>SCENARIO_LIMITS.axisValues||!nodes.some(n=>n.kind==='input'&&n.id===axis.id))fail('SCENARIO_AXIS');
 const values=axis.values.map(exactMagnitude);
 if(new Set(values).size!==values.length)fail('SCENARIO_DUPLICATE');
 return {id:axis.id,values};
}
export function prepareScenarios({nodes=starterGraph(),first,second=null,output}={}){
 const graph=parseGraph(graphText(nodes));
 const a=validateAxis(first,graph.nodes),b=second===null?null:validateAxis(second,graph.nodes);
 if(b?.id===a.id)fail('SCENARIO_SAME_AXIS');
 const target=graph.nodes.find(n=>n.id===output);
 if(!target)fail('SCENARIO_OUTPUT');
 const count=a.values.length*(b?.values.length??1);
 if(count>SCENARIO_LIMITS.cases||count*graph.nodes.length>SCENARIO_LIMITS.nodeCases)fail('SCENARIO_BUDGET');
 const cases=[];
 for(const [row,x] of a.values.entries())for(const [col,y] of (b?.values??[null]).entries()){
  const changes={[a.id]:x,...(b?{[b.id]:y}:{})};
  const draft=graph.nodes.map(n=>n.kind==='input'&&Object.hasOwn(changes,n.id)?{...n,value:changes[n.id]}:n);
  const text=graphText(draft);
  parseGraph(text);
  cases.push({id:'case_'+row+'_'+col,row,col,changes,graphText:text});
 }
 return freeze({schema:'sutra-scenario-plan/v1',first:a,second:b,output:target.id,outputKind:target.kind,nodeCount:graph.nodes.length,caseCount:count,nodeCases:count*graph.nodes.length,baselineGraphText:graphText(graph.nodes),cases});
}
export async function runScenarios(plan,{signal,onProgress=()=>{}}={}){
 // Rebuild from retained declarations rather than accepting caller-supplied
 // executable case definitions or modified result targets.
 const rebuilt=prepareScenarios({
  nodes:parseGraph(plan.baselineGraphText).nodes,
  first:plan.first,second:plan.second,output:plan.output
 });
 if(JSON.stringify(plan)!==JSON.stringify(rebuilt))fail('SCENARIO_PLAN_CHANGED');
 const verifier=createVerifier();
 const outcomes=[];
 let executed=0,reused=0;
 for(const c of rebuilt.cases){
  if(signal?.aborted)break;
  const r=await verifier.evaluate(c.graphText);
  if(signal?.aborted)break;
  if(!await replayReport(c.graphText,r.reportText))fail('SCENARIO_REPLAY');
  if(signal?.aborted)break;
  const receipt=r.report.receipts.find(x=>x.id===rebuilt.output);
  if(!receipt)fail('SCENARIO_RECEIPT');
  executed+=r.stats.executed.length;
  reused+=r.stats.reused.length;
  const item=freeze({
   id:c.id,row:c.row,col:c.col,changes:c.changes,
   graphText:c.graphText,reportText:r.reportText,
   graphDigest:r.report.graphDigest,receipt,stats:r.stats
  });
  outcomes.push(item);
  try{onProgress(freeze({completed:outcomes.length,total:rebuilt.caseCount,latest:item.id,executed,reused}));}
  catch{/* display callbacks cannot alter computation */}
 }
 return freeze({
  schema:'sutra-scenario-results/v1',
  plan:rebuilt,
  status:outcomes.length===rebuilt.caseCount?'completed':'cancelled',
  outcomes,
  stats:{executed,reused,completed:outcomes.length,total:rebuilt.caseCount},
  qualification:'Every retained outcome was recomputed and matched by the same exact kernel. Scenario inputs are declarations; empirical validity, probability and safety are not established.'
 });
}
function fraction(value){
 if(typeof value!=='string'||!/^-?\d+\/\d+$/.test(value))fail('SCENARIO_RATIONAL');
 const [n,d]=value.split('/').map(BigInt);
 if(d<=0n)fail('SCENARIO_RATIONAL');
 return {n,d};
}
function compare(a,b){
 const x=fraction(a),y=fraction(b),d=x.n*y.d-y.n*x.d;
 return d<0n?-1:d>0n?1:0;
}
export function summarizeScenarios(result){
 const statuses={};
 const numeric=[];
 const dimensionKeys=new Set();
 for(const x of result.outcomes){
  const o=x.receipt.outcome;
  statuses[o.status]=(statuses[o.status]??0)+1;
  if(typeof o.value==='string'&&Array.isArray(o.dimension)){
   dimensionKeys.add(JSON.stringify(o.dimension));
   numeric.push({id:x.id,value:o.value,dimension:o.dimension});
  }
 }
 let minimum=null,maximum=null;
 if(dimensionKeys.size===1&&numeric.length){
  minimum=numeric[0];maximum=numeric[0];
  for(const item of numeric){
   if(compare(item.value,minimum.value)<0)minimum=item;
   if(compare(item.value,maximum.value)>0)maximum=item;
  }
 }
 return freeze({statuses,numericCount:numeric.length,comparable:dimensionKeys.size===1,minimum,maximum,completed:result.outcomes.length,total:result.plan.caseCount});
}
export function resultMatrix(result){
 const {plan}=result;
 const lookup=new Map(result.outcomes.map(x=>[x.id,x]));
 return plan.first.values.map((x,row)=>({
  value:x,
  cells:(plan.second?.values??[null]).map((y,col)=>{
   const key='case_'+row+'_'+col;
   return {id:key,value:y,outcome:lookup.get(key)?.receipt.outcome??null,available:lookup.has(key)};
  })
 }));
}
export function exportScenarioCase(result,id){
 const item=result.outcomes.find(x=>x.id===id);
 if(!item)fail('SCENARIO_CASE_MISSING');
 return JSON.stringify({graphText:item.graphText,reportText:item.reportText});
}
export function exportScenarioSummary(result){
 const data={
  schema:'sutra-scenario-summary/v1',
  status:result.status,
  first:result.plan.first,second:result.plan.second,
  output:result.plan.output,
  stats:result.stats,
  outcomes:result.outcomes.map(x=>({id:x.id,changes:x.changes,graphDigest:x.graphDigest,receipt:x.receipt})),
  qualification:result.qualification
 };
 return JSON.stringify(data,null,2);
}
