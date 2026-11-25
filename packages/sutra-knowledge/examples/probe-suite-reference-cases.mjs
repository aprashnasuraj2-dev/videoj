import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {FACETS} from '../semantic-investigation.js';
import {exportSemanticProbeSuite} from '../semantic-probe-suite.js';
async function fixture(formulas){
 const question='Which declared synthetic score exceeds the threshold?',type={kind:'ratio',unit:'one',scope:'synthetic',dimension:[0,0,0]},bindings=[];let text='';
 for(const [id,value] of Object.entries({x:'2',y:'2',limit:'9',small:'3',z:'1'})){text+=id+': ';const start=text.length;text+=value;bindings.push({id,sourceId:'record',start,end:text.length,type});text+='; ';}
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'record',lineage:'synthetic',text}],bindings}));
 const proposals=[],candidates=[];
 for(const [id,formula] of Object.entries(formulas)){proposals.push({id,proposalText:formula===null?'{}':(await compileReviewedExpression(contractText,pin,formula)).proposalText});candidates.push({id,meaning:'Declared '+id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))});}
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals}),annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 return sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
}
const normal=[{bindingId:'x',values:['2/1','4/1']},{bindingId:'y',values:['2/1','4/1']}];
async function run(v,axes=normal,budget=2,maxAssignments=16){
 const gridPlanText=JSON.stringify({version:1,versionDigest:v.digest,axes,maxAssignments});
 const planText=JSON.stringify({version:1,versionDigest:v.digest,gridPlanText,gridPlanDigest:await casePin(gridPlanText),maxReviewWorlds:budget}),planDigest=await casePin(planText);
 const x=await exportSemanticProbeSuite(v.versionText,v.digest,planText,planDigest);if(!x.portable)throw Error('FIXTURE_LIMIT');
 return {bundleText:x.bundleText,snapshotPin:x.snapshotPin,versionDigest:v.digest,planDigest};
}
const joint=await fixture({product:'[x]*[y]>[limit]',sum:'[x]+[x]>[limit]',copy:'[x]+[x]>[limit]',invalid:null});
const multiple=await fixture({product:'[x]*[y]>[limit]',x_only:'[x]>[small]',y_only:'[y]>[small]'});
const unresolved=await fixture({ratio:'[x]/[z]>[limit]',sum:'[x]+[y]>[limit]'});
console.log(JSON.stringify([await run(joint),await run(joint,normal,2,3),await run(multiple,normal,1),await run(multiple,normal,2),await run(unresolved,[{bindingId:'z',values:['1/1','0/1']}])]));
