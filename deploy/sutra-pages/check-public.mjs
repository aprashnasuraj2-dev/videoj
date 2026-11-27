// Independent read-only exact-origin public observation. No credentials, POST,
// redirects, deployment authority, or inference consumption. A matching result
// is not a live model test or a rollback exercise.
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {V2_STATIC_CSP,GUIDE_ORIGIN} from '../../apps/sutra-v2/static-headers.mjs';
import {parseUniqueJson} from '../../packages/sutra-consent/strict-json.js';
const PUBLIC='https://sutra.aafnaipatro.com',PROBE_ORIGIN='https://neutral-check.invalid',MAX=1024*1024;
const root=dirname(fileURLToPath(import.meta.url));
const artifacts=['agents/agent-manifest.json','agents/investigation.network.json','agents/reviewed-investigation.network.json','agents/peer-investigation.network.json','agents/links.json'];
const guideArtifacts=['agents/agent-manifest.json','agents/checklist.network.json','agents/links.json'];
const digest=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Object.assign(Error(code),{code});};
async function boundedGet(url,fetchImpl,accept,limit=MAX){
 const signal=AbortSignal.timeout(6000);
 const response=await fetchImpl(url,{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',headers:{Accept:accept,Origin:PROBE_ORIGIN},signal});
 let reader;
 try{
  if(response.status!==200||response.url!==url||response.redirected||response.headers.has('content-range'))fail('HTTP_OR_REDIRECT');
  if(!String(response.headers.get('content-type')??'').toLowerCase().startsWith(accept)||Number(response.headers.get('content-length'))>limit)fail('CONTENT_TYPE_OR_SIZE');
  reader=response.body?.getReader();if(!reader)fail('NO_BODY');const chunks=[];let count=0;
  while(true){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>limit)fail('SIZE');chunks.push(value);}
  return {bytes:Buffer.concat(chunks),headers:response.headers};
 }finally{if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}else try{await response.body?.cancel();}catch{}}
}
export async function observePublic({fetchImpl=fetch,candidate=resolve(root,'dist'),guide=resolve(root,'../../apps/sutra-peer/dist'),expectedModel=null}={}){
 if(expectedModel!==null&&(typeof expectedModel!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(expectedModel)))fail('MODEL_EXPECTATION');
 const checks=[];
 async function check(name,fn){try{checks.push({name,status:'passed',...await fn()});}catch(e){checks.push({name,status:'failed',reason:/^[A-Z_]{1,64}$/.test(e?.code??'')?e.code:'UNAVAILABLE_OR_INVALID'});}}
 // Use a bounded number of parallel GETs to prevent sequential timeout inflation.
 const files=[...artifacts.map(p=>[PUBLIC,candidate,p]),...guideArtifacts.map(p=>[GUIDE_ORIGIN,guide,p])];
 for(let i=0;i<files.length;i+=3)await Promise.all(files.slice(i,i+3).map(([origin,dir,p])=>check(origin+'/'+p,async()=>{
  const expected=await readFile(resolve(dir,p));const {bytes,headers}=await boundedGet(origin+'/'+p,fetchImpl,'application/json',65536);
  if(headers.get('access-control-allow-origin')!=='*'||headers.has('access-control-allow-credentials'))fail('PUBLIC_CORS');
  parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes),{maxChars:65536,maxDepth:32});
  if(digest(bytes)!==digest(expected))fail('ARTIFACT_DRIFT');
  return {sha256:digest(bytes),cors:'wildcard_without_credentials'};
 })));
 await check('canonical public entry and CSP',async()=>{
  const expected=await readFile(resolve(candidate,'index.html')),url=PUBLIC+'/';
  const {bytes,headers}=await boundedGet(url,fetchImpl,'text/html');
  if(headers.get('content-security-policy')!==V2_STATIC_CSP.replace("connect-src 'self';","connect-src 'self' "+GUIDE_ORIGIN+";"))fail('CSP_DRIFT');
  if(headers.has('access-control-allow-origin')||headers.has('access-control-allow-credentials'))fail('UNEXPECTED_CORS');
  if(digest(bytes)!==digest(expected))fail('ARTIFACT_DRIFT');return {sha256:digest(bytes)};
 });
 await check('public router status',async()=>{
  const {bytes,headers}=await boundedGet(PUBLIC+'/api/status',fetchImpl,'application/json',8192);
  if(headers.has('access-control-allow-origin')||headers.has('access-control-allow-credentials'))fail('ROUTER_CORS');
  const data=parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes),{maxChars:8192,maxDepth:16});
  if(expectedModel===null){if(data.inference!=='disabled')fail('UNEXPECTED_INFERENCE_CONFIGURATION');return {inference:'disabled'};}
  if(data.inference!=='configured'||data.model!==expectedModel||data.routerBase!=='/api/v1'||data.publisherFunded!==true||data.byok!==false||!['hosted','self_hosted'].includes(data.backend)||!/^[a-f0-9]{64}$/.test(data.inferenceContractId??''))fail('ROUTER_CONTRACT');
  return {inference:'configured',model:data.model,backend:data.backend,inferenceContractId:data.inferenceContractId};
 });
 return {schema:'sutra-public-observation/v1',observedAt:new Date().toISOString(),status:checks.every(c=>c.status==='passed')?'matched':'not_verified',checks,releaseAuthority:'NONE',qualification:'Read-only GET observations relative to the supplied candidate bytes; no browser invocation, actual inference, rollback or identity proof.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length>2||args.some(x=>!x.startsWith('--expect-model=')&&x!=='--observe'))throw Error('Usage: node check-public.mjs [--observe] [--expect-model=approved-model]');
 const expectedModel=args.find(x=>x.startsWith('--expect-model='))?.slice(15)??null;
 const report=await observePublic({expectedModel});console.log(JSON.stringify(report,null,2));if(report.status!=='matched'&&!args.includes('--observe'))process.exitCode=1;
}
