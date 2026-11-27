// Explicitly approved, single bounded model request over selected staged source
// text. A model may suggest numeric anchors; it cannot admit a binding, choose
// a provider, grant disclosure, call a tool or assert a verified meaning.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {sealReviewedDraft} from './reviewed-draft.js';
import {previewBindingSuggestions} from './binding-suggestions.js';
import {prepareCouncil,councilClosed,councilInt,councilText,denseCouncilArray} from './council-scheduler.js';
const SCOPE='selected-source-text-for-binding-suggestions',ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const stop=code=>{const e=new Error('Binding suggestion request refused ('+code+').');e.code=code;throw e;};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
async function prepare({draftText,draftPin,sourceIds,route,workspace,maxOutputTokens=1024,timeoutMs=15000,signal}={}){
 if(typeof draftText!=='string'||draftText.length>262144||!councilInt(timeoutMs,100,30000)||!Array.isArray(sourceIds)||sourceIds.length<1||sourceIds.length>4||!denseCouncilArray(sourceIds)||sourceIds.some(x=>typeof x!=='string'||!ID.test(x))||new Set(sourceIds).size!==sourceIds.length)stop('CONFIG');
 if(typeof workspace?.admitOperation!=='function')stop('CONFIG');
 const selected=[...sourceIds];
 const config=prepareCouncil({routes:[route],workspace,shareScope:SCOPE,maxRounds:1,maxOutputTokens,timeoutMs,signal,maxSlots:1});
 const team=config.team[0];
 if(await casePin(draftText)!==draftPin)stop('DRAFT_PIN');
 await sealReviewedDraft(draftText);
 const d=parseUniqueJson(draftText,{maxChars:262144,maxDepth:8});
 if(!councilText(d.question,2000)||selected.some(id=>!d.sources.some(s=>s.id===id)))stop('DISCLOSURE');
 const sources=selected.map(id=>{const s=d.sources.find(x=>x.id===id);return {id:s.id,text:s.text};});
 if(sources.reduce((n,x)=>n+new TextEncoder().encode(x.text).length,0)>16000)stop('DISCLOSURE_SIZE');
 const operation=freeze({kind:'source-quantity-suggestion-v1',question:d.question,sources,instruction:'Return JSON with exactly {version:1,suggestions:[{id,sourceId,quote,before,after,type:{kind,unit,scope,dimension:[L,M,T]}}]}. At most 16. Quote a complete numeric token from a supplied source and adjacent literal context that uniquely identifies its occurrence. No inferred numbers, offsets, new sources, verification claims, tools or URLs. Types and comparability are suggestions only. If unsure omit the suggestion.'});
 // Scan decoded operation fields before displaying or serializing a plan.
 try{workspace.admitOperation(operation);}catch(e){stop(e?.code==='SECRET_ECHO'?'SECRET_ECHO':'CONFIG');}
 const inputBytes=new TextEncoder().encode(JSON.stringify(operation)).length;
 const plan=freeze({version:1,draftPin,providerId:team.providerId,profileId:team.profileId,model:team.model,agentId:team.id,role:team.role,sourceIds:selected,operation,inputBytes,maxOutputTokens,timeoutMs,qualification:'The approved question and full selected source texts are disclosed to this one route. Unselected sources are not included. A remote or local provider may retain or forward the request; no ownership, confidentiality, or billed-cost claim.'});
 const planPin=await casePin(JSON.stringify(plan));config.assertPublication();
 return {config,team,plan,planPin};
}
export async function previewBindingSuggestionRequest(options){
 const {config,plan,planPin}=await prepare(options);config.assertPublication();return freeze({mode:'PLAN_ONLY',plan,planPin});
}
export async function runApprovedBindingSuggestionRequest(options={}){
 const {config,team,plan,planPin}=await prepare(options);
 if(options.approveDisclosure!==true||options.approvedPlanPin!==planPin)stop('APPROVAL');
 const {signal}=config,controller=new AbortController(),cancel=()=>controller.abort();
 signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 const timer=setTimeout(cancel,plan.timeoutMs);let listener;
 const cancellation=new Promise(resolve=>{listener=()=>resolve(null);if(controller.signal.aborted)listener();else controller.signal.addEventListener('abort',listener,{once:true});});
 try{
  if(controller.signal.aborted)stop('CANCELLED_OR_TIMEOUT');
  // No automatic retry. The workspace owns reservations and actual wire bytes.
  // Timeout ends this observer's wait, not necessarily the provider operation.
  const pending=Promise.resolve().then(()=>controller.signal.aborted?null:(config.assertPublication(),config.execute({handle:team.handle,model:team.model,inputBytes:plan.inputBytes,maxOutputTokens:plan.maxOutputTokens,operation:plan.operation}))).catch(()=>{stop('PROVIDER_REFUSED');});
  const result=await Promise.race([pending,cancellation]);
  if(!result||controller.signal.aborted)stop('CANCELLED_OR_TIMEOUT');
  if(result.profile?.profileId!==team.profileId||result.profile?.providerId!==team.providerId||result.model!==team.model||!councilClosed(result.value,['text'])||typeof result.value.text!=='string'||result.value.text.length>32768)stop('PROPOSAL_REFUSED');
  config.assertPublication();
  const proposalText=result.value.text;
  // Never resolve or expose a guessed hidden source, even if its quote exists
  // in the local draft. Scope checks occur before exact anchor preview.
  let candidate;try{candidate=parseUniqueJson(proposalText,{maxChars:32768,maxDepth:8});}catch{stop('PROPOSAL_REFUSED');}
  if(!councilClosed(candidate,['version','suggestions'])||candidate.version!==1||!Array.isArray(candidate.suggestions)||candidate.suggestions.length>16||candidate.suggestions.some(x=>!plan.sourceIds.includes(x?.sourceId)))stop('PROPOSAL_REFUSED');
  // Provider envelope checks see raw assistant text, not its inner JSON values.
 // Inspect the decoded tree before anchor resolution or publication: JSON
 // escapes can otherwise disguise an exact enrolled credential from the vault.
 try{options.workspace.admitOperation(candidate);}catch(e){stop(e?.code==='SECRET_ECHO'?'SECRET_ECHO':'PROPOSAL_REFUSED');}
 const proposalPin=await casePin(proposalText);let preview;
  try{preview=await previewBindingSuggestions({draftText:options.draftText,draftPin:plan.draftPin,proposalText,proposalPin});}catch{stop('PROPOSAL_REFUSED');}
  if(controller.signal.aborted)stop('CANCELLED_OR_TIMEOUT');
  config.assertPublication();
  // Deliberately no draft application. The untrusted suggestion can be reviewed
  // via the existing independently pinned human selection path.
  return freeze({mode:'MODEL_SUGGESTION_REVIEW_REQUIRED',planPin,draftPin:plan.draftPin,proposalText,proposalPin,preview,decisionAuthority:'NONE'});
 }finally{clearTimeout(timer);controller.signal.removeEventListener('abort',listener);signal?.removeEventListener('abort',cancel);}
}
