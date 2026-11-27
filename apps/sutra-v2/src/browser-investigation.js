import {loadLocalNetwork,runNetwork} from '../../../packages/sutra-runtime/index.js';
import {readBoundedResponse,isFullJson} from '../../../packages/sutra-runtime/bounded-response.js';
import {parseUniqueJson} from '../../../packages/sutra-runtime/strict-json.js';
import {createProviderAdapter} from '../../../packages/sutra-inference/client.js';
const limits=Object.freeze({maxDepth:2,maxAgents:2,maxModelCalls:4,maxSteps:3,concurrency:1,timeoutMs:60000,maxOutputChars:12000});
const fail=code=>{throw Error(code);};
const validOrigin=origin=>{const u=new URL(origin);return u.origin===origin&&(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname));};
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');
export async function prepareBrowserInvestigation({origin,objective,fetchImpl=fetch,signal}={}){
 if(!validOrigin(origin)||typeof objective!=='string'||!objective.trim()||objective.length>1000)fail('BROWSER_PLAN_INPUT');
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();const timer=setTimeout(abort,5000);
 let network,route;
 try{
  network=await loadLocalNetwork({baseUrl:origin+'/agents/',networkName:'investigation',expectedOrigin:origin,fetchImpl,signal:controller.signal});
  if(network.frontMan!=='planner'||network.definition.tools.length!==2||!network.definition.tools.some(a=>a.name==='critic'))fail('BROWSER_GRAPH');
  const {bytes}=await readBoundedResponse({url:origin+'/api/status',fetchImpl,signal:controller.signal,maxBytes:8192,init:{method:'GET',headers:{Accept:'application/json'}},inspect:r=>{if(!isFullJson(r))fail('BROWSER_ROUTER_UNAVAILABLE');return true;}});
  route=parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes),{maxChars:8192,maxDepth:16});
  if(route?.inference!=='configured'||route.routerBase!=='/api/v1'||route.publisherFunded!==true||route.byok!==false||!['hosted','self_hosted'].includes(route.backend)||typeof route.model!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(route.model)||route.model==='mock-1'||typeof route.inferenceContractId!=='string'||!/^[a-f0-9]{64}$/.test(route.inferenceContractId))fail('BROWSER_ROUTER_UNAVAILABLE');
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort();}
 const definition=structuredClone(network.definition),graphPin=await digest(definition),model=route.model,contract=route.inferenceContractId;
 const preview=Object.freeze({objective,model,router:origin+'/api/v1',graphPin,network:network.name,front:network.frontMan,limits});
 let consumed=false;
 return Object.freeze({preview,async run({signal,onEvent}={}){
  if(consumed)fail('BROWSER_PLAN_CONSUMED');consumed=true;
  const adapter=createProviderAdapter({origin,model,fetchImpl:(url,init)=>{if(url!==origin+'/api/v1/chat/completions')fail('BROWSER_ROUTER');return fetchImpl(url,{...init,headers:{...init.headers,'X-Sutra-Inference-Contract':contract}});}});
  const result=await runNetwork({definition,name:network.name,frontMan:network.frontMan,request:objective,model:adapter,limits,signal,onEvent});
  if(!result.events.some(e=>e.kind==='agent'&&e.phase==='end'&&e.agent==='critic'&&e.status==='ok'))fail('BROWSER_DELEGATION_MISSING');
  return Object.freeze({text:result.text,modelCalls:result.modelCalls,agentCalls:result.agentCalls,graphPin,qualification:'Candidate investigation plan only; no external evidence acquired or verified.'});
 }});
}
