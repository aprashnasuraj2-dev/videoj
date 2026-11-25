// Atomic, separately pinned multi-source revision. No inferred correspondence.
// Work on exact admitted contract bytes, independent of the textarea adapter.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion,sealInvestigationVersion,compareInvestigationVersions} from './investigation-revision.js';
import {validateReviewedContract} from './reviewed-claim-compiler.js';
import {FACETS} from './semantic-investigation.js';
export const VERSION='sutra-evidence-revision-transaction/v1';
const QUAL='Proposed atomic child only. Changed source selections require explicit exact replacement spans; unselected inputs become typed unknowns. Changed-source quotations and semantic links are removed even when numeric inputs are reselected. Refused parents remain quarantined. No automatic correspondence, source truth, semantic validity, or external authority.';
const parse=(s,d=12)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const pin=x=>typeof x==='string'&&/^sha256:[a-f0-9]{64}$/.test(x);
const fail=x=>{throw TypeError('REVISION_TRANSACTION_'+x);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const sorted=x=>[...new Set(x)].sort();
const decisive=x=>['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED'].includes(x);
const byId=xs=>new Map(xs.map(x=>[x.id,x]));
export async function prepareEvidenceRevision(versionText,versionPin,planText,planPin){
 if(!pin(planPin)||await casePin(planText)!==planPin)fail('PLAN_PIN');
 const plan=parse(planText,10);
 if(!keys(plan,['version','parentDigest','operations'])||plan.version!==1||plan.parentDigest!==versionPin||!Array.isArray(plan.operations)||plan.operations.length<1||plan.operations.length>8)fail('PLAN');
 const parent=await replayInvestigationVersion(versionText,versionPin),v=parse(versionText,6),contract=parse(v.contractText,9);
 const sources=byId(contract.sources),bindings=byId(contract.bindings),operations=new Map(),reselected=new Map(),sourceChanges=[];
 for(const op of plan.operations){
  if(!op||!['withdraw','replace'].includes(op.kind)||!keys(op,op.kind==='withdraw'?['kind','sourceId','previousDigest']:['kind','sourceId','previousDigest','replacementText','replacementDigest','rebindings']))fail('OPERATION');
  const old=sources.get(op.sourceId);
  if(!old||operations.has(op.sourceId)||old.digest!==op.previousDigest)fail('SOURCE_PIN_OR_DUPLICATE');
  operations.set(op.sourceId,op);
  if(op.kind==='replace'){
   if(typeof op.replacementText!=='string'||!op.replacementText.trim()||op.replacementText.length>16384||op.replacementText===old.text||!pin(op.replacementDigest)||await casePin(op.replacementText)!==op.replacementDigest||!Array.isArray(op.rebindings)||op.rebindings.length>64)fail('REPLACEMENT');
   for(const r of op.rebindings){
    if(!keys(r,['bindingId','span'])||!keys(r.span,['sourceId','start','end','quote']))fail('REBINDING');
    const b=bindings.get(r.bindingId);
    if(!b||b.span.sourceId!==op.sourceId||r.span.sourceId!==op.sourceId||reselected.has(r.bindingId))fail('REBINDING_SCOPE');
    reselected.set(b.id,{id:b.id,span:r.span,type:b.type});
   }
  }
  sourceChanges.push({sourceId:op.sourceId,kind:op.kind,previousDigest:old.digest,replacementDigest:op.kind==='replace'?op.replacementDigest:null});
 }
 const affected=new Map(contract.bindings.filter(b=>operations.has(b.span.sourceId)).map(b=>[b.id,b]));
 const lost=new Set([...affected.keys()].filter(id=>!reselected.has(id)));
 const nextContract={...contract,
  sources:contract.sources.flatMap(s=>{const op=operations.get(s.id);return !op?[s]:op.kind==='withdraw'?[]:[{...s,text:op.replacementText,digest:op.replacementDigest}];}),
  bindings:contract.bindings.flatMap(b=>!affected.has(b.id)?[b]:reselected.has(b.id)?[reselected.get(b.id)]:[])};
 const contractText=JSON.stringify(nextContract),contractPin=await casePin(contractText);
 // The existing compiler is the sole span, token, duplicate span and type authority.
 await validateReviewedContract(contractText,contractPin);
 const oldBatch=parse(v.batchText,5),oldAnn=byId(parse(v.annotationText).candidates),oldCandidates=byId(parent.investigation.candidates);
 const proposals=[],annotations=[],changes=[];
 for(const entry of oldBatch.proposals){
  const c=oldCandidates.get(entry.id),a=oldAnn.get(entry.id),accepted=c.admission==='ADMITTED';
  const parentProposalDigest=await casePin(entry.proposalText),changedInputs=[],removedClaims=[],removedReferences=[];
  let proposalText;
  if(!accepted)proposalText=JSON.stringify({version:1,quarantinedProposalDigest:parentProposalDigest});
  else{
   const p=parse(entry.proposalText,9);p.contractDigest=contractPin;
   p.nodes=p.nodes.map(n=>{
    if(n.kind!=='input'||!affected.has(n.bindingId))return n;
    const b=affected.get(n.bindingId),state=lost.has(b.id)?'MISSING':'EXPLICITLY_RESELECTED';
    changedInputs.push({nodeId:n.id,bindingId:b.id,sourceId:b.span.sourceId,state});
    return state==='MISSING'?{id:n.id,kind:'unknown',type:b.type,reason:'Source '+b.span.sourceId+' revised; reviewed binding '+b.id+' unavailable.'}:n;
   });
   p.claims=p.claims.filter(q=>{if(q.kind!=='quoted_assertion'||!operations.has(q.span.sourceId))return true;removedClaims.push(q.id);return false;});
   proposalText=JSON.stringify(p);
  }
  const removedClaimSet=new Set(removedClaims);
  const facets=Object.fromEntries(FACETS.map(f=>{
   const old=a.facets[f];if(old===null)return [f,null];
   const references=old.references.filter(r=>{
    // A newly selected number does not revalidate the old semantic declaration.
    const drop=!accepted||(r.kind==='binding'?affected.has(r.id):removedClaimSet.has(r.id));
    if(drop)removedReferences.push({facet:f,kind:r.kind,id:r.id});return !drop;
   });
   return [f,{statement:old.statement,references}];
  }));
  proposals.push({id:entry.id,proposalText});annotations.push({id:entry.id,meaning:a.meaning,facets});
  const target=(c.computation?.bindingIds??[]).filter(id=>affected.has(id));
  changes.push({id:entry.id,parentAdmission:c.admission,parentProposalDigest,targetMissing:sorted(target.filter(id=>lost.has(id))),targetReselected:sorted(target.filter(id=>reselected.has(id))),changedInputs,removedClaims,removedReferences});
 }
 const batchText=JSON.stringify({version:1,contractDigest:contractPin,proposals});
 const annotationText=JSON.stringify({version:1,contractDigest:contractPin,batchDigest:await casePin(batchText),candidates:annotations});
 const child=await sealInvestigationVersion({previousDigest:versionPin,contractText,contractPin,batchText,annotationText,annotationPin:await casePin(annotationText)});
 const nextCandidates=byId(child.report.investigation.candidates);
 for(const row of changes){
  const before=oldCandidates.get(row.id),after=nextCandidates.get(row.id);
  row.before=before.computation?.status??'REFUSED';row.after=after?.computation?.status??'REFUSED';
  if(!after||before.admission!==after.admission||(row.targetMissing.length&&decisive(row.after))||(!row.targetMissing.length&&!row.targetReselected.length&&row.before!==row.after))fail('MIGRATION_INVARIANT');
  row.classification=before.admission!=='ADMITTED'?'REFUSED_PARENT_QUARANTINED':row.targetMissing.length?'TARGET_INPUT_MISSING':row.targetReselected.length?'TARGET_INPUT_RESELECTED':row.changedInputs.length||row.removedClaims.length||row.removedReferences.length?'CONTEXT_OR_NONTARGET_REVISED':'NO_SCOPED_SOURCE_DEPENDENCY';
 }
 const impact=await compareInvestigationVersions(versionText,versionPin,child.versionText,child.digest);
 return freeze({version:VERSION,parentDigest:versionPin,planDigest:planPin,sourceChanges,invalidatedBindingIds:sorted([...affected.keys()]),reselectedBindingIds:sorted([...reselected.keys()]),missingBindingIds:sorted([...lost]),child,changes,impact,decisionAuthority:'NONE',qualification:QUAL});
}
export async function exportEvidenceRevision(versionText,versionPin,planText,planPin){
 const revision=await prepareEvidenceRevision(versionText,versionPin,planText,planPin);
 const {child,...summary}=revision;
 const bundleText=JSON.stringify({...summary,parentVersion:versionText,planText,childVersion:child.versionText,childDigest:child.digest});
 const byteLength=new TextEncoder().encode(bundleText).length,portable=byteLength<=262144;
 // Oversize reports are not pinned or exported; the admitted child is still usable.
 return freeze({revision,bundleText:portable?bundleText:null,byteLength,portable,snapshotPin:portable?await casePin(bundleText):null,planDigest:planPin});
}
