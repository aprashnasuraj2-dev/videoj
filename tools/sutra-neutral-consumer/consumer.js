// Deliberately independent of the SUTRA host wrapper, learner and private APIs.
// Only the unchanged upstream kernel/runner is imported. Narrow JSON fixture profile.
import {AgentNetwork,validateNetwork} from './vendor/kernel.js';
import {runAgent} from './vendor/runner.js';
import {TraceBus} from './vendor/trace.js';
const $=id=>document.getElementById(id);
const safeName=/^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const fail=code=>{throw Error(code);};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const keys=(x,allow)=>plain(x)&&Object.keys(x).every(k=>allow.includes(k));
const approvedModel='consumer-owned-fixture';
let active=false;
function approval(url,kind){
 return new Promise(resolve=>{
  const d=$('approval');$('destination').textContent=kind+': '+url.href+' (public JSON GET only; no credentials or question)';
  function finish(value){d.close();$('allow').onclick=null;$('deny').onclick=null;d.oncancel=null;resolve(value);}
  $('allow').onclick=()=>finish(true);$('deny').onclick=()=>finish(false);d.oncancel=e=>{e.preventDefault();finish(false);};d.showModal();
 });
}
async function getData(url,kind,limit){
 if(!await approval(url,kind))fail('DENIED');
 let res;
 try{res=await fetch(url,{credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(5000)});}catch{fail('ARTIFACT_UNAVAILABLE');}
 if(!res.ok||res.url!==url.href||!/^application\/json(?:;|$)/i.test(res.headers.get('content-type')||''))fail('ARTIFACT_UNAVAILABLE');
 const reader=res.body.getReader(),chunks=[];let total=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit)fail('ARTIFACT_SIZE');chunks.push(value);}}finally{void reader.cancel().catch(()=>{});}
 const b=new Uint8Array(total);let off=0;for(const chunk of chunks){b.set(chunk,off);off+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));}catch{fail('ARTIFACT_JSON');}
}
function checkGraph(raw,front){
 if(!keys(raw,['metadata','tools','max_steps','llm_config'])||!Array.isArray(raw.tools)||raw.tools.length<1||raw.tools.length>8)fail('GRAPH_PROFILE');
 if(raw.max_steps!==undefined&&(!Number.isInteger(raw.max_steps)||raw.max_steps<1||raw.max_steps>4))fail('GRAPH_PROFILE');
 const names=new Set();
 for(const a of raw.tools){
  if(!keys(a,['name','function','instructions','tools','llm_config','max_steps'])||!safeName.test(a.name??'')||names.has(a.name)||typeof a.instructions!=='string'||a.instructions.length>2000||!Array.isArray(a.tools)||a.tools.length>4)fail('GRAPH_PROFILE');
  if(!keys(a.function,['description','parameters'])||!keys(a.function.parameters,['type','properties','required','additionalProperties']))fail('GRAPH_PROFILE');
  const p=a.function.parameters;
  if(p.type!=='object'||p.additionalProperties!==false||!plain(p.properties)||Object.keys(p.properties).length!==1||!keys(p.properties.request,['type','minLength','maxLength'])||p.properties.request.type!=='string'||!Array.isArray(p.required)||p.required.length!==1||p.required[0]!=='request')fail('GRAPH_PROFILE');
  if(a.max_steps!==undefined&&(!Number.isInteger(a.max_steps)||a.max_steps<1||a.max_steps>4))fail('GRAPH_PROFILE');
  names.add(a.name);
 }
 if(!names.has(front))fail('FRONT');
 const edges=new Map(raw.tools.map(a=>[a.name,a.tools]));
 for(const refs of edges.values())if(refs.some(r=>typeof r!=='string'||!names.has(r)))fail('GRAPH_PROFILE');
 function visit(name,chain=[]){if(chain.includes(name)||chain.length>=4)fail('GRAPH_CYCLE');for(const child of edges.get(name))visit(child,[...chain,name]);}
 for(const name of names)visit(name);
 const network=new AgentNetwork(raw,front),validation=validateNetwork(network);
 if(validation.errors.length||validation.externals.length||validation.mcps.length||network.findFrontMan()!==front)fail('GRAPH_INVALID');
 return network;
}
async function consume(name){
 if(!safeName.test(name))fail('NETWORK_NAME');
 const origin=new URL('/publisher-origin.json',location.origin);const conf=await (await fetch(origin)).json();
 const base=new URL('/agents/',conf.origin);
 if(base.protocol!=='http:'||base.hostname!=='127.0.0.1'||base.origin===location.origin)fail('LAB_ORIGIN');
 const manifest=await getData(new URL('agent-manifest.json',base),'Manifest',16384);
 if(!plain(manifest)||!Array.isArray(manifest.networks)||manifest.networks.length>32||manifest.coded_tools||manifest.actions)fail('MANIFEST');
 const entries=manifest.networks.filter(e=>plain(e)&&e.name===name);
 if(entries.length!==1)fail('NETWORK_MATCH');
 const entry=entries[0];if(!safeName.test(entry.front_man??'')||typeof entry.hocon!=='string'||entry.hocon.length>2048)fail('MANIFEST');
 const graphUrl=new URL(entry.hocon,base);
 if(graphUrl.origin!==base.origin||!graphUrl.pathname.startsWith(base.pathname)||graphUrl.search||graphUrl.hash||graphUrl.username||graphUrl.password)fail('ARTIFACT_SCOPE');
 const raw=await getData(graphUrl,'Declared graph',65536);
 const network=checkGraph(raw,entry.front_man),trace=new TraceBus(),calls=[];
 const composition={agentCalls:0,maxAgentCalls:8,remoteCalls:0,maxRemoteCalls:0,peerCalls:new Map(),maxCallsPerPeer:0,deadline:Date.now()+5000,deadlineSeconds:5};
 const llm={async chat({model,tools,messages}){
  if(model!==approvedModel||calls.length>=8||Date.now()>=composition.deadline)fail('CALLER_POLICY');
  calls.push(model);
  if(tools.length&& !messages.some(m=>m.role==='tool'))return {content:'',toolCalls:[{id:'call-'+calls.length,type:'function',function:{name:tools[0].function.name,arguments:JSON.stringify({request:'Inspect synthetic source availability'})}}]};
  return {content:tools.length?'Consumer fixture completed after local delegation; factual truth unverified.':'Synthetic source unavailable; factual truth unverified.',toolCalls:[]};
 }};
 const unavailable=()=>fail('CAPABILITY_DISABLED');
 const result=await runAgent({network,frontMan:entry.front_man,llm,trace,composition,baseOrigin:base.origin,displayOrigin:location.origin,isTop:true,mock:true,modelOverride:approvedModel,defaultModel:approvedModel,apiKey:'',history:[],slyData:{},resolveRemote:unavailable,resolveMcp:unavailable,resolveLink:unavailable},entry.front_man,'Consumer synthetic question',null,[]);
 if(!result.text||trace.events.some(e=>e.status==='error'||e.kind==='composition_limit'))fail('INCOMPLETE');
 return {name,front:entry.front_man,agentCalls:composition.agentCalls,modelCalls:calls.length,models:calls,answer:result.text,mode:'synthetic-caller-fixture',truthStatus:'unverified'};
}
$('run').onclick=async()=>{if(active)return;active=true;$('run').disabled=true;$('output').textContent='';$('status').textContent='Inspecting publication';try{const r=await consume($('network').value);$('output').textContent=JSON.stringify(r,null,2);$('status').textContent='Completed synthetic consumer run';}catch(e){$('status').textContent='Incomplete: '+(/^[A-Z_]+$/.test(e.message)?e.message:'TRANSPORT');}finally{active=false;$('run').disabled=false;$('run').focus();}};
