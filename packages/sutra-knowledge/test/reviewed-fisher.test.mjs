import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {evaluateReviewedFisher,FISHER_DESIGN} from '../reviewed-fisher.js';
import {fisherFixture,fisherBundle,fisherPlan} from '../examples/reviewed-fisher.mjs';
const run=async(v,o)=>(await fisherBundle(v,o)).result;
test('exact two-sided probability ordering, direction, effect and family threshold',async()=>{
 const v=await fisherFixture(),r=await run(v);
 assert.equal(r.exactConditionalTail,'1063/46189');assert.equal(r.observedDifferenceAminusB,'3/5');
 assert.equal(r.mathematicalThreshold,'TAIL_AT_OR_BELOW_DECLARED_THRESHOLD');
 assert.equal((await run(v,{familySize:3})).mathematicalThreshold,'TAIL_ABOVE_DECLARED_THRESHOLD');
 assert.equal((await run(v,{alternative:'greater'})).exactConditionalTail,'1063/92378');
 assert.equal((await run(v,{alternative:'less'})).mathematicalThreshold,'TAIL_ABOVE_DECLARED_THRESHOLD');
 assert.equal(r.unresolvedDesign.length,9);assert.equal(r.decisionAuthority,'NONE');
});
test('independent allocation enumeration across all small tables, all alternatives',async()=>{
 for(let ka=0;ka<=3;ka++)for(let kb=0;kb<=2;kb++){
  const v=await fisherFixture(ka,3,kb,2),weights=[0,0,0,0],totalSuccess=ka+kb;
  for(let mask=0;mask<32;mask++){
   let total=0,a=0;for(let i=0;i<5;i++)if(mask&(1<<i)){total++;if(i<3)a++;}
   if(total===totalSuccess)weights[a]++;
  }
  for(const alternative of ['greater','less','two-sided-probability-order']){
   const count=weights.reduce((n,w,i)=>n+((alternative==='greater'?i>=ka:alternative==='less'?i<=ka:w<=weights[ka])?w:0),0);
   const r=await run(v,{alternative}),[x,y]=r.exactConditionalTail.split('/').map(BigInt);
   assert.equal(x*BigInt(weights.reduce((a,b)=>a+b,0)),y*BigInt(count));
  }
 }
});
test('degenerate margins, asymmetric tails, negative difference',async()=>{
 const zero=await run(await fisherFixture(0,3,0,2));assert.equal(zero.exactConditionalTail,'1/1');assert.equal(zero.feasibleTables,1);
 const r=await run(await fisherFixture(1,5,4,6));assert.equal(r.observedDifferenceAminusB,'-7/15');
 const v=await fisherFixture(0,1,2,3);assert.equal((await run(v)).exactConditionalTail,'1/1');
});
test('refuses bad counts, group scope, overlap, untrusted authority and pins',async()=>{
 for(const v of [await fisherFixture(11,10,2,10),await fisherFixture(0,0,2,10),await fisherFixture(1,150,2,150),await fisherFixture(1,3,1,2,{sameScope:true})])await assert.rejects(run(v),/FISHER_/);
 await assert.rejects(fisherFixture(2,2,1,2,{alias:true}),/COMPILER_DUPLICATE_BINDING_SPAN/);
 const v=await fisherFixture();
 for(const o of [{groupB:{successBinding:'as',trialBinding:'bn'}},{alternative:'twice-smaller'},{familyAlpha:'1/1'},{familySize:0},{design:{...fisherPlan(v).design,distinctGroups:'VERIFIED'}}])await assert.rejects(run(v,o),/FISHER_/);
 const text=JSON.stringify(fisherPlan(v));await assert.rejects(evaluateReviewedFisher(v.versionText,v.digest,text,'sha256:'+'0'.repeat(64)),/FISHER_PIN/);
 assert.equal((await run(v,{design:Object.fromEntries(FISHER_DESIGN.map(k=>[k,'DECLARED_NOT_VERIFIED']))})).interpretation,'DECLARED_MODEL_ONLY_NOT_INDEPENDENTLY_VERIFIED');
});
