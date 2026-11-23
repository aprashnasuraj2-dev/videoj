export class ConsentError extends Error {
  constructor(code,message){super(message);this.name='ConsentError';this.code=code;}
}
const fail=(code,message)=>{throw new ConsentError(code,message);};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const contactKinds=new Set(['peer_manifest','peer_graph','mcp_discovery','mcp_call']);
const labelPattern=/^[A-Za-z][A-Za-z0-9 _-]{0,79}$/;
const networkPattern=/^[A-Za-z][A-Za-z0-9_]{0,59}$/;
const allowed=(object,keys)=>{for(const key of Object.keys(object))if(!keys.includes(key))fail('CONTACT_FIELD','Unsupported contact metadata field.');};
const publicText=(value,where,max)=>{
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f\u007f]/.test(value))fail('CONTACT_METADATA',where+' must be bounded public display text.');
  return value.trim();
};
export function normalizeContact(input){
  if(!plain(input))fail('CONTACT_METADATA','Contact metadata must be an object.');
  allowed(input,['origin','kind','purpose','disclosure','network']);
  let target;
  try{target=new URL(input.origin);}catch{fail('CONTACT_ORIGIN','Contact origin must be an absolute URL.');}
  const loopback=['localhost','127.0.0.1','[::1]'].includes(target.hostname);
  if(target.username||target.password||target.search||target.hash||target.pathname!=='/'||target.protocol!=='https:'&&!(target.protocol==='http:'&&loopback))fail('CONTACT_ORIGIN','Contact metadata must name only an approved HTTPS origin (loopback HTTP is allowed for development).');
  if(!contactKinds.has(input.kind))fail('CONTACT_KIND','Unsupported external contact kind.');
  const purpose=publicText(input.purpose,'Purpose',240);
  if(!Array.isArray(input.disclosure)||input.disclosure.length<1||input.disclosure.length>12)fail('DISCLOSURE','Disclosure must list one to twelve public field labels.');
  const disclosure=input.disclosure.map(label=>{if(typeof label!=='string'||!labelPattern.test(label))fail('DISCLOSURE','Disclosure entries must be public field labels, not values.');return label;});
  if(new Set(disclosure).size!==disclosure.length)fail('DISCLOSURE','Disclosure labels must be unique.');
  if(input.network!==undefined&&(typeof input.network!=='string'||!networkPattern.test(input.network)))fail('NETWORK_ID','Invalid exact network identity.');
  return Object.freeze({origin:target.origin,kind:input.kind,purpose,disclosure:Object.freeze([...disclosure]),...(input.network?{network:input.network}:{})});
}
const eventCopy=event=>Object.freeze({...event,disclosure:Object.freeze([...event.disclosure])});
export function createConsentInspector({decide,onEvent,now=()=>new Date().toISOString()}={}){
  if(typeof decide!=='function')fail('DECISION_HANDLER','A user decision handler is required.');
  if(typeof now!=='function')fail('CLOCK','Clock must be callable.');
  const sessionApprovals=new Set(),events=[];
  const key=c=>JSON.stringify([c.origin,c.kind,c.purpose,c.disclosure,c.network??'']);
  const record=(contact,type,extra={})=>{
    const safe=eventCopy({at:String(now()),type,origin:contact.origin,contactKind:contact.kind,purpose:contact.purpose,disclosure:contact.disclosure,...(contact.network?{network:contact.network}:{}),...extra});
    if(events.length<512)events.push(safe);
    try{onEvent?.(safe);}catch{}
    return safe;
  };
  async function authorize(input){
    const contact=normalizeContact(input),id=key(contact);
    record(contact,'intent');
    if(sessionApprovals.has(id)){record(contact,'decision',{decision:'allow',scope:'session',source:'remembered'});return {contact,decision:'allow',scope:'session'};}
    let answer;
    try{answer=await decide(Object.freeze({...contact,scopeOptions:Object.freeze(['once','session'])}));}catch{fail('DECISION_FAILED','Consent decision could not be completed.');}
    if(answer==='deny')answer={decision:'deny',scope:'once'};
    if(answer==='allow')answer={decision:'allow',scope:'once'};
    if(!plain(answer)||!['allow','deny'].includes(answer.decision)||!['once','session'].includes(answer.scope))fail('DECISION_INVALID','Consent decision must explicitly allow or deny with a valid scope.');
    if(answer.decision==='deny'){
      record(contact,'decision',{decision:'deny',scope:'once',source:'user'});
      throw new ConsentError('CONSENT_DENIED','External contact was denied before any approved operation.');
    }
    if(answer.scope==='session')sessionApprovals.add(id);
    record(contact,'decision',{decision:'allow',scope:answer.scope,source:'user'});
    return {contact,decision:'allow',scope:answer.scope};
  }
  async function perform(input,effect){
    if(typeof effect!=='function')fail('CONTACT_EFFECT','Approved contact operation must be callable.');
    const approval=await authorize(input);
    try{
      const value=await effect(approval.contact);
      record(approval.contact,'outcome',{status:'completed',scope:approval.scope});
      return value;
    }catch(error){
      record(approval.contact,'outcome',{status:'failed',scope:approval.scope});
      if(error instanceof ConsentError)throw error;
      throw new ConsentError('CONTACT_FAILED','Approved external contact failed.');
    }
  }
  return Object.freeze({
    authorize,
    perform,
    clearSession(){sessionApprovals.clear();},
    exportEvents(){return events.map(event=>({...event,disclosure:[...event.disclosure]}));}
  });
}
async function readBoundedJson(response,maxBytes,signal){
  if(!response?.ok||!response.headers?.get('content-type')?.toLowerCase().includes('application/json'))fail('CONTACT_RESPONSE','Approved contact must return successful JSON.');
  const reader=response.body?.getReader();if(!reader)fail('CONTACT_RESPONSE','Approved contact response body is unavailable.');
  let total=0;const chunks=[];
  try{
    for(;;){
      signal?.throwIfAborted();
      const {done,value}=await reader.read();if(done)break;
      total+=value.byteLength;if(total>maxBytes)fail('CONTACT_SIZE','Approved contact exceeded the response limit.');
      chunks.push(value);
    }
  } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('CONTACT_JSON','Approved contact did not return valid UTF-8 JSON.');}
}
export async function fetchJsonWithConsent({inspector,contact,url,fetchImpl=fetch,maxBytes=65536,maxRedirects=3,signal}={}){
  if(!inspector||typeof inspector.perform!=='function')fail('INSPECTOR','A consent inspector is required.');
  if(!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>65536)fail('CONTACT_SIZE','Response limit must be within 1–65536 bytes.');
  if(!Number.isInteger(maxRedirects)||maxRedirects<0||maxRedirects>3)fail('CONTACT_REDIRECT','Redirect limit must be within 0–3 hops.');
  const initial=normalizeContact(contact);
  let target;
  try{target=new URL(url);}catch{fail('CONTACT_URL','Approved contact URL must be absolute.');}
  const validTarget=(value,expectedOrigin)=>{
    const loopback=['localhost','127.0.0.1','[::1]'].includes(value.hostname);
    if(value.origin!==expectedOrigin||value.username||value.password||value.hash||value.href.length>2048||value.protocol!=='https:'&&!(value.protocol==='http:'&&loopback))fail('CONTACT_URL','Approved contact URL must stay on the consented secure origin without credentials or fragments.');
  };
  validTarget(target,initial.origin);
  let currentContact=initial,redirects=0;
  const visited=new Set([target.href]);
  for(;;){
    const outcome=await inspector.perform(currentContact,async()=>{
      let response;
      try{response=await fetchImpl(target.href,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',signal,headers:{Accept:'application/json'}});}catch{if(signal?.aborted)fail('CANCELLED','Approved contact was cancelled.');fail('CONTACT_FETCH','Approved contact could not be fetched.');}
      if(response.redirected||(response.url&&response.url!==target.href))fail('CONTACT_REDIRECT','Approved contact followed or changed its declared URL before re-consent.');
      if(response.status>=300&&response.status<400){
        const location=response.headers?.get('location');void response.body?.cancel().catch(()=>{});
        if(!location)fail('CONTACT_REDIRECT','Redirect response did not expose a reviewable destination.');
        if(redirects>=maxRedirects)fail('CONTACT_REDIRECT','Approved contact exceeded the redirect-hop limit.');
        let next;try{next=new URL(location,target);}catch{fail('CONTACT_REDIRECT','Redirect destination is invalid.');}
        const loopback=['localhost','127.0.0.1','[::1]'].includes(next.hostname);
        if(next.username||next.password||next.hash||next.href.length>2048||next.protocol!=='https:'&&!(next.protocol==='http:'&&loopback))fail('CONTACT_REDIRECT','Redirect destination is outside the approved public-artifact transport profile.');
        if(visited.has(next.href))fail('CONTACT_REDIRECT','Redirect cycle detected before another contact.');
        return {kind:'redirect',target:next};
      }
      return {kind:'value',value:await readBoundedJson(response,maxBytes,signal)};
    });
    if(outcome.kind==='value')return outcome.value;
    redirects++;target=outcome.target;visited.add(target.href);
    const path=(target.pathname||'/').slice(0,80),basePurpose=initial.purpose.slice(0,135);
    currentContact=normalizeContact({
      origin:target.origin,kind:initial.kind,
      purpose:`${basePurpose}; redirected artifact ${path}`,
      disclosure:[...initial.disclosure],...(initial.network?{network:initial.network}:{})
    });
    validTarget(target,currentContact.origin);
  }
}
