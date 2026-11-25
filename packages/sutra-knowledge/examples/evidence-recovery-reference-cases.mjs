import {livingFixture} from './living-investigation.mjs';
import {casePin} from '../pinned-investigation.js';
import {selectedSpan} from '../reviewed-draft.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {prepareEvidenceRevision} from '../evidence-revision-transaction.js';
import {exportEvidenceRecovery} from '../evidence-recovery.js';
const contract=v=>JSON.parse(JSON.parse(v.versionText).contractText);
const source=(v,id)=>contract(v).sources.find(s=>s.id===id);
const withdraw=(v,id)=>({kind:'withdraw',sourceId:id,previousDigest:source(v,id).digest});
const selected=(id,text,bindingId,token)=>{const i=text.indexOf(token);return {bindingId,span:selectedSpan(id,text,i,i+token.length)};};
async function restore(id,text,selections){return {kind:'restore_source',sourceId:id,sourceText:text,sourceDigest:await casePin(text),rebindings:selections.map(([b,t])=>selected(id,text,b,t))};}
async function make(a,operations,restorations){
 const rp=JSON.stringify({version:1,parentDigest:a.digest,operations}),rpin=await casePin(rp);
 const prior=await prepareEvidenceRevision(a.versionText,a.digest,rp,rpin);
 const current=prior.child.digest,plan=JSON.stringify({version:1,parentDigest:current,revisionPlanDigest:rpin,restorations}),pin=await casePin(plan);
 const result=await exportEvidenceRecovery(a.versionText,a.digest,rp,rpin,current,plan,pin);
 if(!result.portable)throw Error('FIXTURE_LIMIT');
 return {bundleText:result.bundleText,snapshotPin:result.snapshotPin,ancestorDigest:a.digest,revisionPlanDigest:rpin,parentDigest:current,recoveryPlanDigest:pin};
}
const f=await livingFixture(),e=await livingFixture('engineering');
const complete=await make(f,[withdraw(f,'secondary')],[await restore('secondary','訂正 🧪 Cash before: 30; after: 20',[['second','20'],['other','30']])]);
const text='Capacity 60; demand 80',digest=await casePin(text);
const partial=await make(e,[{kind:'replace',sourceId:'secondary',previousDigest:source(e,'secondary').digest,replacementText:text,replacementDigest:digest,rebindings:[selected('secondary',text,'second','60')]}],[{kind:'reselect_missing',sourceId:'secondary',sourceDigest:digest,rebindings:[selected('secondary',text,'other','80')]}]);
const two=await make(f,[withdraw(f,'primary'),withdraw(f,'secondary')],[await restore('primary','Revenue 120; before 100',[['first','120']]),await restore('secondary','Cash 40; before 30',[['second','40'],['other','30']])]);
// Non-target and originally unknown nodes must not be inferred from reason text.
const raw=JSON.parse(f.versionText),batch=JSON.parse(raw.batchText),ann=JSON.parse(raw.annotationText);
const p=JSON.parse(batch.proposals[0].proposalText),s=source(f,'secondary'),type=contract(f).bindings.find(b=>b.id==='second').type;
p.nodes.push({id:'unused_input',kind:'input',bindingId:'second'},{id:'original_unknown',kind:'unknown',type,reason:'Source secondary revised; reviewed binding second unavailable.'});
p.claims.push({id:'old_quote',kind:'quoted_assertion',span:selectedSpan('secondary',s.text,0,s.text.length)});
batch.proposals[0].proposalText=JSON.stringify(p);ann.candidates[0].facets.method={statement:'Old quote',references:[{kind:'claim',id:'old_quote'}]};
const batchText=JSON.stringify(batch),annotationText=JSON.stringify({...ann,batchDigest:await casePin(batchText)});
const modified=await sealInvestigationVersion({...raw,batchText,annotationText,annotationPin:await casePin(annotationText)});
const context=await make(modified,[withdraw(modified,'secondary')],[await restore('secondary','Cash 40; before 30',[['second','40'],['other','30']])]);
console.log(JSON.stringify([complete,partial,two,context]));
