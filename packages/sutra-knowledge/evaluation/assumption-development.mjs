// Frozen developer-authored assumption benchmark; no live models or external labels.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {FACETS} from '../semantic-investigation.js';
import {evaluateSemanticWorldGrid} from '../semantic-world-grid.js';
import {evaluateSemanticProbeSuite} from '../semantic-probe-suite.js';
const FROZEN='sha256:7b38b07b1c5b3abf904fa527d34945a5192e7c6dd850b36e5e0daf4335fdfd75';
const decisive=s=>s==='constraint_satisfied'||s==='constraint_refuted';
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const rational=v=>{let [n,d='1']=v.split('/');n=BigInt(n);d=BigInt(d);if(d<0n){n=-n;d=-d}let a=n<0n?-n:n,b=d;while(b){[a,b]=[b,a%b]}return (n/a)+'/'+(d/a)};
function measure(worlds,ids,possible){
 const selected=worlds.filter(w=>ids.includes(w.id)),covered=new Set(selected.flatMap(w=>w.covers));
 return {selectedWorldIds:ids,coveredPairs:covered.size,missedPairs:possible-covered.size,reviewItems:ids.length,changedBindings:selected.reduce((n,w)=>n+w.changes,0)};
}
function greedy(worlds,budget){
 const chosen=[],covered=new Set();
 while(chosen.length<budget){
  const sorted=worlds.filter(w=>!chosen.includes(w.id)).map(w=>({...w,gain:w.covers.filter(x=>!covered.has(x)).length})).sort((a,b)=>b.gain-a.gain||a.changes-b.changes||cmp(a.id,b.id));
  const w=sorted[0];if(!w||!w.gain)break;chosen.push(w.id);w.covers.forEach(x=>covered.add(x));
 }
 return chosen.sort(cmp);
}
async function run(c){
 let text='';const bindings=[],type={kind:'ratio',unit:'one',scope:'synthetic',dimension:[0,0,0]};
 for(const [id,value] of Object.entries(c.inputs)){text+=id+': ';const start=text.length;text+=value;bindings.push({id,sourceId:'record',start,end:text.length,type});text+='; ';}
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question:c.question,sources:[{id:'record',lineage:'synthetic',text}],bindings}));
 const proposals=[],candidates=[];
 for(const p of c.programs){proposals.push({id:p.id,proposalText:p.formula===null?'{}':(await compileReviewedExpression(contractText,pin,p.formula)).proposalText});candidates.push({id:p.id,meaning:'Declared '+p.id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))});}
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals}),annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 const v=await sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
 const gridPlanText=JSON.stringify({version:1,versionDigest:v.digest,axes:c.axes,maxAssignments:c.maxAssignments}),gridPlanDigest=await casePin(gridPlanText);
 const planText=JSON.stringify({version:1,versionDigest:v.digest,gridPlanText,gridPlanDigest,maxReviewWorlds:c.maxReviewWorlds});
 const grid=await evaluateSemanticWorldGrid(v.versionText,v.digest,gridPlanText,gridPlanDigest),suite=await evaluateSemanticProbeSuite(v.versionText,v.digest,planText,await casePin(planText));
 const actual={
  baseline:Object.fromEntries(v.report.investigation.candidates.map(x=>[x.id,x.computation?.status??'REFUSED'])),
  structuralGroups:suite.structuralGroups.map(g=>g.members.map(m=>m.id)),alreadyDivergent:suite.alreadyDivergent,totalAssignments:grid.coverage.totalAssignments,evaluatedAssignments:grid.coverage.evaluatedAssignments,
  worldStates:grid.worlds.map(w=>({id:w.id,states:Object.fromEntries(w.rows.map(r=>[r.id,r.state]))})),
  pairs:suite.pairs.map(({left,right,witnessWorldIds,unresolvedWorldIds})=>({left,right,witnessWorldIds,unresolvedWorldIds})),
  distinguishablePairs:suite.counts.distinguishablePairs,selectedWorldIds:suite.selectedWorlds.map(w=>w.id),coveredPairs:suite.counts.coveredPairs,totalChangedBindings:suite.counts.totalChangedBindings
 };
 const mismatches=[];for(const k of Object.keys(c.expected))try{assert.deepEqual(actual[k],c.expected[k]);}catch{mismatches.push(k);}
 const worlds=grid.worlds.map(w=>({id:w.id,changes:w.assignment.filter(a=>a.value!==rational(c.inputs[a.bindingId])).length,covers:suite.pairs.flatMap((p,i)=>p.witnessWorldIds.includes(w.id)?[i]:[])}));
 const metrics=Object.fromEntries(Object.entries({
  prefix:worlds.slice(0,c.maxReviewWorlds).map(w=>w.id),
  single_coordinate_greedy:greedy(worlds.filter(w=>w.changes<=1),c.maxReviewWorlds),
  greedy_all:greedy(worlds,c.maxReviewWorlds),
  exact:actual.selectedWorldIds
 }).map(([name,ids])=>[name,measure(worlds,ids,actual.distinguishablePairs)]));
 if(metrics.greedy_all.coveredPairs>metrics.exact.coveredPairs||metrics.exact.coveredPairs!==actual.coveredPairs||suite.decisionAuthority!=='NONE')mismatches.push('optimizer_or_authority');
 const minimality=suite.pairs.flatMap(p=>p.witnesses.map(w=>({pair:[p.left,p.right],worldId:w.worldId,status:w.minimality})));
 return {id:c.id,family:c.family,exactMatch:!mismatches.length,mismatches,actual,metrics,minimality,coverage:grid.coverage,unresolvedCells:grid.worlds.flatMap(w=>w.rows).filter(r=>!decisive(r.state)).length,decisionAuthority:suite.decisionAuthority};
}
const raw=await readFile(new URL('./assumption-development-v1.json',import.meta.url),'utf8'),declared=(await readFile(new URL('./assumption-development-v1.sha256',import.meta.url),'utf8')).trim();
const digest='sha256:'+createHash('sha256').update(raw).digest('hex');
assert.equal(digest,FROZEN);assert.equal(declared,FROZEN);
const spec=JSON.parse(raw);assert.equal(spec.schemaVersion,1);assert.equal(spec.split,'development_synthetic');assert.equal(spec.cases.length,40);assert.equal(new Set(spec.cases.map(c=>c.id)).size,40);
const families=Object.fromEntries([...new Set(spec.cases.map(c=>c.family))].map(f=>[f,spec.cases.filter(c=>c.family===f).length]));assert.equal(Object.keys(families).length,10);assert.ok(Object.values(families).every(n=>n===4));
const rows=[];for(const c of spec.cases){try{rows.push(await run(c));}catch(e){rows.push({id:c.id,family:c.family,exactMatch:false,error:String(e?.message??e)});}}
const valid=rows.filter(r=>r.metrics),sum=(rows,fn)=>rows.reduce((n,r)=>n+fn(r),0),possible=sum(valid,r=>r.actual.distinguishablePairs);
const metrics=Object.fromEntries(['prefix','single_coordinate_greedy','greedy_all','exact'].map(name=>[name,{coveredPairs:sum(valid,r=>r.metrics[name].coveredPairs),discoveredPairs:possible,missedPairs:sum(valid,r=>r.metrics[name].missedPairs),reviewItems:sum(valid,r=>r.metrics[name].reviewItems),changedBindings:sum(valid,r=>r.metrics[name].changedBindings)}]));
const report={dataset:spec.dataset,split:spec.split,annotation:spec.annotation,frozenDigest:digest,cases:rows.length,families,exactCasesCorrect:rows.filter(r=>r.exactMatch).length,negativeOrUnobservedCases:valid.filter(r=>r.actual.distinguishablePairs===0).length,evaluatedWorlds:sum(valid,r=>r.coverage.evaluatedAssignments),executedCandidateCells:sum(valid,r=>r.coverage.executedCells),unresolvedCells:sum(valid,r=>r.unresolvedCells),metrics,greedyCounterexamples:valid.filter(r=>r.metrics.greedy_all.coveredPairs!==r.metrics.exact.coveredPairs||r.metrics.greedy_all.reviewItems!==r.metrics.exact.reviewItems||r.metrics.greedy_all.changedBindings!==r.metrics.exact.changedBindings).map(r=>r.id),rows,qualification:'All comparators receive the same evaluated finite grid and review budget. Prefix and single-coordinate are deliberately limited ablations; greedy-all is a stronger matched heuristic. No human-review time, semantic correctness, physical feasibility, independent annotation, or empirical superiority is measured. Grid evaluation work is not reduced.'};
console.log(JSON.stringify(report,null,2));if(report.exactCasesCorrect!==40)process.exitCode=1;
