// Fixed public inference challenge, using the same pinned HTTPS transport as research.
import {lookup} from 'node:dns/promises';
import {randomBytes} from 'node:crypto';
import {createHostedModelExchange} from '../sutra-inference/hosted-model-exchange.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {MODEL_PROFILES} from './model-broker.js';
import {digest} from './research-session.js';
const fail=code=>{throw Object.assign(Error('Model smoke refused: '+code),{code});};
export const SMOKE_MODELS=Object.freeze({gemini:'gemini-3.5-flash-lite',groq:'openai/gpt-oss-20b',openrouter:'openrouter/free'});
const maxTokens=1024;
export function previewModelSmoke(selection=SMOKE_MODELS){
 if(!selection||Object.getPrototypeOf(selection)!==Object.prototype||Object.keys(selection).length<1||Object.keys(selection).length>3||Object.entries(selection).some(([v,m])=>!Object.hasOwn(SMOKE_MODELS,v)||typeof m!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(m)))fail('MODEL_SELECTION');
 const ids=Object.keys(selection);
 const plan={schema:'sutra-live-model-smoke/v1',providers:ids.map(vendor=>({vendor,endpoint:MODEL_PROFILES[vendor].endpoint,model:selection[vendor],maxOutputTokens:maxTokens})),maxRequests:ids.length,deadlineSeconds:75,promptPolicy:'synthetic random challenge only; no user data',costPolicy:'up to one bounded inference per provider; provider billing may apply'};
 return {...plan,planPin:digest(JSON.stringify(plan))};
}
export async function runModelSmoke({approvedPlanPin,approveProviderContact,approveEstimatedCost,credentials={},selection=SMOKE_MODELS,signal,exchangeFactory,resolveAll=async h=>(await lookup(h,{all:true,verbatim:true})).map(({address,family})=>({address,family}))}={}){
 const plan=previewModelSmoke(selection),ids=plan.providers.map(p=>p.vendor);
 if(approvedPlanPin!==plan.planPin||approveProviderContact!==true||approveEstimatedCost!==true)fail('APPROVAL');
 if(ids.some(v=>typeof credentials[v]!=='string'||!/^[\x21-\x7e]{8,512}$/.test(credentials[v])))fail('MODEL_CREDENTIAL');
 const active=signal?AbortSignal.any([signal,AbortSignal.timeout(75000)]):AbortSignal.timeout(75000);
 const routes=ids.map(v=>({connectionId:v,endpoint:MODEL_PROFILES[v].endpoint,protocol:MODEL_PROFILES[v].protocol,authMode:'bearer',models:[selection[v]]}));
 const host=(exchangeFactory??createHostedModelExchange)({routes,resolveAll,deadlineMs:20000}),checks=[];
 try{
  for(const vendor of ids){
   if(active.aborted){checks.push({vendor,status:'not_attempted',reason:'CANCELLED'});continue;}
   const model=selection[vendor],challenge=randomBytes(8).toString('hex'),start=performance.now();
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
    checks.push({vendor,model,status:'passed',durationMs:Math.round(performance.now()-start),reportedOutputTokens:tokens,...(typeof data.model==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(data.model)?{reportedModel:data.model}:{}),responseDigest:digest(raw.bodyText)});
   }catch(e){checks.push({vendor,model,status:'failed',reason:typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'PROVIDER_FAILURE'});}
  }
  return {schema:plan.schema,mode:exchangeFactory?'injected_fixture':'credentialed_live_transport',planPin:plan.planPin,checkedAt:new Date().toISOString(),status:checks.length===ids.length&&checks.every(c=>c.status==='passed')?'passed':'failed',checks,qualification:'Successful inference challenges only; not live web search, research synthesis quality, source independence, or a billing guarantee. OpenRouter free routing does not pin an underlying model.'};
 }finally{host.close();}
}
