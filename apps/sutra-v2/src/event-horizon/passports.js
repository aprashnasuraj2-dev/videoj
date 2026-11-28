// Inspect bounded publication artifacts through the existing runtime compiler.
// Inspection is not execution, consent, empirical verification or trust.
import {compileNetwork,loadLocalNetwork} from '../../../../packages/sutra-runtime/index.js';
import {readBoundedResponse,isFullJson} from '../../../../packages/sutra-runtime/bounded-response.js';
import {parseUniqueJson} from '../../../../packages/sutra-runtime/strict-json.js';
const idPattern=/^[A-Za-z][A-Za-z0-9_]{0,59}$/;
const staticPath=/^\/agents\/(?:agent-manifest\.json|links\.json|[A-Za-z0-9_-]+\.network\.json)$/;
const fail=code=>{throw Error(code);};
const safeId=s=>typeof s==='string'&&idPattern.test(s)&&!['constructor','prototype','__proto__'].includes(s);
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
function publisherOrigin(raw){
 const u=new URL(raw);
 if(u.origin!==raw||u.username||u.password||u.search||u.hash||u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))fail('PASSPORT_ORIGIN');
 return u.origin;
}
export function admittedStaticUrl(raw,origin){
 const o=publisherOrigin(origin),u=new URL(raw,o+'/agents/');
 if(u.origin!==o||u.username||u.password||u.search||u.hash||!staticPath.test(u.pathname))fail('PASSPORT_ARTIFACT_PATH');
 return u.href;
}
export function staticInspectorFetch(origin,fetchImpl=fetch){
 return (raw,init={})=>{
  const href=admittedStaticUrl(raw,origin);
  if(init.method!=='GET'||init.credentials!=='omit'||init.redirect!=='error'||init.referrerPolicy!=='no-referrer'||init.referrer!==''||init.body!==undefined)fail('PASSPORT_TRANSPORT');
  const headers=new Headers(init.headers);if([...headers.keys()].some(k=>k!=='accept'))fail('PASSPORT_HEADERS');
  return fetchImpl(href,init);
 };
}
export function inspectManifest(data,origin){
 publisherOrigin(origin);
 if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.networks)||!data.networks.length||data.networks.length>32)fail('PASSPORT_MANIFEST');
 const seen=new Set(),networks=[];
 for(const n of data.networks){
  if(!n||!safeId(n.name)||!safeId(n.front_man)||typeof n.hocon!=='string'||seen.has(n.name))fail('PASSPORT_MANIFEST');
  const artifact=admittedStaticUrl(n.hocon,origin);
  if(!artifact.endsWith('.network.json'))fail('PASSPORT_ARTIFACT_PATH');
  seen.add(n.name);networks.push(Object.freeze({name:n.name,front:n.front_man,artifact,description:typeof n.description==='string'?n.description.slice(0,2000):'No description declared'}));
 }
 const peers=(Array.isArray(data.allowed_peers)?data.allowed_peers:[]).slice(0,32).filter(x=>typeof x==='string'&&x.length<=2048);
 return Object.freeze({origin,networks:Object.freeze(networks),declaredPeers:Object.freeze(peers),qualification:'Publisher-declared index; no graph validation, peer contact or execution authorization yet.'});
}
export async function readPublishedIndex(origin,{fetchImpl=fetch,signal}={}){
 const url=admittedStaticUrl('agent-manifest.json',origin);
 const {bytes}=await readBoundedResponse({url,fetchImpl:staticInspectorFetch(origin,fetchImpl),signal,maxBytes:16384,init:{method:'GET',headers:{Accept:'application/json'}},inspect:r=>{if(!isFullJson(r))fail('PASSPORT_RESPONSE');return true;}});
 const manifest=inspectManifest(parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes),{maxChars:16384,maxDepth:12}),origin);
 return Object.freeze({...manifest,digest:'sha256:'+hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))});
}
function graphDescriptor(definition){
 const known=new Set(definition.tools.map(a=>a.name));
 const nodes=definition.tools.map(a=>({id:a.name,label:a.name,kind:'definition',description:a.function.description,toolCount:a.tools.length}));
 const edges=[],references=[];
 for(const agent of definition.tools){
  for(const ref of agent.tools){
   if(typeof ref==='string'&&known.has(ref))edges.push({from:agent.name,to:ref,kind:'declared delegation'});
   else references.push({from:agent.name,reference:typeof ref==='string'?ref:ref.url,kind:typeof ref==='string'?'declared peer':'declared local capability'});
  }
 }
 return {description:definition.metadata.description,nodes,edges,references,definitionCount:nodes.length};
}
export async function inspectPublishedNetwork(origin,name,{profile='local',fetchImpl=fetch,signal}={}){
 if(!safeId(name)||!['local','reviewed','linked-peer'].includes(profile))fail('PASSPORT_PROFILE');
 const loaded=await loadLocalNetwork({baseUrl:origin+'/agents/',expectedOrigin:publisherOrigin(origin),networkName:name,
  allowWorkspaceEvidence:profile==='reviewed',resolvePublishedLinks:profile==='linked-peer',
  fetchImpl:staticInspectorFetch(origin,fetchImpl),signal});
 return Object.freeze({origin,name:loaded.name,front:loaded.frontMan,profile,artifacts:loaded.artifacts,digests:Object.fromEntries(Object.entries(loaded.artifactDigests).map(([k,v])=>[k,'sha256:'+v])),
  ...graphDescriptor(loaded.definition),qualification:'Same-origin static artifacts passed the existing bounded compiler in the selected inspection profile. No peer was fetched, no model was called, no tool or disclosure was authorized. Availability and publisher independence are unverified.'});
}
export async function inspectImportedNetwork(bytes,{name='imported',front}={}){
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.byteLength>65536||!safeId(name)||!safeId(front))fail('PASSPORT_IMPORT');
 const data=parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes),{maxChars:65536,maxDepth:32});
 // Imported graph inspection uses the strict no-peer/no-MCP local profile.
 compileNetwork(data,{name,frontMan:front});
 const digest='sha256:'+hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));
 return Object.freeze({origin:null,name,front,profile:'local file / no external capabilities',artifacts:{},digests:{definition:digest},...graphDescriptor(data),qualification:'User-supplied JSON passed the local compiler. Publisher identity, model access, competence and factual truth are unverified. Inspection neither executes nor publishes the graph.'});
}
