import test from 'node:test';
import assert from 'node:assert/strict';
import {createProtocolWorkspace} from '../../sutra-inference/protocol-workspace.js';
import {casePin} from '../pinned-investigation.js';
import {previewBindingSuggestionRequest,runApprovedBindingSuggestionRequest} from '../binding-suggestion-request.js';
import {applyReviewedBindingSuggestions} from '../binding-suggestions.js';
const secret='SOURCE_EXTRACTION_CANARY_987654',hidden='UNSELECTED_MARKER_987654';
const type={kind:'stress',unit:'MPa',scope:'same_condition',dimension:[-1,1,-2]};
const suggestion={id:'a_value',sourceId:'a',quote:'12.50',before:'repeat: ',after:';',type};
function setup(response=()=>JSON.stringify({version:1,suggestions:[suggestion]})){
 const seen=[],limits={maxCalls:2,maxInputBytes:50000,maxOutputTokens:2048,maxConcurrent:1};let seed=1;
 const workspace=createProtocolWorkspace({connections:[{id:'custom',label:'Custom model',protocol:'openai-compatible-json',endpoint:'https://example.com/chat',transportClass:'hosted',models:['my/model']}],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,exchange:async req=>{seen.push(req);return {status:200,bodyText:JSON.stringify({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:await response(req)}}],usage:{completion_tokens:50}})};}});
 const handle=workspace.addProfile({providerId:'custom',label:'Operator selected',credential:secret}).handle;
 return {workspace,seen,route:{id:'extractor',role:'Extract source quantities',handle,model:'my/model',shareScope:'selected-source-text-for-binding-suggestions'}};
}
async function options(s,overrides={}){
 const draftText=JSON.stringify({version:1,question:'Compare the values',sources:[{id:'a',lineage:'r1',text:'A: 12.50; repeat: 12.50;'},{id:'hidden',lineage:'r2',text:hidden+' 88;'}],bindings:[]});
 return {...s,draftText,draftPin:await casePin(draftText),sourceIds:['a'],...overrides};
}
const execute=async opts=>runApprovedBindingSuggestionRequest({...opts,approveDisclosure:true,approvedPlanPin:(await previewBindingSuggestionRequest(opts)).planPin});
test('custom protocol route receives only exactly approved source text; result requires human review before admission',async()=>{
 const s=setup(),o=await options(s),p=await previewBindingSuggestionRequest(o);
 assert.equal(s.seen.length,0);assert.equal(JSON.stringify(p).includes(hidden),false);assert.equal(JSON.stringify(p).includes(secret),false);
 await assert.rejects(runApprovedBindingSuggestionRequest(o),/APPROVAL/);
 await assert.rejects(runApprovedBindingSuggestionRequest({...o,sourceIds:['hidden'],approveDisclosure:true,approvedPlanPin:p.planPin}),/APPROVAL/);assert.equal(s.seen.length,0);
 const r=await execute(o);assert.equal(s.seen.length,1);assert.equal(s.seen[0].credential,secret);assert.equal(s.seen[0].bodyText.includes(hidden),false);assert.equal(s.seen[0].bodyText.includes(secret),false);
 assert.equal(r.preview.rows[0].state,'REVIEW_REQUIRED');assert.equal(r.decisionAuthority,'NONE');assert.equal(JSON.parse(o.draftText).bindings.length,0);
 const selectionText=JSON.stringify({version:1,draftPin:o.draftPin,proposalPin:r.proposalPin,reviewedIds:['a_value']});
 const applied=await applyReviewedBindingSuggestions({draftText:o.draftText,draftPin:o.draftPin,proposalText:r.proposalText,proposalPin:r.proposalPin,selectionText,selectionPin:await casePin(selectionText)});
 assert.equal(applied.draft.bindings.length,1);assert.equal(applied.draft.bindings[0].start,JSON.parse(o.draftText).sources[0].text.lastIndexOf('12.50'));
});
test('guessed hidden source and malformed or duplicate output refuse, with no hidden text or raw error publication',async()=>{
 for(const response of [JSON.stringify({version:1,suggestions:[{...suggestion,sourceId:'hidden',quote:'88',before:'',after:';'}]}),'{"version":1,"version":1,"suggestions":[]}',JSON.stringify({version:1,suggestions:[],verified:true})]){
  const s=setup(()=>response),o=await options(s);await assert.rejects(execute(o),e=>e.code==='PROPOSAL_REFUSED'&&!e.message.includes(hidden));assert.equal(s.seen.length,1);
 }
});
test('timeout stops observing without retry or admitting a late provider result; pre-cancelled request does not dispatch',async()=>{
 const s=setup(()=>new Promise(()=>{})),o=await options(s,{timeoutMs:100});await assert.rejects(execute(o),/CANCELLED_OR_TIMEOUT/);assert.equal(s.seen.length,1);
 const t=setup(),ctrl=new AbortController();ctrl.abort();await assert.rejects(execute(await options(t,{signal:ctrl.signal})),/CANCELLED_OR_TIMEOUT/);assert.equal(t.seen.length,0);
});

// The fake transport returns an assistant JSON document with an escaped
// credential in a permitted field. The outer response scan alone cannot see it.
test('decoded model proposal credential echo refuses before review even when escaped',async()=>{
 const plain=JSON.stringify({version:1,suggestions:[{...suggestion,type:{...type,scope:secret}}]});
 const escaped=plain.replace(secret,'\\u0053'+secret.slice(1));
 assert.equal(escaped.includes(secret),false);assert.equal(JSON.parse(escaped).suggestions[0].type.scope,secret);
 const s=setup(()=>escaped),o=await options(s);
 await assert.rejects(execute(o),e=>e.code==='SECRET_ECHO'&&!e.message.includes(secret));assert.equal(s.seen.length,1);
});
test('credential in selected evidence refuses before plan publication or dispatch',async()=>{
 const s=setup(),base=await options(s),draft=JSON.parse(base.draftText);draft.sources[0].text+=' '+secret;
 const draftText=JSON.stringify(draft),o={...base,draftText,draftPin:await casePin(draftText)};
 await assert.rejects(previewBindingSuggestionRequest(o),e=>e.code==='SECRET_ECHO'&&!e.message.includes(secret));assert.equal(s.seen.length,0);
});
