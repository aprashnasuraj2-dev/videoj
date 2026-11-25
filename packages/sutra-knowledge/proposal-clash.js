// Deliberately not a merge. A synthetic all-available receipt-only test can
// expose cross-branch contradictions, but does not adopt either history.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {alignedInvestigationExport} from './aligned-investigation.js';
import {challengeProposal} from './proposal-challenge.js';
export const CLASH_VERSION='sutra-proposal-clash/v1';
const QUAL='Hypothetical receipt-only set comparison under the same pinned model; historical withdrawal and availability are not applied in this separate test. No merged history, newly authorized source, next-observation availability, independence, source truth or adoption is established.';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const summary=r=>({state:r.state,survivingWorlds:r.report.survivingWorlds,minimum:r.minimum,repairs:r.repairs,minimumObservationConflict:r.report.conflict??null});
function read(events,id){
 const e=events.findLast(x=>x.type==='read'&&x.observationId===id);
 if(!e)throw Error('CLASH_READ_MISSING');
 return e;
}
export async function diagnoseProposalClash(caseText,pin,eventText,proposalText){
 const compared=await challengeProposal(caseText,pin,eventText,proposalText);
 const q=parseUniqueJson(proposalText,{maxChars:262144,maxDepth:5}),a=parseUniqueJson(eventText,{maxChars:262144,maxDepth:6}),b=parseUniqueJson(q.eventText,{maxChars:262144,maxDepth:6});
 const {shared,baselineOnly,proposalOnly,unavailableSources}=compared.evidence;
 const common=shared.map(r=>{const x=read(a,r.observationId),y=read(b,r.observationId);if(x.sourceText!==y.sourceText)throw Error('CLASH_SHARED_BYTES_DIFFER');return x;});
 const all=[...common,...baselineOnly.map(r=>read(a,r.observationId)),...proposalOnly.map(r=>read(b,r.observationId))].sort((x,y)=>sort(x.observationId,y.observationId));
 const replay=async events=>(await alignedInvestigationExport(caseText,pin,JSON.stringify(events))).result;
 const commonReport=await replay(common),joint=await replay(all);
 if(compared.worlds.shared.join('\n')!==joint.report.survivingWorlds.join('\n'))throw Error('CLASH_INTERSECTION_MISMATCH');
 if(!compared.baseline.survivingWorlds.concat(compared.proposal.survivingWorlds).every(w=>commonReport.report.survivingWorlds.includes(w)))throw Error('CLASH_SHARED_SUPERSET');
 const priorConflict=[compared.baseline.state,compared.proposal.state].includes('CONFLICTED');
 const kind=priorConflict?'BRANCH_ALREADY_CONFLICTED':joint.state==='CONFLICTED'?'CROSS_BRANCH_CLASH':'JOINT_COMPATIBLE';
 const unavailable={baseline:[...unavailableSources.shared,...unavailableSources.baselineOnly],proposal:[...unavailableSources.shared,...unavailableSources.proposalOnly]};
 return freeze({version:CLASH_VERSION,caseDigest:pin,proposalDigest:compared.proposalDigest,baselineEventDigest:compared.baseline.eventDigest,proposalEventDigest:compared.proposal.eventDigest,
  classification:kind,claim:compared.claim,baselineState:compared.baseline.state,proposalState:compared.proposal.state,
  sharedFinal:{observationIds:common.map(x=>x.observationId),...summary(commonReport)},jointFinal:{observationIds:all.map(x=>x.observationId),...summary(joint)},
  unavailableInOtherBranch:{baselineReadings:baselineOnly.filter(r=>unavailable.proposal.includes(r.sourceId)).map(r=>r.observationId),proposalReadings:proposalOnly.filter(r=>unavailable.baseline.includes(r.sourceId)).map(r=>r.observationId)},qualification:QUAL});
}
export async function exportProposalClash(caseText,pin,eventText,proposalText){
 const result=await diagnoseProposalClash(caseText,pin,eventText,proposalText);
 return freeze({version:CLASH_VERSION,caseText,eventText,proposalText,result});
}
