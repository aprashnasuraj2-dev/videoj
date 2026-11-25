// Frozen developer-authored revision benchmark. No external calls, human-time or independent labels.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {casePin} from '../pinned-investigation.js';
import {selectedSpan} from '../reviewed-draft.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {prepareEvidenceRevision} from '../evidence-revision-transaction.js';
import {createInvestigationReplaySession,createFreshInvestigationReplaySession,replayInvestigationVersion} from '../investigation-revision.js';
const expectedBlob='d199bddb0bcc9023eb0c3cf77697e3cd3c278786';
const dataBytes=await readFile(new URL('./revision-development-v1.json',import.meta.url));
const blob=createHash('sha1').update('blob '+dataBytes.length+'\0').update(dataBytes).digest('hex');
assert.equal(blob,expectedBlob,'frozen Git blob changed');
const spec=JSON.parse(dataBytes);
assert.equal(spec.cases.length,40);assert.equal(new Set(spec.cases.map(c=>c.id)).size,40);
const ids={primary:['first','baseline'],secondary:['second','other'],context:[]};
const candidateIds=['primary_view','secondary_view'];
const contract=v=>JSON.parse(JSON.parse(v.versionText).contractText);
const sorted=xs=>[...new Set(xs)].sort();
const states=v=>candidateIds.map(id=>v.report.investigation.candidates.find(c=>c.id===id).computation?.status??'REFUSED');
const comparable=x=>{const {recomputation,qualification,...rest}=x;return rest;};
const decisive=s=>s==='CONDITIONALLY_SATISFIED'||s==='CONDITIONALLY_REFUTED';
async function operation(parent,o){
 const old=contract(parent).sources.find(s=>s.id===o.source),previousDigest=o.fault==='stale-pin'?'sha256:'+'0'.repeat(64):old.digest;
 if(o.kind==='withdraw')return {kind:'withdraw',sourceId:o.source,previousDigest};
 const replacementText=o.kind==='context'?'Corrected context, no numeric binding.':'訂正 🧪 left: '+o.values[0]+'; right: '+o.values[1];
 const rebindings=(o.select??[]).map(side=>{
  const index=side==='left'?0:1,marker=side+': ',start=replacementText.indexOf(marker)+marker.length,end=start+String(o.values[index]).length;
  const span=selectedSpan(o.source,replacementText,start,end);
  return {bindingId:o.fault==='cross-source'?(o.source==='primary'?'second':'first'):ids[o.source][index],span:o.fault==='forged-span'?{...span,quote:'999'}:span};
 });
 return {kind:'replace',sourceId:o.source,previousDigest,replacementText,replacementDigest:await casePin(replacementText),rebindings};
}
async function prepare(parent,operations){
 const planText=JSON.stringify({version:1,parentDigest:parent.digest,operations});
 return prepareEvidenceRevision(parent.versionText,parent.digest,planText,await casePin(planText));
}
async function run(c){
 const parent=await livingFixture(c.domain),before=states(parent);
 assert.deepEqual(before,['CONDITIONALLY_SATISFIED','CONDITIONALLY_SATISFIED']);
 const operations=await Promise.all(c.operations.map(o=>operation(parent,o)));
 const session=createInvestigationReplaySession(),fresh=createFreshInvestigationReplaySession();
 await session.replay(parent.versionText,parent.digest);await fresh.replay(parent.versionText,parent.digest);
 if(c.expected.refusal){
  await assert.rejects(prepare(parent,operations),new RegExp(c.expected.refusal));
  assert.equal(session.head(),parent.digest);assert.equal(fresh.head(),parent.digest);
  assert.deepEqual(await replayInvestigationVersion(parent.versionText,parent.digest),parent.report);
  return {id:c.id,expected:c.expected,kind:'refusal',exactMatch:true};
 }
 const x=await prepare(parent,operations),actual=states(x.child),changed=new Set(c.operations.map(o=>o.source));
 const invalidated=sorted(c.operations.flatMap(o=>ids[o.source]));
 const reselected=sorted(c.operations.flatMap(o=>(o.select??[]).map(s=>ids[o.source][s==='left'?0:1])));
 const missing=invalidated.filter(id=>!reselected.includes(id));
 assert.deepEqual(actual,c.expected.states);assert.deepEqual(x.invalidatedBindingIds,invalidated);assert.deepEqual(x.reselectedBindingIds,reselected);assert.deepEqual(x.missingBindingIds,missing);
 const old=contract(parent),next=contract(x.child);
 for(const s of old.sources.filter(s=>!changed.has(s.id)))assert.deepEqual(next.sources.find(t=>t.id===s.id),s);
 for(const b of old.bindings.filter(b=>!changed.has(b.span.sourceId)))assert.deepEqual(next.bindings.find(t=>t.id===b.id),b);
 assert.deepEqual(sorted(next.bindings.map(b=>b.id)),sorted(old.bindings.map(b=>b.id).filter(id=>!missing.includes(id))));
 assert.deepEqual(x.changes.map(row=>row.classification),['primary','secondary'].map(s=>!changed.has(s)?'NO_SCOPED_SOURCE_DEPENDENCY':ids[s].some(id=>missing.includes(id))?'TARGET_INPUT_MISSING':'TARGET_INPUT_RESELECTED'));
 // A semantic facet must lose every changed source reference, even when
 // replacement values happen to preserve the original conditional outcome.
 const ann=JSON.parse(JSON.parse(x.child.versionText).annotationText);
 for(const a of ann.candidates)assert.equal(a.facets.definition.references.some(r=>invalidated.includes(r.id)),false);
 const r=await session.replay(x.child.versionText,x.child.digest),f=await fresh.replay(x.child.versionText,x.child.digest);
 assert.deepEqual(r.report,f.report);assert.deepEqual(r.report,x.child.report);
 assert.deepEqual(comparable(r.impact),comparable(f.impact));assert.deepEqual(comparable(r.impact),comparable(x.impact));
 assert.deepEqual(await replayInvestigationVersion(parent.versionText,parent.digest),parent.report);
 // Independent source operations commute for exact child bytes, not for the
 // plan digest or ordering of the sourceChanges audit log.
 if(operations.length>1){
  const reverse=await prepare(parent,[...operations].reverse());
  assert.equal(reverse.child.versionText,x.child.versionText);assert.deepEqual(reverse.impact,x.impact);
 }
 const total=next.bindings.length;
 const counts=r.stats.totals;
 return {id:c.id,kind:'accepted',exactMatch:true,expected:c.expected,actual,staleCarryForwardWrong:actual.filter((s,i)=>s!==before[i]).length,staleUnsupportedDecisive:actual.filter((s,i)=>!decisive(s)&&decisive(before[i])).length,
  fullReselection:total,sourceLocalReselection:reselected.length,sutraReselection:reselected.length,arithmeticExecuted:counts.executed,arithmeticReused:counts.reusedOutcomes,arithmeticRemoved:counts.removed,commutationChecked:operations.length>1};
}
const rows=[];
for(const c of spec.cases){try{rows.push(await run(c));}catch(e){rows.push({id:c.id,exactMatch:false,error:String(e),stack:e.stack});}}
const valid=rows.filter(r=>r.kind==='accepted'),sum=k=>valid.reduce((a,r)=>a+r[k],0);
const report={dataset:spec.dataset,split:spec.split,frozenGitBlob:blob,frozenSha256:createHash('sha256').update(dataBytes).digest('hex'),cases:rows.length,exactCasesCorrect:rows.filter(r=>r.exactMatch).length,accepted:valid.length,refused:rows.filter(r=>r.kind==='refusal').length,
 staleCarryForwardWrong:sum('staleCarryForwardWrong'),staleUnsupportedDecisive:sum('staleUnsupportedDecisive'),fullReselection:sum('fullReselection'),sourceLocalReselection:sum('sourceLocalReselection'),sutraReselection:sum('sutraReselection'),arithmeticExecuted:sum('arithmeticExecuted'),arithmeticReused:sum('arithmeticReused'),arithmeticRemoved:sum('arithmeticRemoved'),commutationCases:valid.filter(r=>r.commutationChecked).length,rows,
 qualification:'Two synthetic domain wrappers over the same 20 transaction patterns, not 40 independently diverse scenarios. Full reselection is a deliberately weak baseline. Conventional source-local editing matches selection counts by construction; fresh replay uses the same exact child bytes and is not an independent transformation. Stale carry-forward is an unsafe ablation. No measured human time, semantic correctness, independent annotation, external truth or system speedup.'};
console.log(JSON.stringify(report,null,2));if(report.exactCasesCorrect!==40)process.exitCode=1;
