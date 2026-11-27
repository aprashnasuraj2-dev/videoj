// Trusted local browser bridge. Binds only to literal loopback, rejects foreign
// Host/Origin and requires a process-random same-origin token for API actions.
import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
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
export function createResearchWorkspaceServer({gateway,dist,port=8787,loopbackPeerOrigin}={}){
 if(!gateway||typeof dist!=='string'||!Number.isSafeInteger(port)||port<0||port>65535)throw err('SERVER_CONFIG');
 let policy=csp;if(loopbackPeerOrigin!==undefined){const u=new URL(loopbackPeerOrigin);if(u.origin!==loopbackPeerOrigin||u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!u.port)throw err('PEER_ORIGIN');policy=csp.replace("connect-src 'self';","connect-src 'self' "+u.origin+";");}
 const root=resolve(dist),token=randomBytes(32).toString('hex');let origin;
 const server=createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',policy);res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
  try{
   if(!origin||req.headers.host!==new URL(origin).host||req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))return send(res,403,{error:'LOCAL_ORIGIN'});
   const u=new URL(req.url,origin);if(u.origin!==origin)return send(res,403,{error:'LOCAL_ORIGIN'});
   const path=u.pathname;
   if(path.startsWith('/api/research/')){
    if(path==='/api/research/capabilities'&&req.method==='GET')return send(res,200,{...gateway.capabilities(),sessionToken:token});
    const supplied=req.headers['x-sutra-session'];
    if(typeof supplied!=='string'||supplied.length!==token.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(token)))return send(res,403,{error:'LOCAL_TOKEN'});
    if(req.method==='POST'&&req.headers.origin!==origin)return send(res,403,{error:'LOCAL_ORIGIN'});
    if(path==='/api/research/preview'&&req.method==='POST')return send(res,200,gateway.preview(await body(req)));
    if(path==='/api/research/start'&&req.method==='POST')return send(res,202,gateway.start(await body(req)));
    if(path==='/api/research/status'&&req.method==='GET')return send(res,200,gateway.status(u.searchParams.get('id'),Number(u.searchParams.get('after')??0)));
    if(path==='/api/research/cancel'&&req.method==='POST'){const b=await body(req);if(!b||Object.keys(b).length!==1||typeof b.sessionId!=='string')throw err('SESSION_ID');return send(res,200,gateway.cancel(b.sessionId));}
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
 return Object.freeze({server,async listen(){await new Promise((ok,bad)=>{server.once('error',bad);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',bad);ok();});});origin='http://127.0.0.1:'+server.address().port;return origin;},async close(){gateway.close();await new Promise(ok=>server.close(ok));}});
}
if(process.argv[1]&&new URL(import.meta.url).pathname===resolve(process.argv[1])){
 const gateway=createLocalResearchGateway({modelCredentials:Object.fromEntries(Object.entries(MODEL_PROFILES).map(([v,p])=>[v,process.env[p.env]])),searchCredentials:{brave:process.env.SUTRA_SEARCH_BRAVE,tavily:process.env.SUTRA_SEARCH_TAVILY}});
 const dist=new URL('./dist/',import.meta.url).pathname,app=createResearchWorkspaceServer({gateway,dist});
 console.log('SUTRA local research workspace: '+await app.listen());
 const stop=()=>void app.close().then(()=>process.exit(0));process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
