// Prepare a source withdrawal child of a caller-pinned exact editable version.
 // This is a deterministic *proposal* for human review, not semantic authority.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {restoreReviewedSourceDraft,withdrawReviewedSourceDraft} from './source-draft-restore.js';
import {sealReviewedDraft} from './reviewed-draft.js';
import {replayInvestigationVersion,sealInvestigationVersion,compareInvestigationVersions} from './investigation-revision.js';
import {FACETS} from './semantic-investigation.js';
export const VERSION='sutra-withdrawal-revision/v1';
const parse=(s,d=12)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const fail=x=>{throw TypeError('REVISION_WITHDRAW_'+x);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const decisive=x=>x==='CONDITIONALLY_SATISFIED'||x==='CONDITIONALLY_REFUTED';
const sorted=x=>[...new Set(x)].sort();
export async function prepareWithdrawalRevision(versionText,versionPin,sourceId,sourcePin){
 const parent=await replayInvestigationVersion(versionText,versionPin),v=parse(versionText,6),contract=parse(v.contractText,9);
 const restored=await restoreReviewedSourceDraft(versionText,versionPin);
 if(!restored.exactContractBytes)fail('EDITABLE_CONTRACT');
 const withdrawn=await withdrawReviewedSourceDraft(JSON.stringify(restored.draft),sourceId,sourcePin);
 const sealed=await sealReviewedDraft(JSON.stringify(withdrawn.draft));
 const removed=new Set(withdrawn.invalidatedBindingIds),types=new Map(contract.bindings.map(b=>[b.id,b.type]));
 const oldBatch=parse(v.batchText,5),oldAnn=parse(v.annotationText),byId=new Map(parent.investigation.candidates.map(c=>[c.id,c]));
 const annById=new Map(oldAnn.candidates.map(c=>[c.id,c])),proposals=[],annotations=[],changes=[];
 for(const entry of oldBatch.proposals){
  const c=byId.get(entry.id),a=annById.get(entry.id),accepted=c.admission==='ADMITTED';
  const changedInputs=[],removedClaims=[],removedReferences=[];
  let proposalText;
  if(!accepted){
   // Do not repin a refused proposal: one refused only because of a wrong
   // contract pin could otherwise become valid on the next version.
   proposalText=JSON.stringify({version:1,quarantinedProposalDigest:await casePin(entry.proposalText)});
  }else{
   const p=parse(entry.proposalText,9);
   p.contractDigest=sealed.pin;
   p.nodes=p.nodes.map(n=>{
    if(n.kind!=='input'||!removed.has(n.bindingId))return n;
    changedInputs.push({nodeId:n.id,bindingId:n.bindingId});
    return {id:n.id,kind:'unknown',type:types.get(n.bindingId),reason:'Source '+sourceId+' withdrawn; reviewed binding '+n.bindingId+' unavailable.'};
   });
   p.claims=p.claims.filter(claim=>{
    if(claim.kind!=='quoted_assertion'||claim.span.sourceId!==sourceId)return true;
    removedClaims.push(claim.id);return false;
   });
   proposalText=JSON.stringify(p);
  }
  const lostClaims=new Set(removedClaims);
  const facets=Object.fromEntries(FACETS.map(f=>{
   const old=a.facets[f];if(old===null)return [f,null];
   const references=old.references.filter(r=>{
    const drop=!accepted||(r.kind==='binding'?removed.has(r.id):lostClaims.has(r.id));
    if(drop)removedReferences.push({facet:f,kind:r.kind,id:r.id});
    return !drop;
   });
   // Keep the user's original wording, not its prior evidential linkage.
   return [f,{statement:old.statement,references}];
  }));
  proposals.push({id:entry.id,proposalText});annotations.push({id:entry.id,meaning:a.meaning,facets});
  const targetBindings=(c.computation?.bindingIds??[]).filter(x=>removed.has(x));
  changes.push({id:entry.id,parentAdmission:c.admission,parentProposalDigest:await casePin(entry.proposalText),
   targetBindings:sorted(targetBindings),changedInputs,removedClaims,removedReferences,
   classification:!accepted?'REFUSED_PARENT_QUARANTINED':targetBindings.length?'TARGET_EVIDENCE_WITHDRAWN':changedInputs.length||removedClaims.length||removedReferences.length?'CONTEXT_OR_NONTARGET_WITHDRAWN':'NO_SCOPED_SOURCE_DEPENDENCY'});
 }
 const batchText=JSON.stringify({version:1,contractDigest:sealed.pin,proposals});
 const annotationText=JSON.stringify({version:1,contractDigest:sealed.pin,batchDigest:await casePin(batchText),candidates:annotations});
 const child=await sealInvestigationVersion({previousDigest:versionPin,contractText:sealed.contractText,contractPin:sealed.pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
 const nextById=new Map(child.report.investigation.candidates.map(c=>[c.id,c]));
 for(const row of changes){
  const before=byId.get(row.id),after=nextById.get(row.id);
  const prior=before.computation?.status??'REFUSED',next=after?.computation?.status??'REFUSED';
  // Fail closed on an unexpected migration effect, not an inferred new answer.
  if(!after||before.admission!==after.admission||(!row.targetBindings.length&&prior!==next)||(row.targetBindings.length&&decisive(next)))fail('MIGRATION_INVARIANT');
  row.before=prior;row.after=next;
 }
 const impact=await compareInvestigationVersions(versionText,versionPin,child.versionText,child.digest);
 return freeze({version:VERSION,parentDigest:versionPin,sourceId,sourcePin,draft:withdrawn.draft,
  child,changes,impact,decisionAuthority:'NONE',qualification:'Proposed child only. Exact admitted programs are rebound; missing inputs become typed unknowns, withdrawn quotations and links are removed, and refused parents stay refused. Meaning statements remain unverified. No evidence substitution, receipt transplantation, global dependency completeness or incremental speedup.'});
}

/** Portable transformation proof. Retain snapshot, parent and plan pins separately.
 * The plan binds source ID as well as digest: two source IDs may share exact bytes. */
export async function exportWithdrawalRevision(versionText,versionPin,sourceId,sourcePin){
 const revision=await prepareWithdrawalRevision(versionText,versionPin,sourceId,sourcePin);
 const planText=JSON.stringify({version:1,parentDigest:versionPin,sourceId,sourcePin});
 const planDigest=await casePin(planText);
 const bundleText=JSON.stringify({version:VERSION,parentVersion:versionText,parentDigest:versionPin,planText,planDigest,
  childVersion:revision.child.versionText,childDigest:revision.child.digest,changes:revision.changes,impact:revision.impact,
  decisionAuthority:'NONE',qualification:revision.qualification});
 const byteLength=new TextEncoder().encode(bundleText).length;
 return freeze({revision,bundleText,byteLength,portable:byteLength<=262144,snapshotPin:await casePin(bundleText),planDigest});
}
