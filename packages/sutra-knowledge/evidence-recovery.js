// Recover explicitly selected lost inputs from an immediately preceding atomic
// revision. Never infer correspondence from an unknown reason or revive old claims.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {prepareEvidenceRevision,exportEvidenceRevision,openEvidenceRevision} from './evidence-revision-transaction.js';
import {validateReviewedContract} from './reviewed-claim-compiler.js';
import {sealInvestigationVersion,compareInvestigationVersions} from './investigation-revision.js';
export const VERSION='sutra-evidence-recovery/v1';
const QUAL='Proposed recovery from one exactly replayed preceding atomic revision. Every recovered input has an explicit exact numeric selection and its prior declared type; old semantic links and quotations are not restored. Original lineage remains declared, not authenticated. No automatic source correspondence, empirical or semantic truth, arbitrary ancestry recovery, or external authority.';
const parse=(s,d=12)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const pin=x=>typeof x==='string'&&/^sha256:[a-f0-9]{64}$/.test(x);
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const fail=x=>{throw TypeError('EVIDENCE_RECOVERY_'+x);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const sorted=xs=>[...new Set(xs)].sort();
const byId=xs=>new Map(xs.map(x=>[x.id,x]));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export async function prepareEvidenceRecovery(ancestorText,ancestorPin,revisionPlanText,revisionPlanPin,currentPin,recoveryPlanText,recoveryPlanPin){
 if(!pin(currentPin)||!pin(recoveryPlanPin)||await casePin(recoveryPlanText)!==recoveryPlanPin)fail('PIN');
 const plan=parse(recoveryPlanText,10);
 if(!keys(plan,['version','parentDigest','revisionPlanDigest','restorations'])||plan.version!==1||plan.parentDigest!==currentPin||plan.revisionPlanDigest!==revisionPlanPin||!Array.isArray(plan.restorations)||!plan.restorations.length||plan.restorations.length>8)fail('PLAN');
 // Replay the preceding transaction, not an untrusted claim that an arbitrary
 // unknown node used to refer to a given binding. The caller supplies all pins.
 const prior=await prepareEvidenceRevision(ancestorText,ancestorPin,revisionPlanText,revisionPlanPin),parent=prior.child;
 if(parent.digest!==currentPin)fail('PARENT');
 const a=parse(ancestorText,6),v=parse(parent.versionText,6),old=parse(a.contractText,9),contract=parse(v.contractText,9);
 const oldSources=byId(old.sources),oldBindings=byId(old.bindings),sources=byId(contract.sources),bindings=byId(contract.bindings);
 const lost=new Set(prior.missingBindingIds),priorSources=new Map(prior.sourceChanges.map(s=>[s.sourceId,s]));
 const operations=new Map(),restored=new Map(),recovered=new Map();
 for(const op of plan.restorations){
  if(!op||!['restore_source','reselect_missing'].includes(op.kind)||!keys(op,op.kind==='restore_source'?['kind','sourceId','sourceText','sourceDigest','rebindings']:['kind','sourceId','sourceDigest','rebindings']))fail('OPERATION');
  const oldSource=oldSources.get(op.sourceId),source=sources.get(op.sourceId),change=priorSources.get(op.sourceId);
  if(!oldSource||!change||operations.has(op.sourceId)||!pin(op.sourceDigest)||!Array.isArray(op.rebindings)||!op.rebindings.length||op.rebindings.length>64)fail('SOURCE_SCOPE');
  if(op.kind==='restore_source'){
   if(source||change.kind!=='withdraw'||typeof op.sourceText!=='string'||!op.sourceText.trim()||op.sourceText.length>16384||await casePin(op.sourceText)!==op.sourceDigest)fail('RESTORE_SOURCE');
   restored.set(op.sourceId,{...oldSource,text:op.sourceText,digest:op.sourceDigest});
  }else if(!source||change.kind!=='replace'||source.digest!==op.sourceDigest)fail('CURRENT_SOURCE_PIN');
  operations.set(op.sourceId,op);
  for(const r of op.rebindings){
   if(!keys(r,['bindingId','span'])||!keys(r.span,['sourceId','start','end','quote']))fail('REBINDING');
   const b=oldBindings.get(r.bindingId);
   if(!b||!lost.has(b.id)||bindings.has(b.id)||recovered.has(b.id)||b.span.sourceId!==op.sourceId||r.span.sourceId!==op.sourceId)fail('REBINDING_SCOPE');
   recovered.set(b.id,{id:b.id,span:r.span,type:b.type});
  }
 }
 // Preserve current order and bytes; append new entries in original order,
 // independent of the order of the separately pinned recovery operations.
 const nextContract={...contract,sources:[...contract.sources,...old.sources.filter(s=>restored.has(s.id)).map(s=>restored.get(s.id))],
  bindings:[...contract.bindings,...old.bindings.filter(b=>recovered.has(b.id)).map(b=>recovered.get(b.id))]};
 const contractText=JSON.stringify(nextContract),contractPin=await casePin(contractText);
 await validateReviewedContract(contractText,contractPin);
 const oldBatch=parse(v.batchText,5),ann=parse(v.annotationText),parents=byId(parent.report.investigation.candidates),priorChanges=byId(prior.changes);
 const proposals=[],changes=[];
 for(const entry of oldBatch.proposals){
  const c=parents.get(entry.id),priorChange=priorChanges.get(entry.id),accepted=c.admission==='ADMITTED';
  let proposalText=entry.proposalText;
  const recoveredInputs=[];
  if(accepted){
   const p=parse(entry.proposalText,9);p.contractDigest=contractPin;
   const expected=new Map(priorChange.changedInputs.filter(x=>x.state==='MISSING'&&recovered.has(x.bindingId)).map(x=>[x.nodeId,x]));
   p.nodes=p.nodes.map(n=>{
    const match=expected.get(n.id);if(!match)return n;
    if(n.kind!=='unknown'||!same(n.type,recovered.get(match.bindingId).type))fail('MIGRATION_NODE');
    recoveredInputs.push({nodeId:n.id,bindingId:match.bindingId,sourceId:match.sourceId});expected.delete(n.id);
    return {id:n.id,kind:'input',bindingId:match.bindingId};
   });
   if(expected.size)fail('MIGRATION_NODE');
   proposalText=JSON.stringify(p);
  }
  proposals.push({id:entry.id,proposalText});
  const missing=new Set(c.computation?.missing??[]);
  changes.push({id:entry.id,before:c.computation?.status??'REFUSED',recoveredInputs,targetRecoveredNodes:sorted(recoveredInputs.filter(n=>missing.has(n.nodeId)).map(n=>n.nodeId))});
 }
 const batchText=JSON.stringify({version:1,contractDigest:contractPin,proposals});
 // Keep the current annotations exactly; no prior source link or quotation
 // becomes supported merely because a numeric node can compute again.
 const annotationText=JSON.stringify({...ann,contractDigest:contractPin,batchDigest:await casePin(batchText)});
 const child=await sealInvestigationVersion({previousDigest:currentPin,contractText,contractPin,batchText,annotationText,annotationPin:await casePin(annotationText)});
 const next=byId(child.report.investigation.candidates);
 for(const row of changes){
  const before=parents.get(row.id),after=next.get(row.id);row.after=after?.computation?.status??'REFUSED';
  if(!after||before.admission!==after.admission||(!row.targetRecoveredNodes.length&&row.before!==row.after))fail('MIGRATION_INVARIANT');
  row.classification=before.admission!=='ADMITTED'?'REFUSED_PARENT_QUARANTINED':row.targetRecoveredNodes.length?'TARGET_INPUT_RECOVERED':row.recoveredInputs.length?'NONTARGET_INPUT_RECOVERED':'NO_RECOVERY_DEPENDENCY';
 }
 const impact=await compareInvestigationVersions(parent.versionText,currentPin,child.versionText,child.digest);
 return freeze({version:VERSION,ancestorDigest:ancestorPin,revisionPlanDigest:revisionPlanPin,parentDigest:currentPin,recoveryPlanDigest:recoveryPlanPin,
  restoredSourceIds:sorted([...restored.keys()]),recoveredBindingIds:sorted([...recovered.keys()]),stillMissingBindingIds:sorted([...lost].filter(id=>!recovered.has(id))),
  changes,child,impact,decisionAuthority:'NONE',qualification:QUAL});
}

/** Portable recovery binds both transitions. The nested prior snapshot digest is
 * an integrity check; the caller must separately retain all four input pins. */
export async function exportEvidenceRecovery(ancestorText,ancestorPin,revisionPlanText,revisionPlanPin,currentPin,recoveryPlanText,recoveryPlanPin){
 const recovery=await prepareEvidenceRecovery(ancestorText,ancestorPin,revisionPlanText,revisionPlanPin,currentPin,recoveryPlanText,recoveryPlanPin);
 const prior=await exportEvidenceRevision(ancestorText,ancestorPin,revisionPlanText,revisionPlanPin);
 if(!prior.portable)return freeze({recovery,bundleText:null,byteLength:null,portable:false,snapshotPin:null,reason:'PRIOR_TRANSACTION_NOT_PORTABLE'});
 const {child,...summary}=recovery;
 const bundleText=JSON.stringify({...summary,priorTransactionText:prior.bundleText,priorTransactionDigest:prior.snapshotPin,recoveryPlanText,childVersion:child.versionText,childDigest:child.digest});
 const byteLength=new TextEncoder().encode(bundleText).length,portable=byteLength<=262144;
 return freeze({recovery,bundleText:portable?bundleText:null,byteLength,portable,snapshotPin:portable?await casePin(bundleText):null,reason:portable?null:'RECOVERY_BUNDLE_TOO_LARGE'});
}

// Reopen exact producer bytes, with six caller-retained pins. Nested report
// fields are data, never authority. This does not enable recursive recovery.
export async function openEvidenceRecovery(bundleText,snapshotPin,ancestorPin,revisionPlanPin,currentPin,recoveryPlanPin,childPin){
 if(typeof bundleText!=='string'||!bundleText.length||bundleText.length>262144||new TextEncoder().encode(bundleText).length>262144)fail('IMPORT_SIZE');
 if(![snapshotPin,ancestorPin,revisionPlanPin,currentPin,recoveryPlanPin,childPin].every(pin)||await casePin(bundleText)!==snapshotPin)fail('IMPORT_PIN');
 const b=parse(bundleText,40);
 if(b.version!==VERSION||b.ancestorDigest!==ancestorPin||b.revisionPlanDigest!==revisionPlanPin||b.parentDigest!==currentPin||b.recoveryPlanDigest!==recoveryPlanPin||b.childDigest!==childPin||typeof b.priorTransactionText!=='string'||typeof b.recoveryPlanText!=='string'||!pin(b.priorTransactionDigest))fail('IMPORT_SCOPE');
 const prior=await openEvidenceRevision(b.priorTransactionText,b.priorTransactionDigest,ancestorPin,revisionPlanPin,currentPin);
 const e=await exportEvidenceRecovery(prior.ancestor.versionText,ancestorPin,prior.planText,revisionPlanPin,currentPin,b.recoveryPlanText,recoveryPlanPin);
 if(!e.portable||e.snapshotPin!==snapshotPin||e.bundleText!==bundleText||e.recovery.child.digest!==childPin)fail('IMPORT_REPLAY');
 return freeze({ancestor:prior.ancestor,prior:prior.exported,exported:e});
}
