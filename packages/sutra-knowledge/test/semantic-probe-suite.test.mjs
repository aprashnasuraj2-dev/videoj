import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {FACETS} from '../semantic-investigation.js';
import {evaluateSemanticProbeSuite,exportSemanticProbeSuite} from '../semantic-probe-suite.js';
async function fixture(formulas){
 const question='Does the synthetic score exceed the declared threshold?',type={kind:'ratio',unit:'one',scope:'synthetic',dimension:[0,0,0]};
 const values={x:'2',y:'2',limit:'9',small:'3'},bindings=[];let text='';
 for(const [id,value] of Object.entries(values)){text+=id+': ';const start=text.length;text+=value;bindings.push({id,sourceId:'record',start,end:text.length,type});text+='; ';}
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'record',lineage:'synthetic',text}],bindings}));
 const proposals=[],candidates=[];
 for(const [id,formula] of Object.entries(formulas)){
  proposals.push({id,proposalText:formula===null?'{}':(await compileReviewedExpression(contractText,pin,formula)).proposalText});
  candidates.push({id,meaning:'Declared '+id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))});
 }
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals});
 const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 return sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
}
async function plan(v,budget=2,maxAssignments=16,axes=[{bindingId:'x',values:['2/1','4/1']},{bindingId:'y',values:['2/1','4/1']}]){
 const gridPlanText=JSON.stringify({version:1,versionDigest:v.digest,axes,maxAssignments});
 const planText=JSON.stringify({version:1,versionDigest:v.digest,gridPlanText,gridPlanDigest:await casePin(gridPlanText),maxReviewWorlds:budget});
 return [v.versionText,v.digest,planText,await casePin(planText)];
}
test('joint-only witness requires both input changes and every proper subset has been checked',async()=>{
 const v=await fixture({product:'[x]*[y]>[limit]',sum:'[x]+[x]>[limit]',copy:'[x]+[x]>[limit]',invalid:null});
 const r=await evaluateSemanticProbeSuite(...await plan(v));
 assert.equal(r.counts.candidateCount,4);assert.equal(r.counts.structuralGroups,2);assert.equal(r.counts.eligiblePairs,1);assert.equal(r.counts.distinguishablePairs,1);
 assert.equal(r.counts.selectedWorlds,1);assert.equal(r.counts.coveredPairs,1);
 assert.deepEqual(r.selectedWorlds[0].changedBindings,['x','y']);
 const witness=r.pairs[0].witnesses[0];assert.equal(witness.minimality,'MINIMAL_WITHIN_DECLARED_TESTED_SUBSETS');assert.deepEqual(witness.untestedProperSubsets,[]);
 assert.deepEqual(r.excluded,[{id:'invalid',state:'REFUSED'}]);assert.equal(r.decisionAuthority,'NONE');
 assert.equal((await exportSemanticProbeSuite(...await plan(v))).portable,true);
});
test('exact budget maximizes pair coverage and selects two minimum worlds rather than all four',async()=>{
 const v=await fixture({product:'[x]*[y]>[limit]',x_only:'[x]>[small]',y_only:'[y]>[small]'});
 const one=await evaluateSemanticProbeSuite(...await plan(v,1)),two=await evaluateSemanticProbeSuite(...await plan(v,2));
 assert.equal(one.counts.eligiblePairs,3);assert.equal(one.counts.distinguishablePairs,3);assert.equal(one.counts.coveredPairs,2);assert.equal(one.uncoveredDistinguishablePairs.length,1);
 assert.equal(two.counts.coveredPairs,3);assert.equal(two.counts.selectedWorlds,2);assert.equal(two.counts.totalChangedBindings,2);
 assert.deepEqual(two.selectedWorlds.map(w=>w.id),['world_02','world_03']);
 assert.deepEqual(await evaluateSemanticProbeSuite(...await plan(v,2)),two);
});
test('truncated grid and untested proper subsets remain explicit, never equivalence or minimality claims',async()=>{
 const v=await fixture({product:'[x]*[y]>[limit]',sum:'[x]+[x]>[limit]'});
 const r=await evaluateSemanticProbeSuite(...await plan(v,2,3));
 assert.equal(r.gridCoverage.truncated,true);assert.equal(r.pairs[0].status,'NO_WITNESS_EVALUATED_PREFIX_ONLY');assert.equal(r.counts.selectedWorlds,0);
 const axes=[{bindingId:'x',values:['4/1','6/1']},{bindingId:'y',values:['4/1','6/1']}];
 const partial=await evaluateSemanticProbeSuite(...await plan(v,1,1,axes));
 assert.equal(partial.pairs[0].witnesses[0].minimality,'MINIMALITY_NOT_ESTABLISHED');assert.equal(partial.pairs[0].witnesses[0].untestedProperSubsets.length,2);
});
test('baseline opposite outcomes are not counted as hypothetical discovery; stale or malformed plans refused',async()=>{
 const v=await fixture({greater:'[x]>[limit]',less:'[x]<[limit]'}),args=await plan(v),r=await evaluateSemanticProbeSuite(...args);
 assert.equal(r.alreadyDivergent.length,1);assert.equal(r.pairs.length,0);assert.equal(r.counts.selectedWorlds,0);
 const p=JSON.parse(args[2]);p.maxReviewWorlds=0;const bad=JSON.stringify(p);
 await assert.rejects(evaluateSemanticProbeSuite(args[0],args[1],bad,await casePin(bad)),/PROBE_SUITE_PLAN/);
 await assert.rejects(evaluateSemanticProbeSuite(...args.slice(0,3),'sha256:'+'0'.repeat(64)),/PROBE_SUITE_PIN/);
});

import {auditGridExpansion,auditGridDomainExpansion} from '../grid-expansion-audit.js';
test('larger identical grid budget preserves prefix and discovers a joint-only witness',async()=>{
 const v=await fixture({product:'[x]*[y]>[limit]',sum:'[x]+[x]>[limit]'});
 const make=n=>JSON.stringify({version:1,versionDigest:v.digest,axes:[{bindingId:'x',values:['2/1','4/1']},{bindingId:'y',values:['2/1','4/1']}],maxAssignments:n});
 const before=make(3),after=make(4),r=await auditGridExpansion({versionText:v.versionText,versionPin:v.digest,beforeText:before,beforePin:await casePin(before),afterText:after,afterPin:await casePin(after)});
 assert.equal(r.prefixPreserved,true);assert.equal(r.newWorlds,1);assert.equal(r.newWitnessPairs.length,1);assert.equal(r.truncated,false);assert.equal(r.decisionAuthority,'NONE');
 const reversed=JSON.stringify({...JSON.parse(after),axes:[{bindingId:'x',values:['4/1','2/1']},{bindingId:'y',values:['2/1','4/1']}]});
 await assert.rejects(auditGridExpansion({versionText:v.versionText,versionPin:v.digest,beforeText:before,beforePin:await casePin(before),afterText:reversed,afterPin:await casePin(reversed)}),/GRID_EXPANSION_AXES/);
});

test('expanded domain checks assignment identity and exposes previously evaluated worlds lost by truncation',async()=>{
 const v=await fixture({product:'[x]*[y]>[limit]',sum:'[x]+[x]>[limit]'});
 const make=(values,n)=>JSON.stringify({version:1,versionDigest:v.digest,axes:[{bindingId:'x',values},{bindingId:'y',values:['2/1','4/1']}],maxAssignments:n});
 const before=make(['2/1','4/1'],4),full=make(['6/1','2/1','4/1'],6),partial=make(['6/1','2/1','4/1'],3);
 const run=async after=>auditGridDomainExpansion({versionText:v.versionText,versionPin:v.digest,beforeText:before,beforePin:await casePin(before),afterText:after,afterPin:await casePin(after)});
 const a=await run(full);assert.equal(a.allPreviouslyEvaluatedRetained,true);assert.equal(a.retained.length,4);assert.equal(a.newWorlds,2);assert.notEqual(a.retained[0].before,a.retained[0].after);
 const b=await run(partial);assert.equal(b.allPreviouslyEvaluatedRetained,false);assert.equal(b.missing.length,3);assert.equal(b.truncated,true);
 await assert.rejects(run(make(['2/1','6/1'],4)),/GRID_EXPANSION_DOMAIN_NOT_SUPERSET/);
});
