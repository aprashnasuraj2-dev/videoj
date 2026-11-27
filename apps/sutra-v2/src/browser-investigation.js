import {createBrowserRunReceipt} from './browser-run-receipt.js';
import runtimeIdentity from '../../../packages/sutra-runtime/vendor/nsdeploy/UPSTREAM.json' with {type:'json'};
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';
import {admitReviewedAnswer} from '../../../packages/sutra-runtime/reviewed-answer.js';
import {prepareWorkspaceEvidence} from '../../../packages/sutra-runtime/workspace-evidence.js';
import {loadLocalNetwork,runNetwork,RuntimeError} from '../../../packages/sutra-runtime/index.js';
import {readBoundedResponse,isFullJson} from '../../../packages/sutra-runtime/bounded-response.js';
import {parseUniqueJson} from '../../../packages/sutra-runtime/strict-json.js';
import {createProviderAdapter} from '../../../packages/sutra-inference/client.js';
const GUIDE_ORIGIN='https://sutra-guide.aafnaipatro.com';
const peerLimits=Object.freeze({maxDepth:3,maxAgents:3,maxModelCalls:6,maxSteps:3,concurrency:1,timeoutMs:60000,maxOutputChars:12000});
const defaultLimits=Object.freeze({maxDepth:2,maxAgents:2,maxModelCalls:4,maxSteps:3,concurrency:1,timeoutMs:60000,maxOutputChars:12000});
const fail=code=>{throw Error(code);};
const validOrigin=origin=>{const u=new URL(origin);return u.origin===origin&&(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname));};
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');
export async function prepareBrowserInvestigation({origin,objective,selection,getSelection,peer=false,callerPeerUrl,fetchImpl=fetch,signal}={}){
 if(!validOrigin(origin)||typeof objective!=='string'||!objective.trim()||objective.length>1000)fail('BROWSER_PLAN_INPUT');
 const selected=selection===undefined?null:structuredClone(selection),evidence=selected?await prepareWorkspaceEvidence(selected):null;
 const current=()=>!selected||typeof getSelection==='function'&&JSON.stringify(getSelection())===JSON.stringify(selected);
 if(!current())fail('EVIDENCE_STALE');
 if(peer&&evidence||callerPeerUrl!==undefined&&!peer)fail('BROWSER_PLAN_INPUT');const limits=peer?peerLimits:defaultLimits;
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();const timer=setTimeout(abort,5000);
 let network,route,peerUrl=null;
 try{
  network=await loadLocalNetwork({baseUrl:origin+'/agents/',networkName:peer?'peer_investigation':evidence?'reviewed_investigation':'investigation',resolvePublishedLinks:peer,...(callerPeerUrl===undefined?{}:{callerLinkOverrides:{version:1,networks:{peer_investigation:{guide_peer:callerPeerUrl}}}}),allowWorkspaceEvidence:!!evidence,expectedOrigin:origin,fetchImpl,signal:controller.signal});
  if(network.frontMan!=='planner')fail('BROWSER_GRAPH');
  if(peer){const tools=network.definition.tools;if(tools.length!==1||tools[0].tools.length!==1||typeof tools[0].tools[0]!=='string')fail('BROWSER_GRAPH');const dest=new URL(tools[0].tools[0]);const local=u=>u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname);if(dest.pathname!=='/agents/checklist'||dest.search||dest.hash||dest.username||dest.password||dest.origin===origin||dest.origin!==GUIDE_ORIGIN&&!(local(new URL(origin))&&local(dest)))fail('BROWSER_PEER_DESTINATION');peerUrl=dest.href;}
  else if(network.definition.tools.length!==2||!network.definition.tools.some(a=>a.name==='critic'))fail('BROWSER_GRAPH');
  const {bytes}=await readBoundedResponse({url:origin+'/api/status',fetchImpl,signal:controller.signal,maxBytes:8192,init:{method:'GET',headers:{Accept:'application/json'}},inspect:r=>{if(!isFullJson(r))fail('BROWSER_ROUTER_UNAVAILABLE');return true;}});
  route=parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes),{maxChars:8192,maxDepth:16});
  if(route?.inference!=='configured'||route.routerBase!=='/api/v1'||route.publisherFunded!==true||route.byok!==false||!['hosted','self_hosted'].includes(route.backend)||route.provider!==undefined&&!(route.backend==='hosted'?['openai','gemini','groq','openrouter']:['self_hosted']).includes(route.provider)||typeof route.model!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(route.model)||route.model==='mock-1'||typeof route.inferenceContractId!=='string'||!/^[a-f0-9]{64}$/.test(route.inferenceContractId))fail('BROWSER_ROUTER_UNAVAILABLE');
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort();}
 const definition=structuredClone(network.definition),graphPin=await digest(definition),model=route.model,contract=route.inferenceContractId;
 const preview=Object.freeze({objective,model,router:origin+'/api/v1',provider:route.provider??'publisher_unspecified',backend:route.backend,inferenceContractId:contract,graphPin,artifactDigests:network.artifactDigests,runtimeCommit:runtimeIdentity.commit,network:network.name,front:network.frontMan,limits,...(evidence?{evidence}:{}),...(peerUrl?{peerUrl,peerBinding:callerPeerUrl===undefined?'publisher':'caller'}:{})});
 let consumed=false;
 return Object.freeze({preview,async run({signal,onEvent,decidePeer}={}){
  if(consumed)fail('BROWSER_PLAN_CONSUMED');consumed=true;
  let attempted=0,responses=0,inspector;
  try{
  const assertCurrent=()=>{if(signal?.aborted)fail('CANCELLED');if(!current())fail('EVIDENCE_STALE');};
  assertCurrent();
  const provider=createProviderAdapter({origin,model,fetchImpl:(url,init)=>{assertCurrent();if(url!==origin+'/api/v1/chat/completions')fail('BROWSER_ROUTER');attempted++;return fetchImpl(url,{...init,headers:{...init.headers,'X-Sutra-Inference-Contract':contract}});}});
  let groundedRead=false;
  const observe=event=>{if(evidence&&event.kind==='tool'&&event.phase==='end'&&event.tool==='mcp_inspect_evidence'&&event.status==='ok')groundedRead=true;onEvent?.(event);};
  const adapter=Object.freeze({...provider,async chat(input){assertCurrent();try{
   const response=await provider.chat(input);responses++;assertCurrent();
   if(evidence)for(const call of response.toolCalls??[]){
    if(call.function?.name!=='critic')continue;
    // Grounded critique must follow the actual read, not a model assertion
    // that evidence was read. The critic must see the exact selected quote.
    let args;try{args=parseUniqueJson(call.function.arguments,{maxChars:8000,maxDepth:16});}catch{throw new RuntimeError('EVIDENCE_CRITIC_ARGUMENTS','Critique arguments invalid.');}
    if(!groundedRead||typeof args?.request!=='string'||!args.request.includes(evidence.quote))throw new RuntimeError('EVIDENCE_CRITIC_UNGROUNDED','Critique requires a completed approved span read and its exact quote.');
   }
   return response;
  }catch(error){assertCurrent();throw error;}}});
  const request=evidence?objective+'\nApproved evidence coordinates: '+JSON.stringify({sourceId:evidence.sourceId,start:evidence.start,end:evidence.end}):objective;
  if(peerUrl){if(typeof decidePeer!=='function')fail('BROWSER_PEER_CONSENT');const peerOrigin=new URL(peerUrl).origin;inspector=createConsentInspector({decide(contact,options){const expected=contact.kind==='peer_manifest'?'/agents/agent-manifest.json':contact.kind==='peer_graph'?'/agents/checklist.network.json':null;if(!expected||contact.origin!==peerOrigin||contact.resource!==peerOrigin+expected||contact.network!=='checklist')return 'deny';return decidePeer(contact,options);},onEvent:e=>onEvent?.({kind:'peer_consent',phase:e.type,status:e.decision??e.status,origin:e.origin})});}
  const result=await runNetwork({definition,name:network.name,frontMan:network.frontMan,request,model:adapter,limits,signal,onEvent:observe,...(evidence?{workspaceEvidence:{selection:selected,assertCurrent:current}}:{}),...(inspector?{peerRuntime:{inspector,fetchImpl}}:{})});
  assertCurrent();
  if(evidence){
   const reads=result.events.filter(e=>e.kind==='tool'&&e.phase==='end'&&e.tool==='mcp_inspect_evidence'&&e.status==='ok');
   const readIndex=result.events.indexOf(reads[0]),criticIndex=result.events.findIndex(e=>e.kind==='agent'&&e.phase==='start'&&e.agent==='critic');
   if(reads.length!==1||criticIndex<=readIndex)fail('BROWSER_EVIDENCE_MISSING');
  }
  if(peerUrl){const origin=new URL(peerUrl).origin;if(!['checklist','source_select'].every(agent=>result.events.some(e=>e.kind==='agent'&&e.phase==='end'&&e.agent===agent&&e.origin===origin&&e.status==='ok')))fail('BROWSER_PEER_DELEGATION_MISSING');}
  else if(!result.events.some(e=>e.kind==='agent'&&e.phase==='end'&&e.agent==='critic'&&e.status==='ok'))fail('BROWSER_DELEGATION_MISSING');
  const reviewed=evidence?admitReviewedAnswer(result.text,evidence):null;
  const receipt=createBrowserRunReceipt({preview,result,consentEvents:inspector?.exportEvents()??[]});
  return Object.freeze({receipt,text:reviewed?.text??result.text,...(reviewed?{claims:reviewed.claims}:{}),modelCalls:result.modelCalls,agentCalls:result.agentCalls,graphPin,qualification:peerUrl?'Candidate peer critique; peer graph executed in this browser using caller router; no verified external evidence.':evidence?'Candidate interpretation of one approved span; no empirical verification or new evidence acquisition.':'Candidate investigation plan only; no external evidence acquired or verified.'});
  }catch(error){
   const code=signal?.aborted?'CANCELLED':typeof error?.code==='string'&&/^[A-Z_]{1,60}$/.test(error.code)?error.code:typeof error?.message==='string'&&/^[A-Z_]{1,60}$/.test(error.message)?error.message:'BROWSER_RUN_FAILED';
   const safe=new RuntimeError(code,'Browser run stopped; no completed result is claimed.');
   safe.dispatch=Object.freeze({attempted,responses,outcome:attempted===0?'none_attempted':responses===attempted?'transport_completed':'outcome_unknown',billing:attempted?'unverified':'no_attempt'});
   throw safe;
  }finally{inspector?.clearSession();}
 }});
}
