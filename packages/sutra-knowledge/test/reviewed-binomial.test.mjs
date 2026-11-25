import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {FACETS} from '../semantic-investigation.js';
import {evaluateReviewedBinomial,DESIGN_OBLIGATIONS} from '../reviewed-binomial.js';
async function fixture(k=9,n=10,scope='same_sample',kind='count'){
 const question='Does the synthetic success proportion exceed the null?',source='Successes: '+k+'; Trials: '+n+';',type={kind,unit:'trials',scope:'same_sample',dimension:[0,0,0]};
 const fields=[['success',String(k),source.indexOf(': ')+2,type],['trials',String(n),source.lastIndexOf(': ')+2,{...type,scope}]];
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'sample',lineage:'synthetic',text:source}],bindings:fields.map(([id,value,start,type])=>({id,sourceId:'sample',start,end:start+value.length,type}))}));
 const candidates=['a','b'].map(id=>({id,meaning:'Synthetic count comparison',facets:Object.fromEntries(FACETS.map(k=>[k,null]))}));
 const proposals=[];for(const c of candidates)proposals.push({id:c.id,proposalText:(await compileReviewedExpression(contractText,pin,'[success]<=[trials]')).proposalText});
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals}),annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 return sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
}
function plan(v,overrides={}){return {version:1,versionDigest:v.digest,successBinding:'success',trialBinding:'trials',nullProbability:'1/2',alternative:'greater',familyAlpha:'1/20',familySize:1,design:Object.fromEntries(DESIGN_OBLIGATIONS.map(k=>[k,'UNRESOLVED'])),...overrides};}
async function run(v,overrides={}){const t=JSON.stringify(plan(v,overrides));return evaluateReviewedBinomial(v.versionText,v.digest,t,await casePin(t));}
test('exact inclusive upper/lower tails, declared multiplicity and unresolved design',async()=>{
 const v=await fixture();const r=await run(v);assert.equal(r.exactOneSidedTail,'11/1024');assert.equal(r.observedProportion,'9/10');assert.equal(r.mathematicalThreshold,'TAIL_AT_OR_BELOW_DECLARED_THRESHOLD');assert.equal(r.interpretation,'DESIGN_UNRESOLVED_CONDITIONAL_CALCULATION_ONLY');assert.equal(r.decisionAuthority,'NONE');
 const b=await run(v,{familySize:5});assert.equal(b.perTestAlpha,'1/100');assert.equal(b.mathematicalThreshold,'TAIL_ABOVE_DECLARED_THRESHOLD');
 const c=await run(v,{alternative:'less'});assert.equal(c.exactOneSidedTail,'1023/1024');
 const d=await run(v,{design:Object.fromEntries(DESIGN_OBLIGATIONS.map(k=>[k,'DECLARED_NOT_VERIFIED']))});assert.equal(d.interpretation,'DECLARED_MODEL_ONLY_NOT_INDEPENDENTLY_VERIFIED');
});
test('independent bit-pattern exhaustive tail oracle and equality boundary',async()=>{
 for(let k=0;k<=6;k++){
  const v=await fixture(k,6);
  for(const alternative of ['greater','less']){
   let hits=0;for(let mask=0;mask<64;mask++){const count=mask.toString(2).replaceAll('0','').length;if(alternative==='greater'?count>=k:count<=k)hits++;}
   const r=await run(v,{alternative});const [a,b]=r.exactOneSidedTail.split('/').map(BigInt);assert.equal(a*64n,BigInt(hits)*b);
  }
 }
 const v=await fixture(6,6);assert.equal((await run(v,{familyAlpha:'1/64'})).mathematicalThreshold,'TAIL_AT_OR_BELOW_DECLARED_THRESHOLD');
 assert.equal((await run(v,{nullProbability:'0/1'})).exactOneSidedTail,'0/1');assert.equal((await run(v,{nullProbability:'1/1'})).exactOneSidedTail,'1/1');
});
test('nonbinary rational null, independent weighted enumeration',async()=>{
 const v=await fixture(3,5);let weight=0n;for(let mask=0;mask<32;mask++){const k=mask.toString(2).replaceAll('0','').length;if(k>=3)weight+=2n**BigInt(5-k);}
 const r=await run(v,{nullProbability:'1/3'}),[a,b]=r.exactOneSidedTail.split('/').map(BigInt);assert.equal(a*243n,weight*b);
});
test('refuse invalid sample, scope, unit, pins and forged design assertions',async()=>{
 for(const v of [await fixture(11,10),await fixture(0,0),await fixture(1,257),await fixture(1,2,'other'),await fixture(1,2,'same_sample','capacity')])await assert.rejects(run(v),/BINOMIAL_/);
 const v=await fixture(),t=JSON.stringify(plan(v));await assert.rejects(evaluateReviewedBinomial(v.versionText,v.digest,t,'sha256:'+'0'.repeat(64)),/BINOMIAL_PIN/);
 for(const p of [{successBinding:'trials'},{nullProbability:'2/1'},{familyAlpha:'0/1'},{familySize:0},{alternative:'two-sided'},{design:{...plan(v).design,independentTrials:'VERIFIED'}}])await assert.rejects(run(v,p),/BINOMIAL_/);
});
