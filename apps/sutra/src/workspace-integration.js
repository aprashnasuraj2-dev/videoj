export const WORKSPACE_STORAGE_KEY='sutra.workspace-history.v1';
const MAX_EVENTS=256,MAX_BYTES=65536;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const SAFE=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const MODEL=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const clone=v=>JSON.parse(JSON.stringify(v));
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const finiteMs=v=>Number.isSafeInteger(v)&&v>=0&&v<=120000;
const safe=(v,f='unknown')=>typeof v==='string'&&SAFE.test(v)?v:f;
const stamp=now=>{const x=typeof now==='function'?now():now,s=x instanceof Date?x.toISOString():String(x??'');if(!ISO.test(s)||!Number.isFinite(Date.parse(s)))throw Error('WORKSPACE_TIME');return s;};
function validateEvent(e){
 if(!plain(e)||typeof e.kind!=='string'||!ISO.test(e.at)||!Number.isFinite(Date.parse(e.at)))throw Error('WORKSPACE_EVENT');
 const b=['kind','at'];
 if(e.kind==='navigation'){
  if(!exact(e,[...b,'phase','persisted'])||!['start','hashchange','pageshow','pagehide'].includes(e.phase)||typeof e.persisted!=='boolean')throw Error('WORKSPACE_EVENT');
 }else if(e.kind==='render'){
  if(!exact(e,[...b,'region','added','removed'])||!SAFE.test(e.region)||!Number.isSafeInteger(e.added)||e.added<0||e.added>5000||!Number.isSafeInteger(e.removed)||e.removed<0||e.removed>5000)throw Error('WORKSPACE_EVENT');
 }else if(e.kind==='network'){
  if(!exact(e,[...b,'scope','route','method','phase','status','durationMs'])||!['same_origin','external'].includes(e.scope)||!['api','content','agents','media','other'].includes(e.route)||!['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS','OTHER'].includes(e.method)||!['start','end','error'].includes(e.phase)||!(e.status===null||Number.isInteger(e.status)&&e.status>=0&&e.status<=599)||!(e.durationMs===null||finiteMs(e.durationMs)))throw Error('WORKSPACE_EVENT');
 }else if(e.kind==='state'){
  if(!exact(e,[...b,'target','state','tone','busy'])||!SAFE.test(e.target)||!SAFE.test(e.state)||!SAFE.test(e.tone)||typeof e.busy!=='boolean')throw Error('WORKSPACE_EVENT');
 }else if(e.kind==='mapping'){
  if(!exact(e,[...b,'state','candidateCount','displayedCount','fallback','mappings'])||!SAFE.test(e.state)||!Number.isSafeInteger(e.candidateCount)||e.candidateCount<0||e.candidateCount>10000||!Number.isSafeInteger(e.displayedCount)||e.displayedCount<0||e.displayedCount>5||!['select_unique','abstain'].includes(e.fallback)||!Array.isArray(e.mappings)||e.mappings.length!==e.displayedCount)throw Error('WORKSPACE_EVENT');
  for(const r of e.mappings)if(!exact(r,['rank','sourceId','cueId','confidence','basis'])||!Number.isInteger(r.rank)||r.rank<1||r.rank>5||!SAFE.test(r.sourceId)||!SAFE.test(r.cueId)||typeof r.confidence!=='number'||!Number.isFinite(r.confidence)||r.confidence<0||r.confidence>1||r.basis!=='lexical_support')throw Error('WORKSPACE_EVENT');
 }else if(e.kind==='provider'){
  if(!exact(e,[...b,'outcome','backend','model','calls','reported','promptTokens','completionTokens','totalTokens','requests'])||!['completed','failed','cancelled'].includes(e.outcome)||!['hosted','self_hosted'].includes(e.backend)||!MODEL.test(e.model)||!Number.isSafeInteger(e.calls)||e.calls<0||e.calls>32||!Number.isSafeInteger(e.reported)||e.reported<0||e.reported>e.calls||
   ![e.promptTokens,e.completionTokens,e.totalTokens].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=32000000)||e.promptTokens+e.completionTokens!==e.totalTokens||!Array.isArray(e.requests)||e.requests.length>e.calls)throw Error('WORKSPACE_EVENT');
  for(const r of e.requests)if(!exact(r,['sequence','outcome','retry','latencyMs','usageReported','promptTokens','completionTokens','totalTokens'])||!Number.isSafeInteger(r.sequence)||r.sequence<1||r.sequence>32||!['completed','failed','cancelled'].includes(r.outcome)||typeof r.retry!=='boolean'||!finiteMs(r.latencyMs)||typeof r.usageReported!=='boolean'||![r.promptTokens,r.completionTokens,r.totalTokens].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000)||r.promptTokens+r.completionTokens!==r.totalTokens||(r.usageReported===false&&r.totalTokens!==0))throw Error('WORKSPACE_EVENT');
 }else throw Error('WORKSPACE_EVENT');
 return e;
}
function parse(raw,maxEvents){
 if(raw===null)return {schema:1,consentedAt:null,events:[]};
 if(typeof raw!=='string'||raw.length<2||raw.length>MAX_BYTES)throw Error('WORKSPACE_STORAGE');
 let d;try{d=JSON.parse(raw);}catch{throw Error('WORKSPACE_STORAGE');}
 if(!exact(d,['schema','consentedAt','events'])||d.schema!==1||!(d.consentedAt===null||typeof d.consentedAt==='string'&&ISO.test(d.consentedAt)&&Number.isFinite(Date.parse(d.consentedAt)))||!Array.isArray(d.events)||d.events.length>maxEvents)throw Error('WORKSPACE_STORAGE');
 d.events.forEach(validateEvent);return clone(d);
}
const method=v=>{const m=typeof v==='string'?v.toUpperCase():'GET';return ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].includes(m)?m:'OTHER';};
function classify(url,origin){try{const u=new URL(url,origin),p=u.pathname;return {scope:u.origin===origin?'same_origin':'external',route:p.startsWith('/api/')?'api':p.startsWith('/content/')?'content':p.startsWith('/agents/')?'agents':p.startsWith('/media/')?'media':'other'};}catch{return {scope:'external',route:'other'};}}
export function createWorkspaceHistory({storage,now=()=>new Date().toISOString(),maxEvents=MAX_EVENTS}={}){
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||typeof storage.removeItem!=='function'||!Number.isInteger(maxEvents)||maxEvents<1||maxEvents>MAX_EVENTS)throw Error('WORKSPACE_STORAGE');
 const read=()=>{const raw=storage.getItem(WORKSPACE_STORAGE_KEY);return {raw,data:parse(raw,maxEvents)};};
 const write=(before,next)=>{if(storage.getItem(WORKSPACE_STORAGE_KEY)!==before)throw Error('WORKSPACE_CONFLICT');const encoded=JSON.stringify(next);if(encoded.length>MAX_BYTES)throw Error('WORKSPACE_STORAGE');storage.setItem(WORKSPACE_STORAGE_KEY,encoded);if(storage.getItem(WORKSPACE_STORAGE_KEY)!==encoded)throw Error('WORKSPACE_READBACK');};
 return Object.freeze({
  inspect(){return read().data;},
  enable(){const {raw,data}=read();if(data.consentedAt)return data;const next={schema:1,consentedAt:stamp(now),events:data.events};write(raw,next);return clone(next);},
  record(event){const {raw,data}=read();if(!data.consentedAt)return false;if(data.events.length>=maxEvents){const err=Error('Workspace history is full; existing events were retained.');err.code='WORKSPACE_FULL';throw err;}const clean=validateEvent({...event,at:stamp(now)});write(raw,{schema:1,consentedAt:data.consentedAt,events:[...data.events,clean]});return true;},
  clear(){storage.removeItem(WORKSPACE_STORAGE_KEY);if(storage.getItem(WORKSPACE_STORAGE_KEY)!==null)throw Error('WORKSPACE_READBACK');}
 });
}
export function createWorkspaceIntegration({win=globalThis.window,doc=globalThis.document,storage=globalThis.localStorage,now=()=>new Date().toISOString()}={}){
 if(!win||!doc)throw Error('WORKSPACE_CONTEXT');
 const history=createWorkspaceHistory({storage,now});let active=false,paused=false,observer=null,originalFetch=null,wrappedFetch=null;const off=[];
 const record=e=>{if(!active||paused)return false;try{return history.record(e);}catch(error){if(error?.code==='WORKSPACE_FULL')paused=true;return false;}};
 const on=(target,type,handler)=>{target.addEventListener(type,handler);off.push(()=>target.removeEventListener(type,handler));};
 const nav=(phase,persisted=false)=>record({kind:'navigation',phase,persisted:Boolean(persisted)});
 const stop=()=>{if(!active)return;active=false;observer?.disconnect();observer=null;while(off.length)off.pop()();if(originalFetch&&win.fetch===wrappedFetch)win.fetch=originalFetch;originalFetch=wrappedFetch=null;};
 const start=()=>{
  if(active)return true;if(!history.inspect().consentedAt)return false;active=true;paused=false;nav('start');
  on(win,'hashchange',()=>nav('hashchange'));on(win,'pageshow',e=>nav('pageshow',e.persisted));on(win,'pagehide',e=>nav('pagehide',e.persisted));
  on(win,'storage',e=>{if(e.key===WORKSPACE_STORAGE_KEY&&e.newValue===null)stop();});
  on(doc,'sutra:state-change',e=>{const d=e.detail??{};record({kind:'state',target:safe(d.target),state:safe(d.state),tone:safe(d.tone),busy:Boolean(d.busy)});});
  if(typeof win.MutationObserver==='function'){observer=new win.MutationObserver(rows=>{let added=0,removed=0,region='document';for(const m of rows){added+=m.addedNodes?.length??0;removed+=m.removedNodes?.length??0;const t=m.target,s=t?.nodeType===1?t.closest?.('section[id],main[id]'):t?.parentElement?.closest?.('section[id],main[id]');if(s?.id)region=safe(s.id,'document');}if(added||removed)record({kind:'render',region,added:Math.min(added,5000),removed:Math.min(removed,5000)});});observer.observe(doc.documentElement,{childList:true,subtree:true});}
  if(typeof win.fetch==='function'){originalFetch=win.fetch;wrappedFetch=async function(input,init){let raw='',m='GET';if(typeof input==='string'||input instanceof win.URL)raw=String(input);else if(typeof win.Request==='function'&&input instanceof win.Request){raw=input.url;m=input.method;}const md=plain(init)?Object.getOwnPropertyDescriptor(init,'method'):null;if(md&&Object.hasOwn(md,'value')&&typeof md.value==='string')m=md.value;const c=classify(raw,win.location.origin),verb=method(m),beg=Math.round(win.performance?.now?.()??Date.now());record({kind:'network',...c,method:verb,phase:'start',status:null,durationMs:null});try{const response=await originalFetch.call(win,input,init),end=Math.round(win.performance?.now?.()??Date.now());record({kind:'network',...c,method:verb,phase:'end',status:Number.isInteger(response?.status)?response.status:null,durationMs:Math.max(0,Math.min(120000,end-beg))});return response;}catch(error){const end=Math.round(win.performance?.now?.()??Date.now());record({kind:'network',...c,method:verb,phase:'error',status:null,durationMs:Math.max(0,Math.min(120000,end-beg))});throw error;}};win.fetch=wrappedFetch;}
  return true;
 };
 return Object.freeze({
  inspect:()=>history.inspect(),enable(){history.enable();start();return history.inspect();},resume(){try{return history.inspect().consentedAt?start():false;}catch{return false;}},disableAndClear(){stop();history.clear();},
  get active(){return active;},get paused(){return paused;},
  recordMapping(found){if(!found||!plain(found.disambiguation)||!Array.isArray(found.mappings))return false;return record({kind:'mapping',state:safe(found.state),candidateCount:found.disambiguation.candidateCount,displayedCount:found.mappings.length,fallback:found.disambiguation.fallback,mappings:found.mappings.map(r=>({rank:r.rank,sourceId:safe(r.sourceId),cueId:safe(r.cueId),confidence:r.confidence,basis:'lexical_support'}))});},
  recordProviderTelemetry(sample){
   const u=sample?.usage;if(!plain(sample)||!plain(u)||!['completed','failed','cancelled'].includes(sample.outcome)||!['hosted','self_hosted'].includes(sample.backend)||typeof sample.model!=='string'||!MODEL.test(sample.model)||!Array.isArray(u.requests))return false;
   const requests=u.requests.map(r=>({sequence:r.sequence,outcome:r.outcome,retry:r.retry===true,latencyMs:r.latencyMs,usageReported:r.usage!==null,promptTokens:r.usage?.promptTokens??0,completionTokens:r.usage?.completionTokens??0,totalTokens:r.usage?.totalTokens??0}));
   return record({kind:'provider',outcome:sample.outcome,backend:sample.backend,model:sample.model,calls:u.calls??0,reported:u.reported??0,promptTokens:u.promptTokens??0,completionTokens:u.completionTokens??0,totalTokens:u.totalTokens??0,requests});
  }
 });
}
export function mountWorkspaceControls({anchor,workspace}={}){
 if(!anchor?.parentNode||!workspace)return null;const section=document.createElement('section');section.className='runtime-lab';section.id='workspace-diagnostics';section.setAttribute('aria-labelledby','workspace-diagnostics-title');section.innerHTML='<div class="section-label">DEV · LOCAL JOURNEY DIAGNOSTICS</div><h2 id="workspace-diagnostics-title">Inspect the visible browser journey.</h2><p>Optional local diagnostics store only sanitized event metadata in this browser. Query text, source excerpts, request bodies, headers, credentials and raw URLs are never stored.</p><div class="actions"><button id="workspace-enable">Enable local journey diagnostics</button><button id="workspace-clear">Disable and clear diagnostics</button></div><p id="workspace-status" role="status" aria-live="polite"></p>';anchor.parentNode.insertBefore(section,anchor.nextSibling);
 const enable=section.querySelector('#workspace-enable'),clear=section.querySelector('#workspace-clear'),status=section.querySelector('#workspace-status'),refresh=()=>{let d;try{d=workspace.inspect();}catch{status.textContent='Local diagnostics storage is unreadable. Capture is disabled.';enable.disabled=true;return;}enable.disabled=workspace.active;clear.disabled=!d.consentedAt;status.textContent=d.consentedAt?(workspace.paused?'Diagnostics paused because the bounded history is full; existing events were retained. ':'Diagnostics enabled. ')+d.events.length+' sanitized event(s) stored locally.':'Diagnostics disabled. No journey history is stored.';};
 enable.addEventListener('click',()=>{try{workspace.enable();refresh();}catch{status.textContent='Diagnostics could not be enabled. No capture is claimed.';}});clear.addEventListener('click',()=>{try{workspace.disableAndClear();refresh();}catch{status.textContent='Diagnostics could not be cleared with confirmed readback.';}});refresh();return section;
}
