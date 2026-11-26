// Run frozen declared acquisition cases through actual reviewed compiler, grid and planner.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft,draftComparisonProposal} from '../reviewed-draft.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {FACETS} from '../semantic-investigation.js';
import {planRobustAcquisition} from '../robust-acquisition.js';
const bytes=readFileSync(new URL('./acquisition-development-cases.json',import.meta.url));
const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
assert.equal(blob,'a5bd96c1667c9b980bbdfa34e1fb814baf692be0','Frozen acquisition labels changed');
const data=JSON.parse(bytes),type={kind:'ratio',unit:'one',scope:'synthetic',dimension:[0,0,0]};
const labels={exact:[['low'],['high']],failed:[['low','failed'],['high','failed']],overlap:[['low','mid'],['high','mid']],same:[['common'],['common']]};
const decisions=[{id:'choose_true',loss:{constraint_satisfied:0,constraint_refuted:10}},{id:'choose_false',loss:{constraint_satisfied:10,constraint_refuted:0}},{id:'abstain',loss:{constraint_satisfied:6,constraint_refuted:6}}];
async function run(c){
 const two=c.model==='conjunction',question=two?'Does the synthetic product exceed the limit?':'Does the synthetic quantity exceed the limit?';
 const sources=[{id:'sx',lineage:'synthetic_x',text:'X: 2; Limit: '+(two?'9':'3')+';'+(two&&c.shared?' Y: 2;':'')}];
 if(two&&!c.shared)sources.push({id:'sy',lineage:'synthetic_y',text:'Y: 2;'});
 const bindings=[];
 for(const [id,sourceId,marker] of [['x','sx','X: 2'],['limit','sx','Limit: '+(two?'9':'3')],...(two?[['y',c.shared?'sx':'sy','Y: 2']]:[])]){
  const s=sources.find(x=>x.id===sourceId),at=s.text.indexOf(marker);assert.ok(at>=0);
  const start=at+marker.length-1;bindings.push({id,sourceId,start,end:start+1,type});
 }
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources,bindings}));
 const proposalText=two?JSON.stringify({version:1,contractDigest:pin,questionSpan:{sourceId:'question',start:0,end:question.length,quote:question},claims:[],nodes:[...['x','y','limit'].map(id=>({id,kind:'input',bindingId:id})),{id:'product',kind:'derive',op:'mul',args:['x','y']},{id:'target',kind:'constraint',op:'gt',args:['product','limit']}],targetId:'target'}):await draftComparisonProposal(contractText,pin,'x','limit','gt');
 const candidates=['a','b'].map(id=>({id,meaning:id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))}));
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals:candidates.map(x=>({id:x.id,proposalText}))}),annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 const v=await sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
 const gridText=JSON.stringify({version:1,versionDigest:v.digest,axes:(two?['x','y']:['x']).map(bindingId=>({bindingId,values:['2/1','4/1']})),maxAssignments:16}),gridPin=await casePin(gridText);
 const policyText=JSON.stringify({version:1,versionDigest:v.digest,gridDigest:gridPin,costUnit:'loss_units',exposureUnit:'abstract_units',exposureBudget:c.budget,sourceCosts:sources.map((s,i)=>({id:s.id,costUpper:c.sourceCosts[i]})),initiallyAcquired:c.initiallyAcquired,decisions,actions:c.actions.map(a=>({id:a.id,sourceId:a.axis==='y'&&!c.shared?'sy':'sx',bindingId:a.axis,readCostUpper:a.read,exposure:a.exposure,outcomes:['2/1','4/1'].map((value,i)=>({value,labels:labels[a.labels][i]}))}))});
 const r=await planRobustAcquisition(v.versionText,v.digest,gridText,gridPin,policyText,await casePin(policyText));
 assert.equal(r.status,'FINITE_DECLARED_POLICY',c.id);assert.equal(r.decisionAuthority,'NONE',c.id);
 assert.equal(r.cells.length,two?8:4,c.id);assert.equal(r.noObservation.worstObjective,6,c.id);assert.equal(r.perfectInformationLowerBound,0,c.id);
 const observed={objective:r.plan.worstObjective,root:r.plan.kind==='stop'?'stop':r.plan.actionId};
 assert.deepEqual(observed,c.expected,c.id);assert.ok(r.plan.worstExposure<=c.budget,c.id);
 for(const cell of r.cells){const values=Object.fromEntries(cell.assignment.map(a=>[a.bindingId,Number(a.value.split('/')[0])]));assert.equal(cell.state,(two?values.x*values.y>9:values.x>3)?'constraint_satisfied':'constraint_refuted',c.id);}
 return {id:c.id,observed,report:r};
}
assert.equal(data.cases.length,30);const results=[];
for(const c of data.cases)results.push(await run(c));
console.log(JSON.stringify({profile:'sutra-acquisition-development-results/v1',frozenBlob:blob,caseCount:results.length,results}));
