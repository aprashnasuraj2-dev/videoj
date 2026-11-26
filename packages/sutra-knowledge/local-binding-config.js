// Pure shared local extraction plan and compact untrusted suggestion transfer.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {admitLoopbackRoutes} from '../sutra-inference/loopback-route.js';
import {sealReviewedDraft} from './reviewed-draft.js';
import {previewBindingSuggestions} from './binding-suggestions.js';
import {casePin} from './pinned-investigation.js';
export const LOCAL_BINDING_VERSION='sutra-local-binding-suggestions/v1',LOCAL_BINDING_TRANSFER='sutra-local-binding-transfer/v1';
const PIN=/^sha256:[a-f0-9]{64}$/,ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const keys=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const text=(x,n)=>typeof x==='string'&&x.trim().length>0&&x.length<=n&&!/[\ud800-\udfff]/u.test(x);
const fail=code=>{const e=new Error('Local binding plan refused ('+code+').');e.code=code;throw e;};
const bytes=x=>new TextEncoder().encode(x).length;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function admitLocalBindingConfig(configText){
 if(typeof configText!=='string'||bytes(configText)>262144)fail('INPUT_SIZE');
 const c=parseUniqueJson(configText,{maxChars:262144,maxDepth:8});
 if(!keys(c,['version','draftText','draftPin','sourceIds','connection','maxOutputTokens','timeoutMs','transportDeadlineMs'])||c.version!==LOCAL_BINDING_VERSION||!int(c.maxOutputTokens,1,1024)||!int(c.timeoutMs,100,30000)||!int(c.transportDeadlineMs,100,c.timeoutMs))fail('CONFIG');
 const x=c.connection;
 if(!keys(x,['id','label','protocol','endpoint','models','authMode','credentialEnv'])||!text(x.label,64)||!Array.isArray(x.models)||x.models.length!==1||!['none','bearer','anthropic-key'].includes(x.authMode)||(x.authMode==='none'?x.credentialEnv!==null:typeof x.credentialEnv!=='string'||!/^SUTRA_LOCAL_[A-Z0-9_]{1,64}$/.test(x.credentialEnv)))fail('CONNECTION');
 const routes=[{connectionId:x.id,protocol:x.protocol,endpoint:x.endpoint,models:x.models,authMode:x.authMode}];
 admitLoopbackRoutes(routes,c.transportDeadlineMs);
 if(typeof c.draftText!=='string'||typeof c.draftPin!=='string'||!PIN.test(c.draftPin)||await casePin(c.draftText)!==c.draftPin)fail('DRAFT_PIN');
 await sealReviewedDraft(c.draftText);
 const draft=parseUniqueJson(c.draftText,{maxChars:262144,maxDepth:8});
 if(!text(draft.question,2000)||!Array.isArray(c.sourceIds)||c.sourceIds.length<1||c.sourceIds.length>4||c.sourceIds.some(id=>typeof id!=='string'||!ID.test(id)||!draft.sources.some(s=>s.id===id))||new Set(c.sourceIds).size!==c.sourceIds.length)fail('DISCLOSURE');
 const sources=c.sourceIds.map(id=>{const s=draft.sources.find(s=>s.id===id);return {id:s.id,text:s.text};});
 if(sources.reduce((n,s)=>n+bytes(s.text),0)>16000)fail('DISCLOSURE_SIZE');
 const planPin=await casePin(configText),budget={maxCalls:1,maxInputBytes:100000,maxOutputTokens:c.maxOutputTokens,maxConcurrent:1};
 return freeze({config:c,draft,routes,planPin,budget,preview:{mode:'LOCAL_BINDING_PLAN_ONLY',planPin,draftPin:c.draftPin,question:draft.question,sources,connection:x,maxOutputTokens:c.maxOutputTokens,timeoutMs:c.timeoutMs,transportDeadlineMs:c.transportDeadlineMs,qualification:'Full draft is in the local plan file; only the question and selected source text are sent by the approved runner. A local process may forward requests. No model identity, confidentiality or semantic accuracy established.'}});
}
// Recover only a separately pinned plan for the exact already staged draft.
// This function neither restores evidence nor grants network execution.
export async function recoverLocalBindingPlan({configText,expectedPlanPin,currentDraftText}={}){
 if(typeof expectedPlanPin!=='string'||!PIN.test(expectedPlanPin))fail('EXPECTED_PINS');
 const p=await admitLocalBindingConfig(configText);
 if(p.planPin!==expectedPlanPin||p.config.draftText!==currentDraftText)fail('PLAN_OR_DRAFT_MISMATCH');
 return p;
}
export async function verifyLocalBindingTransfer({configText,expectedPlanPin,transferText,expectedProposalPin}={}){
 if(typeof expectedPlanPin!=='string'||!PIN.test(expectedPlanPin)||typeof expectedProposalPin!=='string'||!PIN.test(expectedProposalPin))fail('EXPECTED_PINS');
 const {config,planPin}=await admitLocalBindingConfig(configText);
 if(planPin!==expectedPlanPin||typeof transferText!=='string'||bytes(transferText)>65536)fail('PLAN_OR_SIZE');
 const t=parseUniqueJson(transferText,{maxChars:65536,maxDepth:4});
 if(!keys(t,['version','planPin','draftPin','proposalText','proposalPin'])||t.version!==LOCAL_BINDING_TRANSFER||t.planPin!==planPin||t.draftPin!==config.draftPin||t.proposalPin!==expectedProposalPin||typeof t.proposalText!=='string'||t.proposalText.length>32768||await casePin(t.proposalText)!==expectedProposalPin)fail('TRANSFER');
 const proposal=parseUniqueJson(t.proposalText,{maxChars:32768,maxDepth:8});
 if(!keys(proposal,['version','suggestions'])||proposal.version!==1||!Array.isArray(proposal.suggestions)||proposal.suggestions.some(s=>!config.sourceIds.includes(s?.sourceId)))fail('DISCLOSURE');
 const preview=await previewBindingSuggestions({draftText:config.draftText,draftPin:config.draftPin,proposalText:t.proposalText,proposalPin:t.proposalPin});
 return freeze({status:'UNTRUSTED_SUGGESTIONS_REVIEW_REQUIRED',proposalText:t.proposalText,proposalPin:t.proposalPin,preview,decisionAuthority:'NONE',qualification:'Exact pins and scope match; no provider contact or model authorship is authenticated. Review the actual source and type before selecting.'});
}
