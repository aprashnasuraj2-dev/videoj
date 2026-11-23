import {createSourceMcp} from './source-mcp.js';
import {fetchJsonWithConsent} from '../sutra-consent/index.js';
import {AgentNetwork, validateNetwork, isExternalAgent, isMcpTool, parseExternalAgent} from './vendor/nsdeploy/kernel.js';
import {runAgent} from './vendor/nsdeploy/runner.js';
import {checkSchema, validateData} from './vendor/nsdeploy/actions.js';
import {TraceBus} from './vendor/nsdeploy/trace.js';

export class RuntimeError extends Error {
  constructor(code,message){super(message);this.name='RuntimeError';this.code=code;}
}
const fail=(code,message)=>{throw new RuntimeError(code,message);};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const allowed=(object,keys,where)=>{for(const key of Object.keys(object))if(!keys.includes(key))fail('UNSUPPORTED_FIELD',`Unsupported ${where} field.`);};
const idPattern=/^[A-Za-z][A-Za-z0-9_]{0,59}$/;
const defaults=Object.freeze({maxDepth:3,maxAgents:12,maxModelCalls:8,maxSteps:8,concurrency:2,timeoutMs:60000,maxOutputChars:16000,maxRemoteCalls:2,maxCallsPerPeer:1});
export function executionLimits(input={}){
 if(!plain(input))fail('LIMIT_CONFIG','Limits must be an object.');
 const out={...defaults};
 for(const [key,value] of Object.entries(input)){
  if(!(key in defaults)||!Number.isInteger(value)||value<1||value>defaults[key])fail('LIMIT_CONFIG','Execution limits must be finite and within runtime maxima.');
  out[key]=value;
 }
 return Object.freeze(out);
}
// Inspect data descriptors before stringify so accessors/toJSON cannot execute as publication data.
function assertJsonData(value,ancestors=new Set(),depth=0){
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){if(!Number.isFinite(value))fail('NETWORK_DATA','Only finite JSON numbers are supported.');return;}
 if(typeof value!=='object'||!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)fail('NETWORK_DATA','Only plain JSON data is supported.');
 if(depth>20||ancestors.has(value))fail('NETWORK_DATA','Network data is too deep or cyclic.');
 const keys=Reflect.ownKeys(value);if(keys.length>4096)fail('NETWORK_DATA','Network object is too large.');
 ancestors.add(value);
 for(const key of keys){
  if(Array.isArray(value)&&key==='length')continue;
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))fail('NETWORK_DATA','Executable or unsafe data property.');
  assertJsonData(descriptor.value,ancestors,depth+1);
 }
 ancestors.delete(value);
}

// The current profile deliberately accepts local declarative agents only.
// Peer/MCP/action/code loading must be integrated with consent in later phases.
export function compileNetwork(definition,{name='learner',frontMan='learner',limits={},allowSourceTools=false,allowPeerNetworks=false,allowMcp=false}={}){
 const bounds=executionLimits(limits);
 assertJsonData(definition);
 let json;
 try{json=JSON.stringify(definition,(key,value)=>{if(['function','symbol','bigint','undefined'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))fail('NETWORK_DATA','Only finite JSON values are supported.');return value;});}catch{fail('NETWORK_DATA','Network must be finite JSON data.');}
 if(!json||new TextEncoder().encode(json).length>65536)fail('NETWORK_SIZE','Network exceeds the 64 KiB data limit.');
 let raw;
 try{raw=JSON.parse(json,(key,value)=>{if(['__proto__','constructor','prototype'].includes(key))fail('NETWORK_DATA','Unsafe data key.');return value;});}catch(error){if(error instanceof RuntimeError)throw error;fail('NETWORK_DATA','Invalid network data.');}
 if(!plain(raw))fail('NETWORK_DATA','Network must be an object.');
 allowed(raw,['metadata','tools','llm_config','max_steps'],'network');
 if(!idPattern.test(name)||!idPattern.test(frontMan))fail('NETWORK_ID','Invalid network/front identity.');
 if(!plain(raw.metadata)||typeof raw.metadata.description!=='string'||raw.metadata.description.length>2000)fail('METADATA','Network needs a bounded description.');
 if(!Array.isArray(raw.tools)||raw.tools.length<1||raw.tools.length>32)fail('AGENTS','Network requires one to 32 agents.');
 const names=new Set();
 for(const agent of raw.tools){
  if(!plain(agent))fail('AGENT','Invalid agent object.');
  allowed(agent,['name','function','instructions','tools','llm_config','max_steps'],'agent');
  if(!idPattern.test(agent.name)||['constructor','prototype','__proto__'].includes(agent.name)||names.has(agent.name))fail('AGENT_NAME','Invalid or duplicate agent name.');
  names.add(agent.name);
  if(typeof agent.instructions!=='string'||!agent.instructions.trim()||agent.instructions.length>12000)fail('INSTRUCTIONS','Agent needs bounded public instructions.');
  if(!plain(agent.function)||typeof agent.function.description!=='string'||!agent.function.description.trim())fail('FUNCTION','Callable agent needs a description.');
  allowed(agent.function,['description','parameters'],'function');
  try{checkSchema(agent.function.parameters);}catch{fail('SCHEMA','Unsupported or malformed invocation schema.');}
  if(agent.function.parameters.type!=='object'||agent.function.parameters.additionalProperties!==false)fail('SCHEMA','Invocation schema must reject extra object fields.');
  if(!Array.isArray(agent.tools)||agent.tools.length>16||agent.tools.some(ref=>typeof ref!=='string'&&!(allowSourceTools===true&&plain(ref)&&Object.keys(ref).length===1&&ref.url==='/api/source-tools')))fail('TOOLS','Agent needs a bounded local tool list.');
  if(new Set(agent.tools.map(r=>JSON.stringify(r))).size!==agent.tools.length)fail('TOOLS','Duplicate local references are unsupported.');
  const steps=agent.max_steps??raw.max_steps??bounds.maxSteps;
  if(!Number.isInteger(steps)||steps<1||steps>bounds.maxSteps)fail('STEPS','Invalid or over-budget step count.');
  agent.max_steps=steps;
  if(agent.llm_config!==undefined){if(!plain(agent.llm_config))fail('MODEL','Invalid model hints.');allowed(agent.llm_config,['model_name'],'model');if(typeof agent.llm_config.model_name!=='string')fail('MODEL','Invalid model hint.');}
 }
 if(raw.llm_config!==undefined){if(!plain(raw.llm_config))fail('MODEL','Invalid network model hints.');allowed(raw.llm_config,['model_name'],'model');if(typeof raw.llm_config.model_name!=='string')fail('MODEL','Invalid model hint.');}
 for(const agent of raw.tools)for(const ref of agent.tools)if(typeof ref==='string'&&!names.has(ref))fail('REFERENCE','External or missing capabilities are unavailable in this local profile.');
 const byName=new Map(raw.tools.map(a=>[a.name,a]));
 function visit(name,chain=[]){
  if(chain.includes(name))fail('CYCLE','Composition cycle rejected before execution.');
  if(chain.length>=bounds.maxDepth)fail('DEPTH','Composition depth exceeds runtime policy.');
  for(const ref of byName.get(name).tools)if(typeof ref==='string')visit(ref,[...chain,name]);
 }
 for(const agent of raw.tools)visit(agent.name);
 const network=new AgentNetwork(raw,name);
 if(!names.has(frontMan)||network.findFrontMan()!==frontMan)fail('FRONT','Published front must exactly match the canonical first agent.');
 if(validateNetwork(network).errors.length)fail('VALIDATION','Reference kernel rejected the network.');
 return {network,name,frontMan,limits:bounds};
}

// Model adapters are explicitly injected; there is no keyless automatic mock fallback.
// A scripted-test adapter is only a test driver, not a live inference service.
function validateExternalHost(external){
 if(external===undefined)return null;
 if(!plain(external)||!external.inspector||typeof external.inspector.authorize!=='function')fail('EXTERNAL_CONFIG','External capability use requires the consent inspector.');
 let base;
 try{base=new URL(external.baseOrigin);}catch{fail('EXTERNAL_CONFIG','External capability use requires an absolute caller base origin.');}
 const loopback=['localhost','127.0.0.1','[::1]'].includes(base.hostname);
 if(base.origin!==external.baseOrigin||base.username||base.password||base.pathname!=='/'||base.search||base.hash||base.protocol!=='https:'&&!(base.protocol==='http:'&&loopback))fail('EXTERNAL_CONFIG','Caller base origin must be an exact HTTPS origin (loopback HTTP for development).');
 if(external.fetchImpl!==undefined&&typeof external.fetchImpl!=='function')fail('EXTERNAL_CONFIG','External artifact fetch implementation must be callable.');
 if(external.resolveMcp!==undefined&&typeof external.resolveMcp!=='function')fail('EXTERNAL_CONFIG','MCP resolver must be callable.');
 return {...external,baseOrigin:base.origin};
}
function mcpOrigins(network,baseOrigin){
 const map=new Map();
 for(const agent of network.config.tools||[])for(const ref of agent.tools||[]){
  if(network.classifyTool(ref).kind!=='mcp')continue;
  const raw=typeof ref==='string'?ref:ref?.url;
  let url;try{url=new URL(raw,baseOrigin);}catch{fail('MCP_ORIGIN','Invalid MCP destination.');}
  const prior=map.get(url.host);if(prior&&prior!==url.origin)fail('MCP_ORIGIN','Ambiguous MCP destination origin.');
  map.set(url.host,url.origin);
 }
 return map;
}
function safePeerFailure(error){
 const code=error?.code;
 if(code==='CONSENT_DENIED')return new RuntimeError('PEER_CONSENT_DENIED','Peer contact was denied before the requested public artifact was retrieved.');
 if(code==='NETWORK_MATCH')return new RuntimeError('PEER_NETWORK_MATCH','Peer load failed: the requested exact network name is not published exactly once.');
 if(code==='MANIFEST')return new RuntimeError('PEER_MANIFEST','Peer load failed: the public manifest is malformed or incomplete.');
 if(['CONTACT_RESPONSE','CONTACT_JSON','CONTACT_SIZE','CONTACT_FETCH','CONTACT_REDIRECT','ARTIFACT_URL','ARTIFACT_ORIGIN','CYCLE','REFERENCE','VALIDATION','FRONT'].includes(code))return new RuntimeError('PEER_ARTIFACT','Peer load failed: the declared public network artifact is unavailable or invalid.');
 if(code==='ARTIFACT_TIMEOUT'||code==='CANCELLED')return new RuntimeError(code,'Peer load stopped before a usable network was established.');
 return new RuntimeError('PEER_UNAVAILABLE','Peer load failed before a usable network was established.');
}
function validateMcpClient(client,ref){
 if(!client||typeof client.listTools!=='function'||typeof client.callTool!=='function')fail('MCP_CLIENT','MCP resolver returned an invalid client.');
 const raw=typeof ref==='string'?ref:ref.url;const endpoint=new URL(raw);
 const allowNames=plain(ref)&&Array.isArray(ref.tools)?new Set(ref.tools):null;
 return {
  url:endpoint.href,
  async listTools(parentSpan){
   const tools=await client.listTools(parentSpan);
   if(!Array.isArray(tools)||tools.length>32)fail('MCP_CLIENT','MCP discovery returned an invalid tool list.');
   const out=[];
   for(const tool of tools){
    if(!plain(tool)||!idPattern.test(tool.name)||typeof tool.description!=='string'||!plain(tool.inputSchema))fail('MCP_CLIENT','MCP discovery returned an invalid tool definition.');
    try{checkSchema(tool.inputSchema);}catch{fail('MCP_CLIENT','MCP tool schema is unsupported.');}
    if(allowNames&&!allowNames.has(tool.name))continue;
    out.push(structuredClone(tool));
   }
   if(allowNames&&out.length!==allowNames.size)fail('MCP_CLIENT','One or more declared MCP tools were not discovered exactly.');
   return out;
  },
  async callTool(name,args,parentSpan){
   if(allowNames&&!allowNames.has(name))fail('MCP_CLIENT','Undeclared MCP tool call refused.');
   return client.callTool(name,args,parentSpan);
  }
 };
}

export async function runNetwork({definition,name='learner',frontMan='learner',request,model,limits={},signal,onEvent,sourceTools,external}={}){
 const host=validateExternalHost(external);
 const compiled=compileNetwork(definition,{name,frontMan,limits,allowSourceTools:!!sourceTools,allowPeerNetworks:!!host,allowMcp:!!host?.resolveMcp});
 if(typeof request!=='string'||!request.trim()||request.length>2000)fail('REQUEST','A nonempty request up to 2000 characters is required.');
 if(!model||typeof model.chat!=='function'||!['scripted-test','provider'].includes(model.mode))fail('MODEL_UNAVAILABLE','No configured model adapter; live inference is not connected.');
 if(signal?.aborted)fail('CANCELLED','Run cancelled before model execution.');
 const bounds=compiled.limits,controller=new AbortController();
 const aborted=()=>controller.abort(signal?.reason??new RuntimeError('CANCELLED','Run cancelled.'));
 if(signal?.aborted)aborted();else signal?.addEventListener('abort',aborted,{once:true});
 const trace=new TraceBus(),events=[];let modelCalls=0,active=0,totalOutput=0,failure=null,closed=false;const waiters=[];
 const check=()=>{if(closed)fail('CLOSED','Run is closed.');if(controller.signal.aborted)throw controller.signal.reason;};
 const emit=event=>{const safe={phase:event.phase,kind:event.kind};for(const key of ['id','parent','status','agent','tool','origin','network'])if(typeof event[key]==='string')safe[key]=event[key].slice(0,160);if(events.length<512)events.push(safe);try{onEvent?.(safe);}catch{ /* Viewer callbacks never own execution policy. */ }};
 trace.addEventListener('event',e=>emit(e.detail));
 const abortWaiters=()=>{for(const wake of waiters.splice(0))wake();};controller.signal.addEventListener('abort',abortWaiters);
 const deadline=setTimeout(()=>controller.abort(new RuntimeError('TIMEOUT','Run exceeded its elapsed time limit.')),bounds.timeoutMs);
 let rejectAbort;
 const stopped=new Promise((_,reject)=>{rejectAbort=()=>reject(controller.signal.reason);controller.signal.addEventListener('abort',rejectAbort,{once:true});if(controller.signal.aborted)rejectAbort();});
 stopped.catch(()=>{});
 const guardedModel={chat:async args=>{
  check();if(modelCalls>=bounds.maxModelCalls)fail('MODEL_LIMIT','Model-call budget exceeded.');modelCalls++;
  while(active>=bounds.concurrency){await new Promise(resolve=>waiters.push(resolve));check();}
  active++;const span=trace.start('model_call',{mode:model.mode,parent:args.parentSpan});
  try{
   check();
   const response=await Promise.race([model.chat({...args,signal:controller.signal,onContentDelta:undefined}),stopped]);check();
   if(!plain(response)||typeof response.content!=='string'||!Array.isArray(response.toolCalls)||response.toolCalls.length>bounds.concurrency)fail('MODEL_RESPONSE','Malformed or excessive model result.');
   totalOutput+=response.content.length;
   if(totalOutput>bounds.maxOutputChars)fail('OUTPUT_LIMIT','Model output budget exceeded.');
   const ids=new Set();
   for(const call of response.toolCalls){
    if(!plain(call)||typeof call.id!=='string'||!call.id||call.id.length>100||ids.has(call.id)||call.type!=='function'||!plain(call.function))fail('TOOL_CALL','Invalid tool call.');ids.add(call.id);
    const schema=args.tools.find(t=>t.function.name===call.function.name)?.function.parameters;
    if(!schema)fail('TOOL_UNAVAILABLE','Model requested an unavailable tool.');
    if(typeof call.function.arguments!=='string'||call.function.arguments.length>8000)fail('ARGUMENTS','Tool arguments exceed the data limit.');
    try{validateData(schema,JSON.parse(call.function.arguments));}catch{fail('ARGUMENTS','Tool arguments failed the declared invocation schema.');}
   }
   trace.end(span,{status:'ok'});return response;
  }catch(error){failure=error;controller.abort(error);trace.fail(span,new Error('Model or tool boundary failed.'));throw error;}
  finally{active--;waiters.shift()?.();}
 }};
 const composition={remoteCalls:0,peerCalls:new Map(),maxRemoteCalls:host?bounds.maxRemoteCalls:0,maxCallsPerPeer:host?bounds.maxCallsPerPeer:0,agentCalls:0,maxAgentCalls:bounds.maxAgents,deadlineSeconds:bounds.timeoutMs/1000,deadline:Date.now()+bounds.timeoutMs};
 const unavailable=()=>fail('CAPABILITY_UNAVAILABLE','External capabilities are disabled in this runtime profile.');
 try{
  const rawSourceClient=sourceTools?createSourceMcp({...sourceTools,signal:controller.signal}):null;
  const guardSource=method=>async(...args)=>{check();try{return await rawSourceClient[method](...args);}catch{const error=new RuntimeError('CAPABILITY_UNAVAILABLE','Source retrieval failed; no completed source result is claimed.');failure=error;controller.abort(error);throw error;}};
  const sourceClient=rawSourceClient?{url:(sourceTools?.origin??host?.baseOrigin??'https://sutra.invalid')+'/api/source-tools',listTools:guardSource('listTools'),callTool:guardSource('callTool')}:null;
  const discoveredMcpOrigins=host?mcpOrigins(compiled.network,host.baseOrigin):new Map();
  const requestConsent=async intent=>{
   if(intent?.kind==='network')return 'allow'; // resolveRemote performs the real manifest/graph approvals immediately before fetch.
   if(intent?.kind!=='mcp'||!host?.inspector)return 'decline';
   const origin=discoveredMcpOrigins.get(intent.peerOrigin);
   if(!origin)fail('MCP_ORIGIN','MCP consent destination could not be resolved exactly.');
   const phase=intent.phase==='call'?'call':'discover';
   try{
    await host.inspector.authorize({
     origin,
     kind:phase==='call'?'mcp_call':'mcp_discovery',
     purpose:phase==='call'?'Call an explicitly discovered third-party MCP tool':'Discover the explicitly declared third-party MCP tools',
     disclosure:phase==='call'?['tool arguments']:['tool names','tool schemas'],
     network:compiled.name
    });
    return 'allow';
   }catch(error){
    if(error?.code==='CONSENT_DENIED')return 'decline';
    throw error;
   }
  };
  const resolveMcp=sourceClient?async ref=>{check();if(ref?.url==='/api/source-tools')return sourceClient;if(!host?.resolveMcp)return unavailable();return validateMcpClient(await host.resolveMcp(ref),ref);}:host?.resolveMcp?async ref=>{check();return validateMcpClient(await host.resolveMcp(ref),ref);}:unavailable;
  const resolveRemote=host?async(peerUrl,chain,parentSpan)=>{
   check();
   let loaded;
   try{loaded=await loadPeerNetwork({peerUrl,inspector:host.inspector,fetchImpl:host.fetchImpl??fetch,signal:controller.signal,timeoutMs:Math.min(5000,bounds.timeoutMs)});}
   catch(error){throw safePeerFailure(error);}
   const peerCompiled=compileNetwork(loaded.definition,{name:loaded.name,frontMan:loaded.frontMan,limits:bounds});
   const parsed=parseExternalAgent(peerUrl,host.baseOrigin),key=`${parsed.origin}::${parsed.agentName}`;
   return {
    async invoke(envelope,{chain:parentChain=[]}={}){
     check();
     const peerCtx={
      network:peerCompiled.network,frontMan:peerCompiled.frontMan,baseOrigin:loaded.origin,displayOrigin:loaded.origin,
      llm:guardedModel,trace,composition,slyData:plain(envelope?.sly_data)?{...envelope.sly_data}:{},history:[],isTop:false,
      mock:model.mode==='scripted-test',apiKey:'',defaultModel:'fixture-only',modelOverride:'',resolveRemote:unavailable,
      resolveMcp:unavailable,resolveLink:unavailable,requestConsent:async()=> 'decline'
     };
     return runAgent(peerCtx,peerCompiled.frontMan,String(envelope?.user_message?.text??''),parentSpan,[...parentChain,key]);
    }
   };
  }:unavailable;
  const ctx={network:compiled.network,frontMan:compiled.frontMan,baseOrigin:host?.baseOrigin??sourceTools?.origin??'https://sutra.invalid',displayOrigin:'sutra-local',llm:guardedModel,trace,composition,slyData:{},history:[],isTop:true,mock:model.mode==='scripted-test',apiKey:'',defaultModel:'fixture-only',modelOverride:'',resolveRemote,resolveMcp,resolveLink:unavailable,requestConsent};
  check();const result=await Promise.race([runAgent(ctx,frontMan,request,null,[]),stopped]);check();if(failure)throw failure;
  if(!result.text||events.some(e=>e.kind==='composition_limit'))fail('INCOMPLETE','Execution stopped before a complete answer.');
  return {text:result.text,mode:model.mode,modelCalls,agentCalls:composition.agentCalls,remoteCalls:composition.remoteCalls,events};
 }catch(error){if(error instanceof RuntimeError)throw error;if(controller.signal.aborted&&controller.signal.reason instanceof RuntimeError)throw controller.signal.reason;fail('RUN_FAILED','Runtime execution failed; no completed result is claimed.');}
 finally{closed=true;clearTimeout(deadline);signal?.removeEventListener('abort',aborted);controller.signal.removeEventListener('abort',rejectAbort);controller.signal.removeEventListener('abort',abortWaiters);abortWaiters();}
}

// Same-origin publication loader for the restricted local profile. Cross-origin
// loading is deliberately refused until the consent-aware peer loader is shipped.
async function loadLocalNetworkData({baseUrl,networkName='learner',expectedOrigin,fetchImpl=fetch,signal,allowSourceTools=false}={}){
 let base;
 try{base=new URL(baseUrl);}catch{fail('ARTIFACT_URL','Use a complete agent site-base URL.');}
 const loopback=['localhost','127.0.0.1','[::1]'].includes(base.hostname);
 if(base.origin!==expectedOrigin||base.username||base.password||base.search||base.hash||base.protocol!=='https:'&&!(base.protocol==='http:'&&loopback))fail('ARTIFACT_ORIGIN','Only the approved same-origin HTTPS site base is available (loopback HTTP for development).');
 if(!idPattern.test(networkName))fail('NETWORK_ID','Invalid exact network name.');
 if(!base.pathname.endsWith('/'))base.pathname+='/';
 async function read(url,maxBytes){
  let response;
  try{response=await fetchImpl(url.href,{credentials:'omit',redirect:'error',cache:'no-store',signal,headers:{Accept:'application/json'}});}catch{if(signal?.aborted)fail('CANCELLED','Artifact load cancelled.');fail('ARTIFACT_FETCH','Public artifact could not be fetched.');}
  if(!response.ok||!response.headers.get('content-type')?.toLowerCase().includes('application/json'))fail('ARTIFACT_RESPONSE','Artifact must return successful JSON, not an HTML fallback.');
  if(response.url&&new URL(response.url).origin!==expectedOrigin)fail('ARTIFACT_ORIGIN','Unexpected artifact response origin.');
  const reader=response.body?.getReader();if(!reader)fail('ARTIFACT_RESPONSE','Artifact body unavailable.');
  let bytes=0;const chunks=[];
  try{for(;;){signal?.throwIfAborted();const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes)fail('ARTIFACT_SIZE','Artifact exceeds the published data limit.');chunks.push(value);}}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const data=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));}catch{fail('ARTIFACT_JSON','Artifact is not valid UTF-8 JSON.');}
 }
 const manifest=await read(new URL('agent-manifest.json',base),16384);
 if(!plain(manifest)||!Array.isArray(manifest.networks)||manifest.networks.length>32)fail('MANIFEST','Invalid public network index.');
 const matching=manifest.networks.filter(entry=>plain(entry)&&entry.name===networkName);
 if(matching.length!==1)fail('NETWORK_MATCH','Exactly one matching published network is required.');
 const entry=matching[0];
 if(typeof entry.hocon!=='string'||!entry.hocon||typeof entry.front_man!=='string')fail('MANIFEST','Network entry lacks its declared data artifact or front.');
 let graphUrl;
 try{graphUrl=new URL(entry.hocon,base);}catch{fail('ARTIFACT_URL','Invalid declared graph URL.');}
 if(graphUrl.origin!==expectedOrigin||graphUrl.username||graphUrl.password||graphUrl.hash)fail('ARTIFACT_ORIGIN','External data requires the future consent-aware loader.');
 // No executable site modules, coded bundles or inference metadata are acted on.
 if(manifest.coded_tools||manifest.actions)fail('UNSUPPORTED_CAPABILITY','Executable publication metadata is disabled in the local profile.');
 const definition=await read(graphUrl,65536);
 compileNetwork(definition,{name:entry.name,frontMan:entry.front_man,allowSourceTools});
 return {definition,name:entry.name,frontMan:entry.front_man,artifacts:{manifest:new URL('agent-manifest.json',base).href,definition:graphUrl.href}};
}

export async function loadLocalNetwork({signal,timeoutMs=5000,...options}={}){
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)fail('LIMIT_CONFIG','Artifact load timeout must be within 1–5000 ms.');
 if(signal?.aborted)fail('CANCELLED','Artifact loading cancelled.');
 const controller=new AbortController();
 const cancel=()=>controller.abort(new RuntimeError('CANCELLED','Artifact loading cancelled.'));
 signal?.addEventListener('abort',cancel,{once:true});
 let stop;const stopped=new Promise((_,reject)=>{stop=()=>reject(controller.signal.reason);controller.signal.addEventListener('abort',stop,{once:true});});
 stopped.catch(()=>{});
 const timer=setTimeout(()=>controller.abort(new RuntimeError('ARTIFACT_TIMEOUT','Artifact loading exceeded its time limit.')),timeoutMs);
 try{return await Promise.race([loadLocalNetworkData({...options,signal:controller.signal}),stopped]);}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);controller.signal.removeEventListener('abort',stop);controller.abort();}
}


function parsePeerNetworkReference(peerUrl){
 let target;
 try{target=new URL(peerUrl);}catch{fail('PEER_URL','Peer network URL must be absolute.');}
 const loopback=['localhost','127.0.0.1','[::1]'].includes(target.hostname);
 if(target.username||target.password||target.search||target.hash||target.protocol!=='https:'&&!(target.protocol==='http:'&&loopback))fail('PEER_URL','Peer network URL must use approved HTTPS without credentials, query or fragment (loopback HTTP for development).');
 if(target.pathname.endsWith('/'))fail('PEER_URL','Peer network URL must end with the exact published network name, not a trailing slash.');
 const parts=target.pathname.split('/');const encodedName=parts.pop();
 let networkName;
 try{networkName=decodeURIComponent(encodedName);}catch{fail('PEER_URL','Peer network name has invalid encoding.');}
 if(!idPattern.test(networkName))fail('NETWORK_ID','Peer URL final path component is not a supported exact network name.');
 const basePath=parts.join('/')+'/';
 const base=new URL(basePath,target.origin);
 return {target,base,networkName};
}

async function loadPeerNetworkData({peerUrl,inspector,fetchImpl=fetch,signal,allowSourceTools=false}={}){
 const {base,networkName}=parsePeerNetworkReference(peerUrl);
 const manifestUrl=new URL('agent-manifest.json',base);
 const manifest=await fetchJsonWithConsent({
  inspector,
  contact:{origin:manifestUrl.origin,kind:'peer_manifest',purpose:'Resolve the exact published peer network',disclosure:['network name'],network:networkName},
  url:manifestUrl.href,fetchImpl,maxBytes:16384,signal
 });
 if(!plain(manifest)||!Array.isArray(manifest.networks)||manifest.networks.length<1||manifest.networks.length>32)fail('MANIFEST','Invalid public peer network index.');
 if(manifest.coded_tools||manifest.actions)fail('UNSUPPORTED_CAPABILITY','Executable peer publication metadata is disabled in this profile.');
 const matching=manifest.networks.filter(entry=>plain(entry)&&entry.name===networkName);
 if(matching.length!==1)fail('NETWORK_MATCH','Exactly one matching published peer network is required.');
 const entry=matching[0];
 if(typeof entry.hocon!=='string'||!entry.hocon||entry.hocon.length>2048||typeof entry.front_man!=='string')fail('MANIFEST','Peer network entry lacks its declared data artifact or front.');
 let graphUrl;
 try{graphUrl=new URL(entry.hocon,base);}catch{fail('ARTIFACT_URL','Invalid declared peer graph URL.');}
 const graphLoopback=['localhost','127.0.0.1','[::1]'].includes(graphUrl.hostname);
 if(graphUrl.username||graphUrl.password||graphUrl.hash||graphUrl.protocol!=='https:'&&!(graphUrl.protocol==='http:'&&graphLoopback))fail('ARTIFACT_ORIGIN','Declared peer graph must use approved HTTP(S) without credentials or fragment.');
 const definition=await fetchJsonWithConsent({
  inspector,
  contact:{origin:graphUrl.origin,kind:'peer_graph',purpose:'Retrieve the declared peer network definition',disclosure:['network name'],network:networkName},
  url:graphUrl.href,fetchImpl,maxBytes:65536,signal
 });
 compileNetwork(definition,{name:networkName,frontMan:entry.front_man,allowSourceTools});
 return {definition,name:networkName,frontMan:entry.front_man,artifacts:{manifest:manifestUrl.href,definition:graphUrl.href},origin:base.origin};
}

/**
 * Consent-aware data-only peer artifact loader for the Profile 0.3 URL convention.
 * It does not enable peer execution by itself. Manifest and graph retrieval are
 * separately approved contacts; redirects are fail-closed until redirect-policy
 * handling is implemented.
 */
export async function loadPeerNetwork({signal,timeoutMs=5000,...options}={}){
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)fail('LIMIT_CONFIG','Peer artifact load timeout must be within 1–5000 ms.');
 if(signal?.aborted)fail('CANCELLED','Peer artifact loading cancelled.');
 const controller=new AbortController();
 const cancel=()=>controller.abort(new RuntimeError('CANCELLED','Peer artifact loading cancelled.'));
 signal?.addEventListener('abort',cancel,{once:true});
 let stop;const stopped=new Promise((_,reject)=>{stop=()=>reject(controller.signal.reason);controller.signal.addEventListener('abort',stop,{once:true});});
 stopped.catch(()=>{});
 const timer=setTimeout(()=>controller.abort(new RuntimeError('ARTIFACT_TIMEOUT','Peer artifact loading exceeded its time limit.')),timeoutMs);
 try{return await Promise.race([loadPeerNetworkData({...options,signal:controller.signal}),stopped]);}
 catch(error){
  if(error instanceof RuntimeError||error?.name==='ConsentError')throw error;
  if(controller.signal.aborted&&controller.signal.reason instanceof RuntimeError)throw controller.signal.reason;
  fail('PEER_LOAD_FAILED','Peer artifact loading failed before a usable network was established.');
 } finally {
  clearTimeout(timer);signal?.removeEventListener('abort',cancel);controller.signal.removeEventListener('abort',stop);controller.abort();
 }
}
