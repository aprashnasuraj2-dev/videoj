import {livingFixture} from './living-investigation.mjs';
import {casePin} from '../pinned-investigation.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {exportWithdrawalRevision} from '../withdrawal-revision.js';
const original=await livingFixture('finance'),engineering=await livingFixture('engineering');
const raw=JSON.parse(original.versionText),c=JSON.parse(raw.contractText),batch=JSON.parse(raw.batchText),ann=JSON.parse(raw.annotationText);
const source=c.sources.find(s=>s.id==='secondary'),p=JSON.parse(batch.proposals[0].proposalText);
p.nodes.push({id:'unused',kind:'input',bindingId:'second'});
p.claims.push({id:'quote',kind:'quoted_assertion',span:{sourceId:'secondary',start:0,end:source.text.length,quote:source.text}});
batch.proposals[0].proposalText=JSON.stringify(p);
ann.candidates[0].facets.method={statement:'Context statement',references:[{kind:'claim',id:'quote'},{kind:'binding',id:'second'}]};
const normal=await exportWithdrawalRevision(original.versionText,original.digest,'secondary',source.digest);
const future=JSON.parse(JSON.parse(normal.revision.child.versionText).batchText).proposals.find(x=>x.id==='primary_view');
batch.proposals.push({id:'future_valid',proposalText:future.proposalText});
ann.candidates.push({id:'future_valid',meaning:'Not admitted on original parent',facets:Object.fromEntries(Object.keys(ann.candidates[0].facets).map(k=>[k,null]))});
const batchText=JSON.stringify(batch),annotationText=JSON.stringify({...ann,batchDigest:await casePin(batchText)});
const contextual=await sealInvestigationVersion({...raw,batchText,annotationText,annotationPin:await casePin(annotationText)});
const out=[];
for(const v of [original,engineering,contextual]){
 const s=JSON.parse(JSON.parse(v.versionText).contractText).sources.find(x=>x.id==='secondary');
 const e=await exportWithdrawalRevision(v.versionText,v.digest,s.id,s.digest);
 if(!e.portable)throw Error('WITHDRAWAL_FIXTURE_LIMIT');
 out.push({bundleText:e.bundleText,snapshotPin:e.snapshotPin,parentDigest:v.digest,planDigest:e.planDigest});
}
console.log(JSON.stringify(out));
