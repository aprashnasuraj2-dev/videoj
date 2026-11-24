// Separate operator-owned loopback gateway. No cloud deployment, model download,
// or external network contact happens when this module is imported.
import http from 'node:http';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,timingSafeEqual} from 'node:crypto';
const MAX_BODY=33792,MAX_STREAM=262144;
const sha=value=>createHash('sha256').update(value).digest();
const validPort=n=>Number.isInteger(n)&&n>=1&&n<=65535;
export function validateGatewayConfig({token,model,upstreamPort}={}){
 if(typeof token!=='string'||token.length<32||token.length>256||
    typeof model!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,99}$/.test(model)||
    !validPort(upstreamPort))throw Error('GATEWAY_CONFIG');
 return Object.freeze({token,model,upstreamPort});
}
const MESSAGE_FIELDS=new Set(['role','content','tool_calls','tool_call_id','name']);
const CALL_FIELDS=new Set(['id','type','function']);
const FN_FIELDS=new Set(['name','arguments']);
const TOOL_FIELDS=new Set(['type','function']);
const TOOL_FN_FIELDS=new Set(['name','description','parameters']);
const isRecord=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exactFields=(v,keys)=>isRecord(v)&&Object.keys(v).every(k=>keys.has(k));
const SCHEMA_KEYS=new Set(['type','properties','required','additionalProperties','items','enum','minimum','maximum','minLength','maxLength','minItems','maxItems','format','title','description','default']);
const SCHEMA_TYPES=new Set(['object','array','string','integer','number','boolean']);
const BAD_KEYS=new Set(['__proto__','prototype','constructor']);
function validSchema(schema,depth=0){
 if(!isRecord(schema)||depth>8||!SCHEMA_TYPES.has(schema.type)||Object.keys(schema).some(k=>BAD_KEYS.has(k)||!SCHEMA_KEYS.has(k)&&!k.startsWith('x-')))return false;
 for(const key of ['minimum','maximum','minLength','maxLength','minItems','maxItems'])if(schema[key]!==undefined&&!Number.isFinite(schema[key]))return false;
 if(schema.enum!==undefined&&(!Array.isArray(schema.enum)||!schema.enum.length||schema.enum.length>64))return false;
 if(schema.format!==undefined&&!['date','email'].includes(schema.format))return false;
 if(schema.type==='object'){
  if(!isRecord(schema.properties)||Object.keys(schema.properties).length>64||schema.additionalProperties!==false)return false;
  if(Object.keys(schema.properties).some(k=>BAD_KEYS.has(k)||!k||k.length>100))return false;
  if(schema.required!==undefined&&(!Array.isArray(schema.required)||schema.required.length>64||new Set(schema.required).size!==schema.required.length||schema.required.some(k=>typeof k!=='string'||!Object.hasOwn(schema.properties,k))))return false;
  return Object.values(schema.properties).every(child=>validSchema(child,depth+1));
 }
 if(schema.type==='array')return validSchema(schema.items,depth+1);
 return schema.properties===undefined&&schema.required===undefined&&schema.additionalProperties===undefined&&schema.items===undefined;
}
function validMessages(messages){
 const previous=new Set();let textSize=0,user=false;
 for(const m of messages){
  if(!exactFields(m,MESSAGE_FIELDS)||!['system','user','tool','assistant'].includes(m.role))return false;
  if(typeof m.content!=='string'&&!(m.role==='assistant'&&m.content===null))return false;
  if(typeof m.content==='string'){textSize+=m.content.length;if(textSize>24000)return false;}
  if(m.role==='user')user=true;
  if(m.tool_calls!==undefined){
   if(m.role!=='assistant'||!Array.isArray(m.tool_calls)||m.tool_calls.length>8)return false;
   for(const call of m.tool_calls){
    if(!exactFields(call,CALL_FIELDS)||call.type!=='function'||typeof call.id!=='string'||!call.id||call.id.length>100||previous.has(call.id))return false;
    const fn=call.function;
    if(!exactFields(fn,FN_FIELDS)||typeof fn.name!=='string'||!/^\w{1,100}$/.test(fn.name)||typeof fn.arguments!=='string'||fn.arguments.length>8000)return false;
    previous.add(call.id);
   }
  }
  if(m.role==='tool'&&(typeof m.tool_call_id!=='string'||!previous.has(m.tool_call_id)))return false;
  if(m.tool_call_id!==undefined&&m.role!=='tool')return false;
 }
 return user;
}
function validTools(tools){
 return tools.every(t=>exactFields(t,TOOL_FIELDS)&&t.type==='function'&&exactFields(t.function,TOOL_FN_FIELDS)&&
  typeof t.function.name==='string'&&/^\w{1,100}$/.test(t.function.name)&&
  typeof t.function.description==='string'&&t.function.description.length<=2000&&
  validSchema(t.function.parameters)&&t.function.parameters.type==='object');
}
function safePayload(data,model){
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!['model','messages','tools','stream','max_tokens','stream_options'].includes(k))||
    data.model!==model||data.stream!==true||!Array.isArray(data.messages)||data.messages.length<1||data.messages.length>32||
    !validMessages(data.messages)||
    !Array.isArray(data.tools)||data.tools.length>16||!validTools(data.tools)||
    !Number.isInteger(data.max_tokens)||data.max_tokens<64||data.max_tokens>1024||
    data.stream_options?.include_usage!==true||Object.keys(data.stream_options??{}).some(k=>k!=='include_usage'))return false;
 return true;
}
export function createGateway({token,model,upstreamPort,fetchImpl=fetch,timeoutMs=30000}={}){
 const config=validateGatewayConfig({token,model,upstreamPort}),expected=sha('Bearer '+config.token);
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('GATEWAY_TIMEOUT_CONFIG');
 let active=0;
 const server=http.createServer(async(req,res)=>{
  const fail=(status)=>{if(!res.headersSent){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify({error:{code:'GATEWAY_UNAVAILABLE'}}));}else res.destroy();};
  if(req.method!=='POST'||req.url!=='/v1/chat/completions'){fail(404);return;}
  const values=req.headersDistinct?.authorization??[];
  if(!Array.isArray(values)||values.length!==1||!timingSafeEqual(sha(values[0]),expected)||
     !String(req.headers['content-type']??'').toLowerCase().startsWith('application/json')||
     req.headers.origin!==undefined){fail(403);return;}
  if(Number(req.headers['content-length'])>MAX_BODY){fail(413);return;}
  let bytes=0,parts=[];
  try{
   for await(const chunk of req){bytes+=chunk.byteLength;if(bytes>MAX_BODY)throw Error('SIZE');parts.push(chunk);}
  }catch{fail(413);return;}
  let value;try{value=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{fail(400);return;}
  if(!safePayload(value,config.model)){fail(400);return;}
  if(active>=2){fail(429);return;}
  active++;
  // Loopback-only target is constructed, never supplied by request or publication.
  const target='http://127.0.0.1:'+config.upstreamPort+'/v1/chat/completions';
  const controller=new AbortController();
  const deadline=setTimeout(()=>controller.abort(),timeoutMs);
  const close=()=>controller.abort();
  res.on('close',close);
  try{
   const upstream=await fetchImpl(target,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),signal:controller.signal});
   if(controller.signal.aborted)throw Error('UPSTREAM_TIMEOUT');
   if(!upstream.ok||upstream.redirected||!upstream.headers.get('content-type')?.toLowerCase().includes('text/event-stream')||!upstream.body){fail(502);return;}
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   let streamed=0;
   const reader=upstream.body.getReader();
   const aborted=new Promise((_,reject)=>{const stop=()=>reject(Error('UPSTREAM_CANCELLED'));controller.signal.addEventListener('abort',stop,{once:true});if(controller.signal.aborted)stop();});
   aborted.catch(()=>{});
   try{
    for(;;){
     const {done,value:chunk}=await Promise.race([reader.read(),aborted]);
     if(done)break;
     if(!(chunk instanceof Uint8Array)||chunk.byteLength>MAX_STREAM-streamed)throw Error('UPSTREAM_SIZE');
     streamed+=chunk.byteLength;
     if(!res.write(Buffer.from(chunk)))await Promise.race([
      new Promise((resolve,reject)=>{res.once('drain',resolve);res.once('close',reject);}),
      aborted
     ]);
    }
   }finally{
    void reader.cancel().catch(()=>{});
    try{reader.releaseLock();}catch{}
   }
   res.end();
  }catch{fail(502);}
  finally{clearTimeout(deadline);res.off('close',close);controller.abort();active--;}
 });
 server.requestTimeout=10000;
 server.headersTimeout=10000;
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const port=Number(process.env.SUTRA_GATEWAY_PORT??8443),upstreamPort=Number(process.env.SUTRA_GATEWAY_UPSTREAM_PORT??11434);
  if(!validPort(port))throw Error('GATEWAY_PORT');
  const gateway=createGateway({token:process.env.SUTRA_GATEWAY_TOKEN,model:process.env.SUTRA_GATEWAY_MODEL,upstreamPort});
  // No 0.0.0.0 option: a separate operator-managed HTTPS reverse proxy/tunnel is mandatory.
  gateway.listen(port,'127.0.0.1',()=>console.log('SUTRA local inference gateway listening on loopback port '+port+'; no public TLS endpoint created.'));
 }catch{console.error('Local inference gateway configuration rejected.');process.exitCode=1;}
}
