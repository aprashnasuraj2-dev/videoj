// Product adapter over the existing exact graph, evidence-session and frontier engines.
// Deliberately fixed, host-selected fixture; no arbitrary external evidence admission.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {evaluateEvidenceSessionWithProjection,sourceDigest} from './evidence-session.js';
export const DEBUGGER_VERSION='sutra-debugger-state/v1';
export const CLAIMS=Object.freeze(['target','control_ok']);
export const QUALIFICATION="Synthetic finite-model replay. Lineage is declared; unknown copying and shared measurement errors are not detected. Neither source truth nor independence is certified.";
const scope='debugger_binary_models';
const records=[['lab_a','a','0/1','sample_one','read_a',1],['lab_b','a','1/1','sample_two','read_b',1],['lab_c','b','1/1','sample_three','read_c',3],['lab_control','c','1/1','sample_control','read_control',2]];
const input=(id,value)=>({id,kind:'input',value:String(value),dimension:[0,0,0],basis:'Synthetic binary assumption'});
const keys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
const refuse=()=>{throw TypeError('DEBUGGER_EVENT_REFUSED');};
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
let fixturePromise;
export function debuggerFixture(){
 if(!fixturePromise)fixturePromise=(async()=>{
  const sources=[],offers=[],texts={},worlds=[];
  for(const [id,node,value,lineage,observationId,cost] of records){
   const text=JSON.stringify({version:1,sourceId:id,sourceVersion:'v1',scope,values:{[node]:{value,dimension:[0,0,0]}}});
   texts[observationId]=text;
   sources.push({id,version:'v1',digest:await sourceDigest(text),lineage});
   offers.push({id:observationId,nodeId:node,sourceId:id,cost,dimension:[0,0,0]});
  }
  for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++){
   const nodes=[input('a',a),input('b',b),input('c',c),input('one',1),
    {id:'sum',kind:'derive',op:'add',args:['a','b']},
    {id:'target',kind:'constraint',op:'le',args:['sum','one']},
    {id:'control_ok',kind:'constraint',op:'eq',args:['c','one']}];
   worlds.push({id:'w'+a+b+c,graphText:JSON.stringify({schemaVersion:1,nodes}),constraintId:'target'});
  }
  const model={version:1,decisionId:'sum_at_most_one',scope,costUnit:'synthetic_effort',worlds,sources,offers};
  const caseText=JSON.stringify(model),copies=[];
  for(let i=1;i<=9;i++){
   const id='copy_'+String(i).padStart(2,'0');
   const text=JSON.stringify({version:1,artifactId:id,derivedFrom:'lab_a',sourceText:texts.read_a});
   copies.push({id,text,digest:await sourceDigest(text)});
  }
  return freeze({model,caseText,texts,copies,caseDigest:await sourceDigest(caseText)});
 })().catch(e=>{fixturePromise=undefined;throw e;});
 return fixturePromise;
}
export async function debuggerRead(id){
 const f=await debuggerFixture();if(!Object.hasOwn(f.texts,id))refuse();
 return {type:'read',observationId:id,sourceText:f.texts[id]};
}
export async function debuggerCopies(){
 const f=await debuggerFixture();return {type:'add_copies',artifacts:f.copies.map(({id,text})=>({id,text}))};
}
export async function debuggerBaseline(){return [await debuggerRead('read_a'),await debuggerRead('read_control')];}
function stateOf(worlds){
 if(!worlds.length)return 'CONFLICTED';
 const decisions=new Set(worlds.map(w=>w.decision));
 if(decisions.size===1&&decisions.has('constraint_satisfied'))return 'SUPPORTED';
 if(decisions.size===1&&decisions.has('constraint_refuted'))return 'REFUTED';
 if(worlds.some(w=>!['constraint_satisfied','constraint_refuted'].includes(w.decision)))return 'UNVERIFIED';
 return 'UNDERDETERMINED';
}
function subsets(items,size,start=0,prefix=[]){
 if(size===0)return [prefix];
 const out=[];for(let i=start;i<=items.length-size;i++)out.push(...subsets(items,size-1,i+1,[...prefix,items[i]]));return out;
}
function diagnostics(projections,active){
 const roots=[...new Set(active.map(r=>r.lineage))].sort(),byId=new Map(active.map(r=>[r.observationId,r.lineage]));
 function outcome(excluded){
  const blocked=new Set(excluded);
  return Object.fromEntries(CLAIMS.map(id=>{
   const p=projections[id];let mask=(1<<p.worlds.length)-1;
   for(const o of p.observations)if(!blocked.has(byId.get(o.id)))mask&=o.mask;
   const alive=p.worlds.filter((_,i)=>mask&(1<<i));
   return [id,{state:stateOf(alive),survivingWorlds:alive.map(w=>w.id)}];
  }));
 }
 const current=outcome([]),target=current.target.state;
 const minimumCuts=[];
 if(['SUPPORTED','REFUTED','CONFLICTED'].includes(target)){
  for(let size=1;size<=roots.length&&!minimumCuts.length;size++){
   for(const removed of subsets(roots,size)){
    const result=outcome(removed);
    if(result.target.state!==target)minimumCuts.push({removed,claims:result});
   }
  }
 }
 return {current,minimumCuts,kind:target==='CONFLICTED'?'minimum_consistency_repairs':['SUPPORTED','REFUTED'].includes(target)?'minimum_decision_changes':'not_applicable'};
}
export async function evaluateConclusionDebugger(eventText='[]'){
 const f=await debuggerFixture(),events=parseUniqueJson(eventText,{maxChars:65536,maxDepth:8});
 if(!Array.isArray(events)||events.length>24)refuse();
 const admitted=[];let rootActive=false,copiesActive=false;
 for(const e of events){
  if(e?.type==='add_copies'){
   if(!keys(e,['type','artifacts'])||!rootActive||copiesActive||!Array.isArray(e.artifacts)||e.artifacts.length!==f.copies.length)refuse();
   const seen=new Set();
   for(const a of e.artifacts){
    if(!keys(a,['id','text'])||seen.has(a.id))refuse();seen.add(a.id);
    const expected=f.copies.find(c=>c.id===a.id);
    // A copy is a separate artifact, not an independent observation. A changed
    // claim or an invented ancestor is refused, never silently deduplicated.
    if(!expected||a.text!==expected.text||await sourceDigest(a.text)!==expected.digest)refuse();
   }
   copiesActive=true;continue;
  }
  if(e?.type==='read'){
   if(e.observationId==='read_a')rootActive=true;
  }else if(e?.type==='withdraw_lineage'){
   if(e.lineage==='sample_one'){rootActive=false;copiesActive=false;}
  }else if(e?.type!=='restore_lineage')refuse();
  admitted.push(e);
 }
 const reports={},projections={};
 for(const id of CLAIMS){
  const caseText=id==='target'?f.caseText:JSON.stringify({...f.model,decisionId:id,worlds:f.model.worlds.map(w=>({...w,constraintId:id}))});
  const {report,projection}=await evaluateEvidenceSessionWithProjection(caseText,JSON.stringify(admitted));
  reports[id]=report;projections[id]=projection;
 }
 const r=reports.target,active=r.activeEvidence;
 if(rootActive!==active.some(a=>a.observationId==='read_a'))refuse();
 const artifacts=active.map(a=>({id:a.sourceId,parent:null,lineage:a.lineage,digest:a.sourceDigest,observationId:a.observationId}));
 if(copiesActive)for(const c of f.copies)artifacts.push({id:c.id,parent:'lab_a',lineage:'sample_one',digest:c.digest,observationId:'read_a'});
 artifacts.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 const groups=Object.fromEntries(Object.keys(r.lineageGroups).sort().map(lineage=>[lineage,artifacts.filter(a=>a.lineage===lineage).map(a=>a.id)]));
 const diagnostic=diagnostics(projections,active);
 for(const id of CLAIMS){
  const expected=diagnostic.current[id],report=reports[id];
  const actual=stateOf(report.worlds.filter(w=>report.survivingWorlds.includes(w.id)));
  if(actual!==expected.state||JSON.stringify(expected.survivingWorlds)!==JSON.stringify(report.survivingWorlds))throw Error('DEBUGGER_PROJECTION_DISAGREEMENT');
 }
 const plan=r.frontier?.plan;
 const nextObservation=plan?.kind==='observe'?{id:plan.observationId,cost:plan.cost,worstCost:plan.worstCost,bestCost:plan.bestCost}:null;
 return freeze({version:DEBUGGER_VERSION,caseDigest:f.caseDigest,historyDigest:await sourceDigest(JSON.stringify(events)),
  claims:diagnostic.current,diagnostics:{kind:diagnostic.kind,minimumCuts:diagnostic.minimumCuts},
  activeArtifacts:artifacts,declaredRoots:Object.keys(groups).length,groups,conflict:r.conflict??null,nextObservation,
  unavailableSources:r.unavailableSources,report:r,controlReport:reports.control_ok,projection:projections.target,qualification:QUALIFICATION});
}
export async function exportDebuggerState(events){
 return {version:DEBUGGER_VERSION,events,result:await evaluateConclusionDebugger(JSON.stringify(events))};
}
