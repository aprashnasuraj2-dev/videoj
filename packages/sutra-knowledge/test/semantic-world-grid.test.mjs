import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft,selectedSpan} from '../reviewed-draft.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {FACETS} from '../semantic-investigation.js';
import {evaluateSemanticWorldGrid} from '../semantic-world-grid.js';
async function fixture(){
 const question='Does the synthetic score exceed the limit?',source='X: 2; Y: 2; Limit: 9;';
 const type={kind:'ratio',unit:'one',scope:'synthetic_score',dimension:[0,0,0]};
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'source',lineage:'synthetic',text:source}],bindings:[['x',source.indexOf('2')],['y',source.lastIndexOf('2')],['limit',source.indexOf('9')]].map(([id,start])=>({id,sourceId:'source',start,end:start+1,type}))}));
 const input=id=>({id,kind:'input',bindingId:id});
 const make=(op,args)=>({version:1,contractDigest:pin,questionSpan:selectedSpan('question',question,0,question.length),claims:[],nodes:[input('x'),input('y'),input('limit'),{id:'score',kind:'derive',op,args},{id:'target',kind:'constraint',op:'gt',args:['score','limit']}],targetId:'target'});
 const a=make('mul',['x','y']),b=make('add',['x','x']),bad=structuredClone(b);bad.nodes[0].value='999';
 const candidates=[{id:'product',meaning:'product'},{id:'sum',meaning:'sum'},{id:'refused',meaning:'refused'}].map(c=>({...c,facets:Object.fromEntries(FACETS.map(k=>[k,null]))}));
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals:[a,b,bad].map((p,i)=>({id:candidates[i].id,proposalText:JSON.stringify(p)}))});
 const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 return sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
}
const input=(v,maxAssignments=16)=>({version:1,versionDigest:v.digest,axes:[{bindingId:'x',values:['2/1','4/1']},{bindingId:'y',values:['2/1','4/1']}],maxAssignments});
async function run(v,p,pin){const text=JSON.stringify(p);return evaluateSemanticWorldGrid(v.versionText,v.digest,text,pin??await casePin(text));}
test('two-axis interaction missed by both single changes matches brute-force arithmetic',async()=>{
 const v=await fixture(),r=await run(v,input(v));
 assert.deepEqual(r.coverage,{totalAssignments:4,evaluatedAssignments:4,truncated:false,totalCandidateCells:12,evaluatedGridCells:12,executedCells:8});
 for(const w of r.worlds){
  const [x,y]=w.assignment.map(a=>Number(a.value.split('/')[0]));
  assert.equal(w.rows.find(c=>c.id==='product').state,x*y>9?'constraint_satisfied':'constraint_refuted');
  assert.equal(w.rows.find(c=>c.id==='sum').state,x+x>9?'constraint_satisfied':'constraint_refuted');
  assert.equal(w.rows.find(c=>c.id==='refused').execution,'BASELINE_UNRESOLVED_NOT_EVALUATED');
 }
 assert.equal(r.interactionWitnesses.length,1);
 assert.deepEqual(r.interactionWitnesses[0].changedBindings,['x','y']);
 assert.equal(r.candidates.find(c=>c.id==='product').status,'VARIES_IN_EVALUATED_GRID');
 assert.equal(r.candidates.find(c=>c.id==='sum').status,'SAME_IN_DECLARED_GRID_ONLY');
 assert.equal(r.decisionAuthority,'NONE');
});
test('truncated grid cannot establish declared-grid invariance or interaction',async()=>{
 const v=await fixture(),r=await run(v,input(v,3));
 assert.equal(r.coverage.truncated,true);assert.equal(r.coverage.evaluatedAssignments,3);assert.equal(r.interactionWitnesses.length,0);
 assert.equal(r.candidates.find(c=>c.id==='product').status,'SAME_IN_EVALUATED_PREFIX_ONLY');
});
test('stale pins, normalized duplicate values and untrusted axes fail closed',async()=>{
 const v=await fixture(),p=input(v),pin=await casePin(JSON.stringify(p));p.maxAssignments=2;await assert.rejects(run(v,p,pin),/WORLD_GRID_PIN/);
 for(const change of [p=>p.axes[0].values=['2/1','4/2'],p=>p.axes[0].values=['1/0','2/1'],p=>p.axes[0].bindingId='missing',p=>p.axes.push(p.axes[0]),p=>p.maxAssignments=17,p=>p.axes[0].probability=0.5,p=>p.versionDigest='sha256:'+'0'.repeat(64)]){
  const q=input(v);change(q);await assert.rejects(run(v,q),/WORLD_GRID_/);
 }
});
