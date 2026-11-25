import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityExample,casePin} from '../pinned-investigation.js';
import {createAlignedCapsule} from '../aligned-capsule.js';
import {auditAssumptionContrast} from '../assumption-contrast.js';
const wire=JSON.stringify;
async function interactionFixture({omit=false,extra=false}={}){
 const f=await capacityExample(),c=JSON.parse(f.caseText);
 if(omit)c.worlds=c.worlds.filter(w=>w.id!=='load_30_cap_40');
 for(const [i,w] of c.worlds.entries()){
  const g=JSON.parse(w.graphText),target=g.nodes.pop();
  g.nodes.push({id:'limit',kind:'input',value:'900',dimension:[0,0,0],basis:'Synthetic product limit'},{id:'product',kind:'derive',op:'mul',args:['load','capacity']});
  if(extra)g.nodes.push({id:'factor',kind:'input',value:String(i+1),dimension:[0,0,0],basis:'Synthetic unused factor'});
  target.args=['product','limit'];g.nodes.push(target);w.graphText=wire(g);
 }
 const caseText=wire(c);return {...f,caseText,pin:await casePin(caseText)};
}
const anchor=(r,id)=>r.anchors.find(x=>x.anchor.worldIds.includes(id));
test('one-factor checks can miss an exact joint reversal; omitted combo is not adopted',async()=>{
 const f=await interactionFixture({omit:true}),before=await createAlignedCapsule(f.caseText,f.pin,'[]'),r=await auditAssumptionContrast(f.caseText,f.pin);
 const a=anchor(r,'load_10_cap_20');
 assert.equal(r.baselineState,'SUPPORTED');assert.equal(r.gridSize,'6');assert.equal(r.assignmentsEvaluated,6);
 assert.equal(a.oneFactor.assessment,'INTERACTION_ONLY_WITHIN_OBSERVED_DOMAINS');
 assert.equal(a.modelContrast.minimumChangedInputs,2);
 assert.equal(a.evidenceCompatibleContrast.count,1);
 assert.deepEqual(a.modelContrast.minimalInterventions[0].changes,[{id:'capacity',from:'20/1',to:'40/1'},{id:'load',from:'10/1',to:'30/1'}]);
 assert.equal(a.modelContrast.minimalInterventions[0].origin,'hypothetical');
 assert.equal((await createAlignedCapsule(f.caseText,f.pin,'[]')).expectedDigest,before.expectedDigest);
});
test('model-only reversal that contradicts admitted measurement stays excluded',async()=>{
 const f=await interactionFixture(),events=wire([f.reads.read_alternate]),r=await auditAssumptionContrast(f.caseText,f.pin,events),a=anchor(r,'load_10_cap_20');
 assert.equal(r.baselineState,'SUPPORTED');assert.equal(a.modelContrast.count,1);assert.equal(a.evidenceCompatibleContrast.count,0);
 assert.equal(a.evidenceExcludedContrast.count,1);assert.deepEqual(a.evidenceExcludedContrast.minimalInterventions[0].blockers.map(b=>b.observationId),['read_alternate']);
 assert.equal(a.oneFactor.assessment,'INTERACTION_ONLY_WITHIN_OBSERVED_DOMAINS');
});
test('a larger Cartesian grid does not imply no one-factor or joint reversals',async()=>{
 const f=await interactionFixture({omit:true,extra:true}),r=await auditAssumptionContrast(f.caseText,f.pin),a=anchor(r,'load_10_cap_20');
 assert.equal(r.completeOverObservedValues,false);assert.equal(r.gridStatus,'GRID_LIMIT_EXCEEDED');assert.equal(a.oneFactor.assessment,'INCONCLUSIVE');assert.equal(a.modelContrast.minimumChangedInputs,null);
});
test('an opposite declared world can be a one-factor reversal; pin mismatch is refused',async()=>{
 const f=await capacityExample(),r=await auditAssumptionContrast(f.caseText,f.pin,wire([f.reads.read_meter])),a=anchor(r,'load_30_cap_40');
 assert.equal(a.oneFactor.assessment,'SINGLE_FACTOR_FLIP_EXISTS');assert.equal(a.evidenceCompatibleContrast.minimumChangedInputs,1);
 await assert.rejects(auditAssumptionContrast(f.caseText,'sha256:'+'0'.repeat(64)),/CASE_PIN_MISMATCH/);
});
test('exhaustive small binary product fixture contrasts against direct arithmetic',async()=>{
 const f=await interactionFixture(),r=await auditAssumptionContrast(f.caseText,f.pin);
 for(const a of r.anchors){
  const [cap,,load]=a.anchor.assignment.map(v=>Number(v.split('/')[0]));
  const expected=[];
  for(const x of [10,20,30])for(const y of [20,40])if((x*y<=900)!==(load*cap<=900))expected.push({x,y,n:Number(x!==load)+Number(y!==cap)});
  assert.equal(a.modelContrast.count,expected.length);
  assert.equal(a.modelContrast.minimumChangedInputs,expected.length?Math.min(...expected.map(x=>x.n)):null);
 }
});
