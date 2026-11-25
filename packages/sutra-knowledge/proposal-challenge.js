// An untrusted agent proposal is a hypothetical history, not authority to
// rewrite evidence. Compare it with the current replay under the same case pin.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {alignedInvestigationExport} from './aligned-investigation.js';
import {casePin} from './pinned-investigation.js';
export const PROPOSAL_VERSION='sutra-proposal-challenge/v1';
const QUAL='Untrusted hypothetical proposal independently recomputed against the same pinned finite case. Agreement is not corroboration; divergence is not authorization to change evidence. No agent identity, source truth, freshness or adoption is established.';
const STATES=['SUPPORTED','REFUTED','UNDERDETERMINED','CONFLICTED','UNVERIFIED'];
const fail=()=>{throw TypeError('PROPOSAL_REFUSED');};
const keys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
const sort=(a,b)=>a<b?-1:a>b?1:0;
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const canonical=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canonical).join(',')+']':'{'+Object.keys(x).sort(sort).map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
const ids=(r,k)=>r.report[k].slice().sort(sort);
const diff=(a,b)=>({shared:a.filter(x=>b.includes(x)),baselineOnly:a.filter(x=>!b.includes(x)),proposalOnly:b.filter(x=>!a.includes(x))});
const summary=r=>({eventDigest:r.eventDigest,state:r.state,survivingWorlds:r.report.survivingWorlds,minimum:r.minimum,repairs:r.repairs,frontier:r.report.frontier,observationValues:r.observationValues});
export async function challengeProposal(caseText,pin,eventText,proposalText){
 const q=parseUniqueJson(proposalText,{maxChars:262144,maxDepth:5});
 if(!keys(q,['caseDigest','eventText','claimedState'])||q.caseDigest!==pin||typeof q.eventText!=='string'||!STATES.includes(q.claimedState))fail();
 const baseline=await alignedInvestigationExport(caseText,pin,eventText),proposal=await alignedInvestigationExport(caseText,pin,q.eventText);
 const a=baseline.result,b=proposal.result;
 if(baseline.alignment.schemaDigest!==proposal.alignment.schemaDigest||canonical(a.report.worlds)!==canonical(b.report.worlds))throw Error('PROPOSAL_CASE_CHANGED');
 const ae=parseUniqueJson(eventText,{maxChars:262144,maxDepth:6}),be=parseUniqueJson(q.eventText,{maxChars:262144,maxDepth:6});
 let prefix=0;while(prefix<Math.min(ae.length,be.length)&&canonical(ae[prefix])===canonical(be[prefix]))prefix++;
 const common=await alignedInvestigationExport(caseText,pin,JSON.stringify(ae.slice(0,prefix)));
 const ar=a.report.activeEvidence.slice().sort((x,y)=>sort(x.observationId,y.observationId)),br=b.report.activeEvidence.slice().sort((x,y)=>sort(x.observationId,y.observationId));
 const d=diff(ar.map(x=>x.observationId),br.map(x=>x.observationId));
 for(const id of d.shared)if(canonical(ar.find(x=>x.observationId===id))!==canonical(br.find(x=>x.observationId===id)))throw Error('PROPOSAL_RECEIPT_CHANGED');
 const worlds=diff(ids(a,'survivingWorlds'),ids(b,'survivingWorlds'));
 const opposite=(a.state==='SUPPORTED'&&b.state==='REFUTED')||(a.state==='REFUTED'&&b.state==='SUPPORTED');
 if(opposite&&worlds.shared.length)throw Error('PROPOSAL_OPPOSITE_OVERLAP');
 return freeze({version:PROPOSAL_VERSION,caseDigest:pin,schemaDigest:baseline.alignment.schemaDigest,proposalDigest:await casePin(proposalText),
  claim:{claimedState:q.claimedState,recomputedState:b.state,matches:q.claimedState===b.state},
  comparison:opposite?'OPPOSITE_DECISIVE_STATES':a.state===b.state?'SAME_STATE':'DIFFERENT_STATES',
  history:{commonEventCount:prefix,baselineEventCount:ae.length,proposalEventCount:be.length,commonPrefix:summary(common.result),baselineTail:a.report.history.slice(prefix),proposalTail:b.report.history.slice(prefix)},
  evidence:{shared:ar.filter(x=>d.shared.includes(x.observationId)),baselineOnly:ar.filter(x=>d.baselineOnly.includes(x.observationId)),proposalOnly:br.filter(x=>d.proposalOnly.includes(x.observationId)),declaredRoots:diff(Object.keys(a.report.lineageGroups).sort(sort),Object.keys(b.report.lineageGroups).sort(sort)),unavailableSources:diff(ids(a,'unavailableSources'),ids(b,'unavailableSources'))},
  worlds,baseline:summary(a),proposal:summary(b),qualification:QUAL});
}
export async function exportProposalChallenge(caseText,pin,eventText,proposalText){
 const result=await challengeProposal(caseText,pin,eventText,proposalText);
 return freeze({version:PROPOSAL_VERSION,caseText,eventText,proposalText,result});
}
