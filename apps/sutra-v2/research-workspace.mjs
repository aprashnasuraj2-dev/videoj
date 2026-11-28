// Trusted local browser bridge. Binds only to literal loopback, rejects foreign
// Host/Origin and requires a process-random same-origin token for API actions.
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile,stat,realpath} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {parseUniqueJson} from '../../packages/sutra-consent/strict-json.js';
import {createLocalResearchGateway} from '../../packages/sutra-research/local-workspace-gateway.js';
import {MODEL_PROFILES} from '../../packages/sutra-research/model-broker.js';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.wasm':'application/wasm','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8','.pyz':'application/octet-stream','.sha256':'text/plain; charset=utf-8'};
const csp="default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; worker-src 'self' blob:; connect-src 'self'; frame-src 'none'; manifest-src 'self'";
const err=code=>Object.assign(Error(code),{code});
async function body(req){
 if(req.headers['content-type']!=='application/json')throw err('CONTENT_TYPE');
 const parts=[];let size=0;for await(const x of req){size+=x.length;if(size>16384)throw err('BODY_SIZE');parts.push(x);}
 try{return parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)),{maxChars:16384,maxDepth:8});}catch{throw err('JSON');}
}
function send(res,status,value){
 const raw=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','Content-Length':Buffer.byteLength(raw)});res.end(raw);
}
export function createResearchWorkspaceServer({gateway,dist,port=8787,loopbackPeerOrigin,clock=()=>Date.now(),tokenTtlMs=900000}={}){
 if(!gateway||typeof dist!=='string'||!Number.isSafeInteger(port)||port<0||port>65535||typeof clock!=='function'||!Number.isSafeInteger(tokenTtlMs)||tokenTtlMs<120000||tokenTtlMs>1800000)throw err('SERVER_CONFIG');
 let policy=csp;if(loopbackPeerOrigin!==undefined){const u=new URL(loopbackPeerOrigin);if(u.origin!==loopbackPeerOrigin||u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!u.port)throw err('PEER_ORIGIN');policy=csp.replace("connect-src 'self';","connect-src 'self' "+u.origin+";");}
 const root=resolve(dist),tokens=new Map();let origin,previewOwner=null,sessionOwner=null,webPreviewOwner=null,webSessionOwner=null,lastClock=-1;
 const now=()=>{const t=clock();if(!Number.isSafeInteger(t)||t<lastClock||t<0||t>Number.MAX_SAFE_INTEGER-tokenTtlMs)throw err('LOCAL_CLOCK');lastClock=t;return t;};
 const prune=t=>{for(const [token,entry] of tokens){if(t>=entry.expiresAt){tokens.delete(token);if(previewOwner===token)previewOwner=null;if(sessionOwner?.token===token)sessionOwner=null;if(webPreviewOwner===token)webPreviewOwner=null;if(webSessionOwner?.token===token)webSessionOwner=null;}}};
 const readToken=req=>{const supplied=req.headers['x-sutra-session'];return typeof supplied==='string'&&/^[a-f0-9]{64}$/.test(supplied)?supplied:null;};
 const tokenFor=(req,t)=>{const existing=readToken(req);if(existing&&tokens.has(existing)&&tokens.get(existing).expiresAt-t>=120000)return existing;if(tokens.size>=32)throw err('LOCAL_TOKEN_CAPACITY');const token=randomBytes(32).toString('hex');tokens.set(token,{expiresAt:t+tokenTtlMs});return token;};
 const server=createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',policy);res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
  try{
   if(!origin||req.headers.host!==new URL(origin).host||req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))return send(res,403,{error:'LOCAL_ORIGIN'});
   const u=new URL(req.url,origin);if(u.origin!==origin)return send(res,403,{error:'LOCAL_ORIGIN'});
   const path=u.pathname;
   if(path.startsWith('/api/research/')){
    const t=now();prune(t);
    if(!['/api/research/status','/api/research/web/status'].includes(path)&&u.search)return send(res,400,{error:'API_QUERY'});
    if(path==='/api/research/capabilities'&&req.method==='GET'){const token=tokenFor(req,t);return send(res,200,{...gateway.capabilities(),sessionToken:token,sessionTokenExpiresAt:tokens.get(token).expiresAt});}
    if(path==='/api/research/web/capabilities'&&req.method==='GET'){const token=tokenFor(req,t);return send(res,200,{...gateway.web.capabilities(),sessionToken:token,sessionTokenExpiresAt:tokens.get(token).expiresAt});}
    const supplied=readToken(req);
    if(!supplied||!tokens.has(supplied))return send(res,403,{error:'LOCAL_TOKEN'});
    if(req.method==='POST'&&req.headers.origin!==origin)return send(res,403,{error:'LOCAL_ORIGIN'});
    // Recheck token expiry after asynchronous body reads, before any host action.
    const active=()=>{const at=now();prune(at);if(!tokens.has(supplied))throw err('LOCAL_TOKEN');return at;};
    if(path==='/api/research/web/auto/start'&&req.method==='POST'){
     const input=await body(req),at=active();
     if(tokens.get(supplied).expiresAt-at<120000)return send(res,403,{error:'LOCAL_TOKEN_EXPIRES'});
     // Capability is limited to this local operator session and the host's public-URL policy.
     const run=gateway.web.autoStart(input,{actor:'user'});
     webPreviewOwner=null;webSessionOwner={token:supplied,id:run.sessionId};
     return send(res,202,run);
    }
    if(path==='/api/research/web/preview'&&req.method==='POST'){
     const input=await body(req);active();const p=gateway.web.preview(input,{actor:'user'});webPreviewOwner=supplied;return send(res,200,p);
    }
    if(path==='/api/research/web/start'&&req.method==='POST'){
     const input=await body(req),at=active();if(webPreviewOwner!==supplied)return send(res,403,{error:'LOCAL_APPROVAL_OWNER'});
     if(tokens.get(supplied).expiresAt-at<120000)return send(res,403,{error:'LOCAL_TOKEN_EXPIRES'});
     const s=gateway.web.start(input);webPreviewOwner=null;webSessionOwner={token:supplied,id:s.sessionId};return send(res,202,s);
    }
    if(path==='/api/research/web/status'&&req.method==='GET'){
     if(u.searchParams.getAll('id').length!==1||[...u.searchParams.keys()].some(k=>k!=='id'))return send(res,400,{error:'API_QUERY'});
     const id=u.searchParams.get('id');if(webSessionOwner?.token!==supplied||webSessionOwner.id!==id)return send(res,403,{error:'LOCAL_SESSION_OWNER'});
     return send(res,200,gateway.web.status(id));
    }
    if(path==='/api/research/web/cancel'&&req.method==='POST'){
     const input=await body(req);active();
     if(!input||Object.keys(input).length!==1||typeof input.sessionId!=='string')throw err('SESSION_ID');
     if(webSessionOwner?.token!==supplied||webSessionOwner.id!==input.sessionId)return send(res,403,{error:'LOCAL_SESSION_OWNER'});
     return send(res,200,gateway.web.cancel(input.sessionId));
    }
    if(path==='/api/research/auto/start'&&req.method==='POST'){
     const input=await body(req),at=active();
     if(tokens.get(supplied).expiresAt-at<120000)return send(res,403,{error:'LOCAL_TOKEN_EXPIRES'});
     const run=gateway.startAutonomous(input,{actor:'user'});
     previewOwner=null;sessionOwner={token:supplied,id:run.sessionId};
     return send(res,202,run);
    }
    if(path==='/api/research/preview'&&req.method==='POST'){
     const input=await body(req);active();const p=gateway.preview(input);previewOwner=supplied;return send(res,200,p);
    }
    if(path==='/api/research/start'&&req.method==='POST'){
     const input=await body(req),at=active();if(previewOwner!==supplied)return send(res,403,{error:'LOCAL_APPROVAL_OWNER'});
     if(tokens.get(supplied).expiresAt-at<120000)return send(res,403,{error:'LOCAL_TOKEN_EXPIRES'});
     const s=gateway.start(input);previewOwner=null;sessionOwner={token:supplied,id:s.sessionId};return send(res,202,s);
    }
    if(path==='/api/research/status'&&req.method==='GET'){
     if([...u.searchParams.keys()].some(k=>!['id','after'].includes(k))||u.searchParams.getAll('id').length!==1||u.searchParams.getAll('after').length>1||!/^(?:0|[1-9][0-9]{0,4})$/.test(u.searchParams.get('after')??'0'))return send(res,400,{error:'API_QUERY'});
     const id=u.searchParams.get('id');if(sessionOwner?.token!==supplied||sessionOwner.id!==id)return send(res,403,{error:'LOCAL_SESSION_OWNER'});
     return send(res,200,gateway.status(id,Number(u.searchParams.get('after')??0)));
    }
    if(path==='/api/research/advance'&&req.method==='POST'){const b=await body(req);active();if(sessionOwner?.token!==supplied||sessionOwner.id!==b?.sessionId)return send(res,403,{error:'LOCAL_SESSION_OWNER'});return send(res,200,gateway.advance(b));}
    if(path==='/api/research/cancel'&&req.method==='POST'){const b=await body(req);active();if(!b||Object.keys(b).length!==1||typeof b.sessionId!=='string')throw err('SESSION_ID');if(sessionOwner?.token!==supplied||sessionOwner.id!==b.sessionId)return send(res,403,{error:'LOCAL_SESSION_OWNER'});return send(res,200,gateway.cancel(b.sessionId));}
    return send(res,404,{error:'API_ROUTE'});
   }
   if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'METHOD'});
   const decoded=decodeURIComponent(path);if(decoded.includes('\0')||decoded.includes('\\'))return send(res,400,{error:'PATH'});
   const file=resolve(root,'.'+(decoded==='/'?'/index.html':decoded)),realRoot=await realpath(root),realFile=await realpath(file);
   if(!realFile.startsWith(realRoot+sep)||!(await stat(realFile)).isFile())return send(res,404,{error:'FILE'});
   const data=await readFile(realFile);res.writeHead(200,{'Content-Type':mime[extname(realFile)]??'application/octet-stream','Cache-Control':'no-store','Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);
  }catch(e){if(!res.headersSent)send(res,e?.code==='ENOENT'?404:400,{error:typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'REFUSED'});else res.end();}
 });
 server.requestTimeout=10000;server.headersTimeout=10000;server.maxHeadersCount=50;server.maxConnections=16;
 return Object.freeze({server,async listen(){await new Promise((ok,bad)=>{server.once('error',bad);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',bad);ok();});});origin='http://127.0.0.1:'+server.address().port;return origin;},async close(){tokens.clear();previewOwner=null;sessionOwner=null;webPreviewOwner=null;webSessionOwner=null;gateway.close();await new Promise(ok=>server.close(ok));}});
}
if(process.argv[1]&&new URL(import.meta.url).pathname===resolve(process.argv[1])){
 const gateway=createLocalResearchGateway({modelCredentials:Object.fromEntries(Object.entries(MODEL_PROFILES).map(([v,p])=>[v,process.env[p.env]])),searchCredentials:{brave:process.env.SUTRA_SEARCH_BRAVE,tavily:process.env.SUTRA_SEARCH_TAVILY,openalex:process.env.SUTRA_SEARCH_OPENALEX,semanticscholar:process.env.SUTRA_SEARCH_SEMANTICSCHOLAR},enableObscura:process.env.SUTRA_ENABLE_OBSCURA==='1',obscuraBinaryPath:process.env.SUTRA_OBSCURA_BIN});
 const dist=new URL('./dist/',import.meta.url).pathname,app=createResearchWorkspaceServer({gateway,dist});
 console.log('SUTRA local research workspace: '+await app.listen());
 const stop=()=>void app.close().then(()=>process.exit(0));process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
