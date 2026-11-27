// Fixed public inference challenge, using the same pinned HTTPS transport as research.
import {lookup} from 'node:dns/promises';
import {randomBytes} from 'node:crypto';
import {createHostedModelExchange} from '../sutra-inference/hosted-model-exchange.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {prepareWorkspaceEvidence,createWorkspaceEvidenceClient} from '../sutra-runtime/workspace-evidence.js';
import {admitReviewedAnswer} from '../sutra-runtime/reviewed-answer.js';
import {MODEL_PROFILES} from './model-broker.js';
import {digest,secretLike} from './research-session.js';
const fail=code=>{throw Object.assign(Error('Model smoke refused: '+code),{code});};
export const SMOKE_MODELS=Object.freeze({gemini:'gemini-3.5-flash-lite',groq:'openai/gpt-oss-20b',openrouter:'openrouter/free'});
const maxTokens=1024;
export function previewModelSmoke(selection=SMOKE_MODELS,{structured=false}={}){
 if(typeof structured!=='boolean')fail('MODEL_SELECTION');
 if(!selection||Object.getPrototypeOf(selection)!==Object.prototype||Object.keys(selection).length<1||Object.keys(selection).length>3||Object.entries(selection).some(([v,m])=>!Object.hasOwn(SMOKE_MODELS,v)||typeof m!=='string'||secretLike(m)||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(m)))fail('MODEL_SELECTION');
 const ids=Object.keys(selection);
 const plan={schema:'sutra-live-model-smoke/v1',providers:ids.map(vendor=>({vendor,endpoint:MODEL_PROFILES[vendor].endpoint,model:selection[vendor],maxOutputTokens:maxTokens})),maxRequests:ids.length,deadlineSeconds:75,promptPolicy:'synthetic random challenge only; no user data',costPolicy:'up to one bounded inference per provider; provider billing may apply'};
 if(structured)Object.assign(plan,{schema:'sutra-live-structured-tool-smoke/v1',maxRequests:ids.length*2,deadlineSeconds:135,promptPolicy:'synthetic random evidence only; host-admitted JSON tool proposal, one exact local read, structured cited result; no user data',costPolicy:'up to two bounded inferences per provider; provider billing may apply'});
 return {...plan,planPin:digest(JSON.stringify(plan))};
}
export async function runModelSmoke({approvedPlanPin,approveProviderContact,approveEstimatedCost,credentials={},selection=SMOKE_MODELS,structured=false,signal,exchangeFactory,resolveAll=async h=>(await lookup(h,{all:true,verbatim:true})).map(({address,family})=>({address,family}))}={}){
 const plan=previewModelSmoke(selection,{structured}),ids=plan.providers.map(p=>p.vendor);
 if(approvedPlanPin!==plan.planPin||approveProviderContact!==true||approveEstimatedCost!==true)fail('APPROVAL');
 if(ids.some(v=>typeof credentials[v]!=='string'||!/^[\x21-\x7e]{8,512}$/.test(credentials[v])))fail('MODEL_CREDENTIAL');
 const timeout=AbortSignal.timeout(plan.deadlineSeconds*1000),active=signal?AbortSignal.any([signal,timeout]):timeout;
 const routes=ids.map(v=>({connectionId:v,endpoint:MODEL_PROFILES[v].endpoint,protocol:MODEL_PROFILES[v].protocol,authMode:'bearer',models:[selection[v]]}));
 const host=(exchangeFactory??createHostedModelExchange)({routes,resolveAll,deadlineMs:20000}),checks=[];
 try{
  for(const vendor of ids){
   if(active.aborted){checks.push({vendor,status:'not_attempted',reason:'CANCELLED'});continue;}
   const model=selection[vendor],challenge=randomBytes(8).toString('hex'),start=performance.now();
   if(structured){
    try{checks.push(await runStructuredProvider({host,vendor,model,credential:credentials[vendor],challenge,signal:active,start}));}
    catch(e){checks.push({vendor,model,status:'failed',reason:typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'STRUCTURED_TOOL_REFUSED'});}
    continue;
   }
   const bodyText=JSON.stringify({model,messages:[{role:'system',content:'Return exactly the requested JSON object, no markdown or other text.'},{role:'user',content:'Return {"challenge":"'+challenge+'","answer":42} as JSON. The answer must be the number 42.'}],max_tokens:maxTokens,stream:false});
   try{
    const raw=await host.exchange({connectionId:vendor,protocol:'openai-compatible-json',transportClass:'hosted',endpoint:MODEL_PROFILES[vendor].endpoint,model,credential:credentials[vendor],bodyText,maxOutputTokens:maxTokens},{signal:active});
    if(active.aborted)fail('CANCELLED');
    if(raw?.status!==200||typeof raw.bodyText!=='string'||Buffer.byteLength(raw.bodyText)>262144)fail('HTTP_RESPONSE');
    let data;try{data=parseUniqueJson(raw.bodyText,{maxChars:262144,maxDepth:32});}catch{fail('MODEL_RESPONSE');}
    const c=data?.choices?.[0],m=c?.message,tokens=data?.usage?.completion_tokens;
    if(data?.error!==undefined||!Array.isArray(data?.choices)||data.choices.length!==1||c.index!==0||c.finish_reason!=='stop'||m?.role!=='assistant'||typeof m.content!=='string'||m.content.length>4096||m.function_call!=null||m.tool_calls!=null&&(!Array.isArray(m.tool_calls)||m.tool_calls.length!==0)||!Number.isSafeInteger(tokens)||tokens<0||tokens>maxTokens)fail('MODEL_RESPONSE');
    let result;try{result=parseUniqueJson(m.content,{maxChars:4096,maxDepth:4});}catch{fail('MODEL_JSON');}
    if(!result||Object.keys(result).length!==2||result.challenge!==challenge||result.answer!==42)fail('CHALLENGE_MISMATCH');
    checks.push({vendor,model,status:'passed',durationMs:Math.round(performance.now()-start),reportedOutputTokens:tokens,...(typeof data.model==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(data.model)&&!secretLike(data.model)&&!Object.values(credentials).some(key=>typeof key==='string'&&key&&data.model.includes(key))?{reportedModel:data.model}:{}),responseDigest:digest(raw.bodyText)});
   }catch(e){checks.push({vendor,model,status:'failed',reason:typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'PROVIDER_FAILURE'});}
  }
  return {schema:plan.schema,mode:exchangeFactory?'injected_fixture':'credentialed_live_transport',planPin:plan.planPin,checkedAt:new Date().toISOString(),status:checks.length===ids.length&&checks.every(c=>c.status==='passed')?'passed':'failed',checks,qualification:structured?'Host-admitted JSON tool proposal and exact synthetic source read, followed by cited interpretation. Not a native function-call/browser graph test, live web search, empirical truth or billing guarantee. OpenRouter free routing does not pin an underlying model.':'Successful inference challenges only; not live web search, research synthesis quality, source independence, or a billing guarantee. OpenRouter free routing does not pin an underlying model.'};
 }finally{host.close();}
}

async function runStructuredProvider({host,vendor,model,credential,challenge,signal,start}){
 const sourceText='Synthetic challenge: '+challenge+'; not empirical evidence.',selection={sourceId:'synthetic_source',sourceText,start:0,end:sourceText.length},evidence=await prepareWorkspaceEvidence(selection);
 const client=createWorkspaceEvidenceClient({evidence,assertCurrent:()=>!signal.aborted,signal});
 const receipts=[];let outputTokens=0;
 async function ask(system,user){
  if(signal.aborted)fail('CANCELLED');
  const bodyText=JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content:user}],max_tokens:maxTokens,stream:false});
  const raw=await host.exchange({connectionId:vendor,protocol:'openai-compatible-json',transportClass:'hosted',endpoint:MODEL_PROFILES[vendor].endpoint,model,credential,bodyText,maxOutputTokens:maxTokens},{signal});
  if(signal.aborted)fail('CANCELLED');
  if(raw?.status!==200||typeof raw.bodyText!=='string'||Buffer.byteLength(raw.bodyText)>262144)fail('HTTP_RESPONSE');
  let data;try{data=parseUniqueJson(raw.bodyText,{maxChars:262144,maxDepth:32});}catch{fail('MODEL_RESPONSE');}
  const c=data?.choices?.[0],m=c?.message,tokens=data?.usage?.completion_tokens;
  if(data?.error!==undefined||!Array.isArray(data?.choices)||data.choices.length!==1||c.index!==0||c.finish_reason!=='stop'||m?.role!=='assistant'||typeof m.content!=='string'||m.content.length>12000||m.function_call!=null||m.tool_calls!=null&&(!Array.isArray(m.tool_calls)||m.tool_calls.length!==0)||!Number.isSafeInteger(tokens)||tokens<0||tokens>maxTokens||m.content.includes(credential))fail('MODEL_RESPONSE');
  receipts.push(digest(raw.bodyText));outputTokens+=tokens;return m.content;
 }
 const rawPlan=await ask('Propose the exact local tool invocation as JSON only. No markdown. Shape {"tool":"inspect_evidence","arguments":{"sourceId":"...","start":0,"end":1}}. Use actual supplied coordinates. No extra keys.',JSON.stringify({sourceId:selection.sourceId,start:selection.start,end:selection.end}));
 let plan;try{plan=parseUniqueJson(rawPlan,{maxChars:4096,maxDepth:6});}catch{fail('MODEL_JSON');}
 if(!plan||Object.keys(plan).length!==2||plan.tool!=='inspect_evidence'||!Object.hasOwn(plan,'arguments'))fail('TOOL_PROPOSAL');
 const result=await client.callTool(plan.tool,plan.arguments);
 const rawAnswer=await ask('Return JSON only: {"claims":[{"kind":"source_claim","text":"what the synthetic source says","citation":{"sourceId":"...","sourceDigest":"...","start":0,"end":1,"quote":"..."}},{"kind":"uncertainty","text":"why this is not empirical evidence","citation":null}]}. Cite the ENTIRE exact supplied quote and its absolute UTF-16 start/end. No extra keys.',result);
 const answer=admitReviewedAnswer(rawAnswer,evidence);
 if(!answer.claims.some(c=>c.kind==='source_claim'&&c.citation.quote===sourceText))fail('CHALLENGE_MISMATCH');
 return {vendor,model,status:'passed',durationMs:Math.round(performance.now()-start),reportedOutputTokens:outputTokens,modelRequests:2,toolReads:1,answerAdmission:'exact_synthetic_quote_and_uncertainty',responseDigests:receipts};
}
