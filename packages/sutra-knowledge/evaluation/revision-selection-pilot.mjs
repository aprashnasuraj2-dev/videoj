// Frozen developer-authored revision pilot. Counts selections, never human time.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {guidedLivingCase} from '../examples/guided-living-case.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {restoreReviewedSourceDraft,reviseReviewedSourceDraft} from '../source-draft-restore.js';
import {auditRevisionReuse} from '../revision-reuse-audit.js';
import {casePin} from '../pinned-investigation.js';
import {FACETS} from '../semantic-investigation.js';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
async function seal(draft,candidates,parent=null){
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify(draft));
 const proposals=[];
 for(const c of candidates)proposals.push({id:c.id,proposalText:(await compileReviewedExpression(contractText,pin,c.formula)).proposalText});
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals});
 const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates:candidates.map(c=>({id:c.id,meaning:c.meaning,facets:{...Object.fromEntries(FACETS.map(k=>[k,null])),definition:{statement:c.meaning,references:[{kind:'binding',id:c.binding}]}}}))});
 return sealInvestigationVersion({previousDigest:parent,contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
}
const states=v=>Object.fromEntries(v.report.investigation.candidates.map(c=>[c.id,c.computation?.status??'REFUSED']));
export async function runRevisionPilot(data){
 if(data.schemaVersion!==1||data.split!=='development_synthetic'||data.cases.length!==4)throw Error('REVISION_PILOT_SPEC');
 const rows=[],seen=new Set();
 for(const c of data.cases){
  if(seen.has(c.id))throw Error('REVISION_PILOT_DUPLICATE');seen.add(c.id);
  const original=await guidedLivingCase(c.domain,false),corrected=await guidedLivingCase(c.domain,true);
  const after=structuredClone(corrected.draft);
  // A byte change without a quantity change is also material to source admission.
  // Append after every selected span so the frozen selection oracle is unchanged.
  for(const s of after.sources){
   const previous=original.draft.sources.find(x=>x.id===s.id);
   if(c.changedSources.includes(s.id)&&s.text===previous.text)s.text+='Updated source note.';
  }
  const before=await seal(original.draft,original.candidates);
  const restored=await restoreReviewedSourceDraft(before.versionText,before.digest);
  let current=restored.draft;
  const invalidated=[];
  for(const id of c.changedSources){
   const r=await reviseReviewedSourceDraft(JSON.stringify(current),id,after.sources.find(s=>s.id===id).text);
   invalidated.push(...r.invalidatedBindingIds);current=r.draft;
  }
  const retained=current.bindings.map(b=>b.id);
  // The fixture supplies the independently predeclared selection oracle, not auto-remapping.
  const reselected=after.bindings.filter(b=>invalidated.includes(b.id));
  const finalDraft={...current,bindings:after.bindings.map(b=>current.bindings.find(x=>x.id===b.id)??reselected.find(x=>x.id===b.id))};
  const rebuilt=await seal(after,corrected.candidates,before.digest);
  const targeted=await seal(finalDraft,corrected.candidates,before.digest);
  const audit=await auditRevisionReuse(before.versionText,before.digest,targeted.versionText,targeted.digest);
  const expected=Object.entries(c.expectedStates).sort(),actual=Object.entries(states(targeted)).sort();
  rows.push({id:c.id,domain:c.domain,fullReselection:after.bindings.length,targetedReselection:reselected.length,retained,invalidated,actualStates:states(targeted),exactVersionMatch:rebuilt.versionText===targeted.versionText,
   correct:same(retained,c.expectedRetained)&&same(invalidated,c.expectedReselected)&&same(actual,expected)&&rebuilt.versionText===targeted.versionText,
   diagnosticProjectedNodes:audit.counts});
 }
 const full=rows.reduce((n,r)=>n+r.fullReselection,0),targeted=rows.reduce((n,r)=>n+r.targetedReselection,0);
 return {dataset:data.dataset,split:data.split,annotation:data.annotation,caseCount:rows.length,exactCasesCorrect:rows.filter(r=>r.correct).length,selectionCounts:{fullReselection:full,targetedReselection:targeted,avoided:full-targeted},rows,
 qualification:'Synthetic selection count against a deliberately full-reselection baseline. A conventional editor that preserves unaffected selections may match this method. Does not measure total review effort, wall time, source quality, live models or human performance. Whole changed source invalidates every selection; all-source edits give no selection savings. Both versions fully replayed; projected node reuse is diagnostic only.'};
}
if(import.meta.url===(process.argv[1]?pathToFileURL(process.argv[1]).href:'')){
 const data=JSON.parse(await readFile(new URL('./revision-selection-pilot-v1.json',import.meta.url),'utf8'));
 const r=await runRevisionPilot(data);console.log(JSON.stringify(r,null,2));if(r.exactCasesCorrect!==r.caseCount)process.exitCode=1;
}
