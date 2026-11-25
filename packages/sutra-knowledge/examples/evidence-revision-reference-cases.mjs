import {livingFixture} from './living-investigation.mjs';
import {casePin} from '../pinned-investigation.js';
import {selectedSpan} from '../reviewed-draft.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {exportEvidenceRevision} from '../evidence-revision-transaction.js';
const get=v=>JSON.parse(JSON.parse(v.versionText).contractText);
const source=(v,id)=>get(v).sources.find(s=>s.id===id);
const withdraw=(v,id)=>({kind:'withdraw',sourceId:id,previousDigest:source(v,id).digest});
async function replace(v,id,text,selections=[]){
 return {kind:'replace',sourceId:id,previousDigest:source(v,id).digest,replacementText:text,replacementDigest:await casePin(text),rebindings:selections.map(([bindingId,token])=>{const start=text.indexOf(token);return {bindingId,span:selectedSpan(id,text,start,start+token.length)};})};
}
async function report(v,operations){
 const planText=JSON.stringify({version:1,parentDigest:v.digest,operations}),planPin=await casePin(planText);
 const r=await exportEvidenceRevision(v.versionText,v.digest,planText,planPin);
 if(!r.portable)throw Error('FIXTURE_LIMIT');
 return {bundleText:r.bundleText,snapshotPin:r.snapshotPin,parentDigest:v.digest,planDigest:planPin};
}
const f=await livingFixture(),e=await livingFixture('engineering');
const op=await replace(f,'primary','訂正 🧪 Revenue before: 100; revenue after: 90',[['first','90'],['baseline','100']]);
const mixed=await report(f,[op,withdraw(f,'secondary')]);
const partial=await report(e,[await replace(e,'secondary','Surviving capacity: 60; demand: 80',[['second','60']])]);
const raw=JSON.parse(f.versionText),batch=JSON.parse(raw.batchText),ann=JSON.parse(raw.annotationText);
const q=JSON.parse(batch.proposals[1].proposalText),s=source(f,'primary');
q.claims.push({id:'old_quote',kind:'quoted_assertion',span:selectedSpan(s.id,s.text,0,s.text.length)});
batch.proposals[1].proposalText=JSON.stringify(q);ann.candidates[1].facets.method={statement:'Old source link',references:[{kind:'claim',id:'old_quote'}]};
batch.proposals[0].proposalText='{}';
const batchText=JSON.stringify(batch),annotationText=JSON.stringify({...ann,batchDigest:await casePin(batchText)});
const contextual=await sealInvestigationVersion({...raw,batchText,annotationText,annotationPin:await casePin(annotationText)});
const context=await report(contextual,[op]);
const unrelated=await report(f,[await replace(f,'context','Independent contextual note.')]);
console.log(JSON.stringify([mixed,partial,context,unrelated]));
