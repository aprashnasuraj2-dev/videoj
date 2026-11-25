// Counterfactual target thresholds for the anchored synthetic binary fixture.
// The original evidence, world set, proof capsule, and control rule are unchanged.
import {debuggerFixture,evaluateConclusionDebugger} from './conclusion-debugger.js';
import {createVerifier} from './index.js';
import {sourceDigest} from './evidence-session.js';
export const ASSUMPTION_VERSION='sutra-debugger-assumptions/v1';
export const LIMITS=Object.freeze(['0/1','1/2','1/1','3/2','2/1']);
const qualification='Conditional target-limit alternatives in the fixed synthetic model. Original evidence and surviving worlds are unchanged. Sampled minimum change is only over the five declared limits, not a global optimization. No alternative is adopted automatically.';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const require=ok=>{if(!ok)throw Error('ASSUMPTION_VARIANT_DISAGREEMENT');};
const halfUnits=x=>LIMITS.indexOf(x);
const decisive=x=>x==='constraint_satisfied'||x==='constraint_refuted';
let variantsPromise;
// Construct only known anchored variants. No caller-supplied graph or executable.
export function assumptionVariants(){
 if(!variantsPromise)variantsPromise=(async()=>{
  const f=await debuggerFixture(),variants=[];
  for(const limit of LIMITS){
   const worlds=f.model.worlds.map(w=>{
    if(limit==='1/1')return w;
    const graph=JSON.parse(w.graphText);
    // 'one' is also used by the control claim. A separate threshold input is
    // essential: editing the shared node would change both assumptions.
    graph.nodes.push({id:'target_limit',kind:'input',value:limit,dimension:[0,0,0],basis:'Counterfactual target threshold'});
    const target=graph.nodes.find(n=>n.id==='target');require(target.op==='le'&&equal(target.args,['sum','one']));
    target.args=['sum','target_limit'];return {...w,graphText:JSON.stringify(graph)};
   });
   const caseText=JSON.stringify({...f.model,worlds}),caseDigest=await sourceDigest(caseText),reports=[];
   for(const w of worlds){
    const {report}=await createVerifier().evaluate(w.graphText),receipts=new Map(report.receipts.map(r=>[r.id,r]));
    const target=receipts.get('target'),control=receipts.get('control_ok'),sum=receipts.get('sum').outcome.value;
    require(decisive(target.outcome.status)&&decisive(control.outcome.status)&&['0/1','1/1','2/1'].includes(sum));
    reports.push({id:w.id,sum,target:target.outcome.status,control:control.outcome.status,graphDigest:report.graphDigest,targetReceiptDigest:target.receiptDigest,controlReceiptDigest:control.receiptDigest,
     observed: ['a','b','c'].map(id=>({id,value:receipts.get(id).outcome.value,receiptDigest:receipts.get(id).receiptDigest}))});
   }
   variants.push({limit,caseDigest,worlds:reports});
  }
  const base=variants[2];require(base.caseDigest===f.caseDigest);
  for(const v of variants)for(const [i,w] of v.worlds.entries()){
   const b=base.worlds[i];require(w.id===b.id&&w.sum===b.sum&&w.control===b.control&&w.controlReceiptDigest===b.controlReceiptDigest&&equal(w.observed,b.observed));
  }
  require(new Set(variants.map(v=>v.caseDigest)).size===LIMITS.length);
  return freeze(variants);
 })().catch(e=>{variantsPromise=undefined;throw e;});
 return variantsPromise;
}
const state=(worlds,claim)=>!worlds.length?'CONFLICTED':worlds.every(w=>w[claim]==='constraint_satisfied')?'SUPPORTED':worlds.every(w=>w[claim]==='constraint_refuted')?'REFUTED':'UNDERDETERMINED';
// Call only with a result from evaluateConclusionDebugger; external events are replayed below.
export async function sensitivityVerifiedDebuggerState(result){
 const variants=await assumptionVariants(),base=variants[2],ids=result.claims.target.survivingWorlds,alive=new Set(ids);
 require(result.caseDigest===base.caseDigest&&equal(ids,result.claims.control_ok.survivingWorlds));
 require(equal(base.worlds.map(w=>({id:w.id,decision:w.target})),result.projection.worlds));
 require(equal(base.worlds.map(w=>({id:w.id,decision:w.control,graphDigest:w.graphDigest,receiptDigest:w.controlReceiptDigest})),result.controlReport.worlds));
 require(equal(base.worlds.map(w=>({id:w.id,decision:w.target,graphDigest:w.graphDigest,receiptDigest:w.targetReceiptDigest})),result.report.worlds));
 const baseline=base.worlds.filter(w=>alive.has(w.id));require(equal(baseline.map(w=>w.id),ids)&&state(baseline,'target')===result.claims.target.state&&state(baseline,'control')===result.claims.control_ok.state);
 const sums=baseline.map(w=>Number(w.sum[0]));
 const boundaries=sums.length?{minSum:Math.min(...sums)+'/1',maxSum:Math.max(...sums)+'/1'}:null;
 const reports=variants.map(v=>{
  const current=v.worlds.filter(w=>alive.has(w.id)),targetState=state(current,'target'),controlState=state(current,'control');
  require(controlState===result.claims.control_ok.state);
  return {limit:v.limit,caseDigest:v.caseDigest,targetState,controlState,survivingWorlds:ids.slice(),changedSurvivingWorlds:current.filter((w,i)=>w.target!==baseline[i].target).map(w=>w.id),worlds:v.worlds.map(({observed,...w})=>w)};
 });
 const changes=reports.filter(v=>v.targetState!==result.claims.target.state);
 const distance=changes.length?Math.min(...changes.map(v=>Math.abs(halfUnits(v.limit)-2))):null;
 const minimumSampledChange=distance===null?null:{halfUnits:distance,limits:changes.filter(v=>Math.abs(halfUnits(v.limit)-2)===distance).map(v=>v.limit)};
 return freeze({version:ASSUMPTION_VERSION,caseDigest:result.caseDigest,historyDigest:result.historyDigest,baselineLimit:'1/1',boundaries,variants:reports,minimumSampledChange,qualification});
}
export async function evaluateAssumptionSensitivity(eventText){
 const result=await evaluateConclusionDebugger(eventText);
 return {result,sensitivity:await sensitivityVerifiedDebuggerState(result)};
}
