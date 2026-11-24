export class ConsentError extends Error {
  constructor(code,message){super(message);this.name='ConsentError';this.code=code;}
}
const fail=(code,message)=>{throw new ConsentError(code,message);};
const plain=value=>value!==null&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype;
function dataRecord(value,keys,code){
  if(!plain(value))fail(code,'Expected a plain data record.');
  const descriptors=Object.getOwnPropertyDescriptors(value),out={};
  for(const k of Reflect.ownKeys(descriptors)){
    if(typeof k!=='string'||!keys.includes(k)||!Object.hasOwn(descriptors[k],'value'))fail(code,'Unexpected or executable metadata.');
    out[k]=descriptors[k].value;
  }
  return out;
}
function dataLabels(value){
  if(!Array.isArray(value)||value.length<1||value.length>12)fail('DISCLOSURE','Disclosure must list one to twelve public field labels.');
  const descriptors=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(descriptors).length!==value.length+1)fail('DISCLOSURE','Disclosure must be a dense data array.');
  return Array.from({length:value.length},(_,i)=>{
    const d=descriptors[String(i)];
    if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='string'||!labelPattern.test(d.value))fail('DISCLOSURE','Disclosure entries must be public field labels, not values.');
    return d.value;
  });
}
const cancelled=()=>new ConsentError('CANCELLED','Contact authority was cancelled or revoked.');
const check=signal=>{if(signal?.aborted)throw cancelled();};
const combine=(a,b)=>a&&b?AbortSignal.any([a,b]):a??b;
function raceAbort(work,signal){
  check(signal);
  if(!signal)return Promise.resolve().then(work);
  let stop;
  const aborted=new Promise((_,reject)=>{stop=()=>reject(cancelled());signal.addEventListener('abort',stop,{once:true});});
  const pending=Promise.resolve().then(()=>{check(signal);return work();});
  return Promise.race([pending,aborted]).finally(()=>signal.removeEventListener('abort',stop));
}
const cancelBody=body=>{try{void Promise.resolve(body?.cancel()).catch(()=>{});}catch{}};
const contactKinds=new Set(['peer_manifest','peer_graph','mcp_discovery','mcp_call']);
const labelPattern=/^[A-Za-z][A-Za-z0-9 _-]{0,79}$/;
const networkPattern=/^[A-Za-z][A-Za-z0-9_]{0,59}$/;
const publicText=(value,where,max)=>{
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f\u007f]/.test(value))fail('CONTACT_METADATA',where+' must be bounded public display text.');
  return value.trim();
};
export function normalizeContact(input){
  input=dataRecord(input,['origin','kind','purpose','disclosure','network','resource'],'CONTACT_METADATA');
  let target;
  if(typeof input.origin!=='string'||input.origin.length>2048)fail('CONTACT_ORIGIN','Contact origin must be an absolute URL.');
  try{target=new URL(input.origin);}catch{fail('CONTACT_ORIGIN','Contact origin must be an absolute URL.');}
  const loopback=['localhost','127.0.0.1','[::1]'].includes(target.hostname);
  if(target.username||target.password||target.search||target.hash||target.pathname!=='/'||target.protocol!=='https:'&&!(target.protocol==='http:'&&loopback))fail('CONTACT_ORIGIN','Contact metadata must name only an approved HTTPS origin (loopback HTTP is allowed for development).');
  if(!contactKinds.has(input.kind))fail('CONTACT_KIND','Unsupported external contact kind.');
  const purpose=publicText(input.purpose,'Purpose',240);
  const disclosure=dataLabels(input.disclosure);
  if(new Set(disclosure).size!==disclosure.length)fail('DISCLOSURE','Disclosure labels must be unique.');
  if(input.network!==undefined&&(typeof input.network!=='string'||!networkPattern.test(input.network)))fail('NETWORK_ID','Invalid exact network identity.');
  let resource;
  if(input.resource!==undefined){
    if(typeof input.resource!=='string'||input.resource.length>2048||/[\u0000-\u001f\u007f]/.test(input.resource))fail('CONTACT_URL','Invalid exact public resource.');
    try{resource=new URL(input.resource);}catch{fail('CONTACT_URL','Invalid exact public resource.');}
    if(resource.origin!==target.origin||resource.username||resource.password||resource.hash||resource.href.length>2048)fail('CONTACT_URL','Resource must stay on the approved origin.');
  }
  return Object.freeze({origin:target.origin,kind:input.kind,purpose,disclosure:Object.freeze([...disclosure]),...(input.network?{network:input.network}:{}),...(resource?{resource:resource.href}:{})});
}
const eventCopy=event=>Object.freeze({...event,disclosure:Object.freeze([...event.disclosure])});
export function createConsentInspector({decide,onEvent,now=()=>new Date().toISOString()}={}){
  if(typeof decide!=='function')fail('DECISION_HANDLER','A user decision handler is required.');
  if(typeof now!=='function')fail('CLOCK','Clock must be callable.');
  const sessionApprovals=new Set(),events=[];
  let sessionController=new AbortController();
  const key=c=>JSON.stringify([c.origin,c.kind,c.purpose,c.disclosure,c.network??'',c.resource??'']);
  const record=(contact,type,extra={},observe)=>{
    const safe=eventCopy({at:String(now()),type,origin:contact.origin,contactKind:contact.kind,purpose:contact.purpose,disclosure:contact.disclosure,...(contact.network?{network:contact.network}:{}),...extra});
    if(events.length<512)events.push(safe);
    try{onEvent?.(safe);}catch{}
    try{observe?.(safe);}catch{}
    return safe;
  };
  async function authorize(input,{signal,onEvent:observe}={}){
    const active=combine(sessionController.signal,signal);
    check(active);
    const contact=normalizeContact(input),id=key(contact);
    record(contact,'intent',{},observe);check(active);
    if(sessionApprovals.has(id)){
      record(contact,'decision',{decision:'allow',scope:'session',source:'remembered'},observe);check(active);
      return {contact,decision:'allow',scope:'session'};
    }
    let answer;
    try{answer=await raceAbort(()=>decide(Object.freeze({...contact,scopeOptions:Object.freeze(['once','session'])}),{signal:active}),active);}
    catch(error){if(active.aborted||error instanceof ConsentError&&error.code==='CANCELLED')throw cancelled();fail('DECISION_FAILED','Consent decision could not be completed.');}
    check(active);
    if(answer==='deny')answer={decision:'deny',scope:'once'};
    if(answer==='allow')answer={decision:'allow',scope:'once'};
    answer=dataRecord(answer,['decision','scope'],'DECISION_INVALID');
    if(!['allow','deny'].includes(answer.decision)||!['once','session'].includes(answer.scope))fail('DECISION_INVALID','Consent decision must explicitly allow or deny with a valid scope.');
    if(answer.decision==='deny'){
      record(contact,'decision',{decision:'deny',scope:'once',source:'user'},observe);
      throw new ConsentError('CONSENT_DENIED','External contact was denied before any approved operation.');
    }
    record(contact,'decision',{decision:'allow',scope:answer.scope,source:'user'},observe);check(active);
    if(answer.scope==='session'){
      // A long-lived standalone inspector cannot accumulate unbounded grants.
      if(sessionApprovals.size>=128)sessionApprovals.delete(sessionApprovals.values().next().value);
      sessionApprovals.add(id);
    }
    return {contact,decision:'allow',scope:answer.scope};
  }
  async function perform(input,effect,{signal,onEvent:observe}={}){
    if(typeof effect!=='function')fail('CONTACT_EFFECT','Approved contact operation must be callable.');
    const active=combine(sessionController.signal,signal);
    const approval=await authorize(input,{signal:active,onEvent:observe});
    check(active);
    let value;
    try{
      value=await raceAbort(()=>effect(approval.contact,active),active);check(active);
    }catch(error){
      record(approval.contact,'outcome',{status:'failed',scope:approval.scope},observe);
      if(error instanceof ConsentError)throw error;
      throw new ConsentError('CONTACT_FAILED','Approved external contact failed.');
    }
    record(approval.contact,'outcome',{status:'completed',scope:approval.scope},observe);check(active);
    return value;
  }
  return Object.freeze({
    authorize,
    perform,
    clearSession(){const previous=sessionController;sessionController=new AbortController();sessionApprovals.clear();previous.abort();},
    exportEvents(){return events.map(event=>({...event,disclosure:[...event.disclosure]}));}
  });
}
async function readBoundedJson(response,maxBytes,signal){
  let reader;
  try{
    check(signal);
    if(!response?.ok||response.status!==200||response.headers?.has('content-range')||!/^application\/json(?:\s*;|$)/i.test(response.headers?.get('content-type')??''))fail('CONTACT_RESPONSE','Approved contact must return complete successful JSON.');
    if(Number(response.headers.get('content-length'))>maxBytes)fail('CONTACT_SIZE','Approved contact exceeded the response limit.');
    reader=response.body?.getReader();if(!reader)fail('CONTACT_RESPONSE','Approved contact response body is unavailable.');
    const bytes=new Uint8Array(maxBytes);let total=0;
    for(;;){
      const {done,value}=await raceAbort(()=>reader.read(),signal);check(signal);if(done)break;
      if(!(value instanceof Uint8Array))fail('CONTACT_RESPONSE','Approved contact returned an invalid byte stream.');
      if(value.byteLength>maxBytes-total)fail('CONTACT_SIZE','Approved contact exceeded the response limit.');
      bytes.set(value,total);total+=value.byteLength;
    }
    try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,total)));}catch{fail('CONTACT_JSON','Approved contact did not return valid UTF-8 JSON.');}
  } finally {
    if(reader){cancelBody(reader);try{reader.releaseLock();}catch{}}
    else cancelBody(response?.body);
  }
}
export async function fetchJsonWithConsent({inspector,contact,url,fetchImpl=fetch,maxBytes=65536,signal,timeoutMs=5000}={}){
  if(!inspector||typeof inspector.perform!=='function')fail('INSPECTOR','A consent inspector is required.');
  if(!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>65536)fail('CONTACT_SIZE','Response limit must be within 1–65536 bytes.');
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)fail('CONTACT_TIMEOUT','Approved GET timeout must be within 1–5000 ms.');
  check(signal);
  const normalized=normalizeContact(contact);
  let target;
  if(typeof url!=='string'||url.length>2048||/[\u0000-\u001f\u007f]/.test(url))fail('CONTACT_URL','Approved contact URL must be absolute.');
  try{target=new URL(url);}catch{fail('CONTACT_URL','Approved contact URL must be absolute.');}
  if(target.origin!==normalized.origin||target.username||target.password||target.hash||target.href.length>2048||!['https:','http:'].includes(target.protocol)||normalized.resource&&normalized.resource!==target.href)fail('CONTACT_URL','Approved contact URL must stay on the consented origin and exact resource.');
  const bound=Object.freeze({...normalized,resource:target.href});
  return inspector.perform(bound,async(_contact,approvedSignal)=>{
    const parent=combine(signal,approvedSignal),deadline=new AbortController();
    const timer=setTimeout(()=>deadline.abort(),timeoutMs);
    const active=combine(parent,deadline.signal);
    let received,handedOff=false,finished=false;
    try{
      let response;
      try{
        response=await raceAbort(()=>Promise.resolve(fetchImpl(target.href,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',signal:active,headers:{Accept:'application/json'}})).then(value=>{
          if(finished||active?.aborted){cancelBody(value?.body);throw cancelled();}
          received=value;return value;
        }),active);
      }catch(error){if(active?.aborted||error instanceof ConsentError&&error.code==='CANCELLED')throw cancelled();fail('CONTACT_FETCH','Approved contact could not be fetched.');}
      check(active);
      if(response.redirected||response.url&&response.url!==target.href)fail('CONTACT_REDIRECT','Approved contact changed its exact resource.');
      handedOff=true;return await readBoundedJson(response,maxBytes,active);
    }catch(error){if(deadline.signal.aborted&&!parent?.aborted)fail('CONTACT_TIMEOUT','Approved GET exceeded its network deadline.');throw error;}
    finally{clearTimeout(timer);finished=true;if(!handedOff)cancelBody(received?.body);}
  },{signal});
}
