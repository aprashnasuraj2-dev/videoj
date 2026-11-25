import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {FACETS} from '../semantic-investigation.js';
import {evaluateReviewedFisher,FISHER_DESIGN} from '../reviewed-fisher.js';
export async function fisherFixture(ka=8,na=10,kb=2,nb=10,{sameScope=false,alias=false}={}){
 const question='Do the two synthetic groups have different binary outcome proportions?',source='A success: '+ka+'; A trials: '+na+'; B success: '+kb+'; B trials: '+nb+';';
 const fields=[['as','A success: ',ka,'group_a'],['an','A trials: ',na,'group_a'],['bs','B success: ',kb,sameScope?'group_a':'group_b'],['bn','B trials: ',nb,sameScope?'group_a':'group_b']];
 const bindings=fields.map(([id,label,value,scope])=>{const start=source.indexOf(label)+label.length;return {id,sourceId:'sample',start,end:start+String(value).length,type:{kind:'count',unit:'trials',scope,dimension:[0,0,0]}};});
 if(alias){bindings[1].start=bindings[0].start;bindings[1].end=bindings[0].end;}
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'sample',lineage:'synthetic',text:source}],bindings}));
 const candidates=['a','b'].map(id=>({id,meaning:'Check reviewed group '+id+' count bound',facets:Object.fromEntries(FACETS.map(k=>[k,null]))}));
 const proposals=[];for(const c of candidates)proposals.push({id:c.id,proposalText:(await compileReviewedExpression(contractText,pin,c.id==='a'?'[as]<=[an]':'[bs]<=[bn]')).proposalText});
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals}),annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 return sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
}
export function fisherPlan(v,overrides={}){
 return {version:1,versionDigest:v.digest,groupA:{successBinding:'as',trialBinding:'an'},groupB:{successBinding:'bs',trialBinding:'bn'},alternative:'two-sided-probability-order',familyAlpha:'1/20',familySize:1,design:Object.fromEntries(FISHER_DESIGN.map(k=>[k,'UNRESOLVED'])),...overrides};
}
export async function fisherBundle(v,overrides={}){
 const planText=JSON.stringify(fisherPlan(v,overrides)),planDigest=await casePin(planText),result=await evaluateReviewedFisher(v.versionText,v.digest,planText,planDigest);
 return {versionText:v.versionText,versionDigest:v.digest,planText,planDigest,result};
}
