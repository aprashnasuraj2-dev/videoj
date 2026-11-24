// Separate operator-owned loopback gateway. No cloud deployment, model download,
// or external network contact happens when this module is imported.
import http from 'node:http';
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
function safePayload(data,model){
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!['model','messages','tools','stream','max_tokens','stream_options'].includes(k))||
    data.model!==model||data.stream!==true||!Array.isArray(data.messages)||data.messages.length<1||data.messages.length>32||
    !data.messages.every(m=>m&&typeof m==='object'&&!Array.isArray(m)&&typeof m.role==='string'&&['system','user','tool','assistant'].includes(m.role))||
    !Array.isArray(data.tools)||data.tools.length>16||
    !Number.isInteger(data.max_tokens)||data.max_tokens<64||data.max_tokens>1024||
    data.stream_options?.include_usage!==true||Object.keys(data.stream_options??{}).some(k=>k!=='include_usage'))return false;
 return true;
}
export function createGateway({token,model,upstreamPort,fetchImpl=fetch}={}){
 const config=validateGatewayConfig({token,model,upstreamPort}),expected=sha('Bearer '+config.token);
 return http.createServer(async(req,res)=>{
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
  // Loopback-only target is constructed, never supplied by request or publication.
  const target='http://127.0.0.1:'+config.upstreamPort+'/v1/chat/completions';
  const controller=new AbortController();
  const deadline=setTimeout(()=>controller.abort(),30000);
  const close=()=>controller.abort();
  res.on('close',close);
  try{
   const upstream=await fetchImpl(target,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),signal:controller.signal});
   if(!upstream.ok||upstream.redirected||!upstream.headers.get('content-type')?.toLowerCase().includes('text/event-stream')||!upstream.body){fail(502);return;}
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   let streamed=0;
   for await(const chunk of upstream.body){
    streamed+=chunk.byteLength;if(streamed>MAX_STREAM)throw Error('UPSTREAM_SIZE');
    if(!res.write(Buffer.from(chunk)))await new Promise((resolve,reject)=>{res.once('drain',resolve);res.once('close',reject);});
   }
   res.end();
  }catch{fail(502);}
  finally{clearTimeout(deadline);res.off('close',close);controller.abort();}
 });
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const port=Number(process.env.SUTRA_GATEWAY_PORT??8443),upstreamPort=Number(process.env.SUTRA_GATEWAY_UPSTREAM_PORT??11434);
  if(!validPort(port))throw Error('GATEWAY_PORT');
  const gateway=createGateway({token:process.env.SUTRA_GATEWAY_TOKEN,model:process.env.SUTRA_GATEWAY_MODEL,upstreamPort});
  // No 0.0.0.0 option: a separate operator-managed HTTPS reverse proxy/tunnel is mandatory.
  gateway.listen(port,'127.0.0.1',()=>console.log('SUTRA local inference gateway listening on loopback port '+port+'; no public TLS endpoint created.'));
 }catch{console.error('Local inference gateway configuration rejected.');process.exitCode=1;}
}
