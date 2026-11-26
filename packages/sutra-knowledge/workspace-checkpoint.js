// A portable workspace checkpoint retains editable draft, optional historical
// baseline and optional version history. No model route, result cache or consent.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {openDraftCheckpoint} from './draft-checkpoint.js';
import {replayInvestigationHistory} from './investigation-history.js';
import {replayInvestigationVersion} from './investigation-revision.js';
const VERSION='sutra-workspace-checkpoint/v1';
const fail=c=>{throw TypeError('WORKSPACE_CHECKPOINT_'+c);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const pin=x=>typeof x==='string'&&/^sha256:[a-f0-9]{64}$/.test(x);
const piece=x=>keys(x,['text','pin'])&&typeof x.text==='string'&&pin(x.pin);
export async function openWorkspaceCheckpoint(text,expectedPin){
 if(!pin(expectedPin)||await casePin(text)!==expectedPin)fail('PIN');
 const x=parseUniqueJson(text,{maxChars:262144,maxDepth:6});
 if(!keys(x,['version','draft','history','baseline'])||x.version!==VERSION||!piece(x.draft)||!(x.history===null||piece(x.history))||!(x.baseline===null||piece(x.baseline)))fail('SHAPE');
 const [draft,history,baseline]=await Promise.all([openDraftCheckpoint(x.draft.text,x.draft.pin),x.history?replayInvestigationHistory(x.history.text,x.history.pin):null,x.baseline?replayInvestigationVersion(x.baseline.text,x.baseline.pin):null]);
 return freeze({text,pin:expectedPin,draft,history:x.history,baseline:x.baseline?{versionText:x.baseline.text,digest:x.baseline.pin,report:baseline}:null,summary:{question:draft.summary.question,sourceCount:draft.summary.sourceIds.length,bindingCount:draft.summary.bindingCount,historyPin:x.history?.pin??null,versions:history?.versions.length??0,branches:history?.branches.length??0,baselinePin:x.baseline?.pin??null},decisionAuthority:'NONE',qualification:'Exact caller-pinned portable state, not external freshness, verification of meaning or restoration of model permission. Current evaluation and draft proposals are not restored.'});
}
export async function exportWorkspaceCheckpoint({draftText,history=null,baseline=null}={}){
 const text=JSON.stringify({version:VERSION,draft:{text:draftText,pin:await casePin(draftText)},history,baseline});
 return openWorkspaceCheckpoint(text,await casePin(text));
}
