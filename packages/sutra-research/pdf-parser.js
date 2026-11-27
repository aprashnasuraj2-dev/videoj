// Linux-only, opt-in PDF extraction. No unsandboxed fallback.
// Deployment must provide trusted, patched system binaries and permit namespaces.
import {spawn} from 'node:child_process';
import {digest} from './research-session.js';
const fail=code=>Object.assign(Error('PDF extraction refused: '+code),{code});
export const PDF_INPUT_BYTES=1048576,PDF_OUTPUT_BYTES=262144;
const command='/usr/bin/prlimit';
const args=Object.freeze([
 '--as=268435456','--cpu=5','--fsize=1048576','--nofile=64','--','/usr/bin/bwrap',
 '--unshare-user','--unshare-pid','--unshare-net','--unshare-ipc','--unshare-uts','--disable-userns',
 '--new-session','--die-with-parent','--cap-drop','ALL','--clearenv',
 '--ro-bind','/usr','/usr','--ro-bind-try','/lib','/lib','--ro-bind-try','/lib64','/lib64',
 '--ro-bind-try','/etc/fonts','/etc/fonts','--ro-bind-try','/etc/ld.so.cache','/etc/ld.so.cache',
 '--proc','/proc','--dev','/dev','--size','16777216','--tmpfs','/tmp','--chdir','/tmp',
 '--setenv','PATH','/usr/bin','--setenv','LANG','C.UTF-8','--setenv','HOME','/tmp',
 '--','/usr/bin/pdftotext','-enc','UTF-8','-layout','-','-'
]);
function validateInput(body){
 if(!Buffer.isBuffer(body)||body.length<8||body.length>PDF_INPUT_BYTES||!body.subarray(0,5).equals(Buffer.from('%PDF-')))throw fail('PDF_INPUT');
}
export function runSandboxedPdf(body,{signal,spawnProcess=spawn,platform=process.platform}={}){
 validateInput(body);if(platform!=='linux')throw fail('PDF_SANDBOX_UNAVAILABLE');
 const active=signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000);
 return new Promise((resolve,reject)=>{
  if(active.aborted){reject(fail('PDF_CANCELLED'));return;}
  let child,done=false,bytes=0,errBytes=0;const chunks=[];
  const finish=(e,v)=>{if(done)return;done=true;active.removeEventListener('abort',cancel);if(e){try{child?.kill('SIGKILL');}catch{}reject(e);}else resolve(v);};
  const cancel=()=>finish(fail('PDF_CANCELLED_OR_TIMEOUT'));
  active.addEventListener('abort',cancel,{once:true});
  try{
   child=spawnProcess(command,[...args],{shell:false,stdio:['pipe','pipe','pipe'],env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8'},cwd:'/tmp',windowsHide:true});
   child.on('error',()=>finish(fail('PDF_SANDBOX_UNAVAILABLE')));
   child.stdin.on('error',()=>finish(fail('PDF_INPUT_PIPE')));
   child.stdout.on('error',()=>finish(fail('PDF_OUTPUT_PIPE')));
   child.stderr.on('error',()=>finish(fail('PDF_OUTPUT_PIPE')));
   child.stdout.on('data',chunk=>{if(done)return;bytes+=chunk.length;if(bytes>PDF_OUTPUT_BYTES){finish(fail('PDF_OUTPUT_LIMIT'));return;}chunks.push(chunk);});
   child.stderr.on('data',chunk=>{errBytes+=chunk.length;if(errBytes>16384)finish(fail('PDF_DIAGNOSTIC_LIMIT'));});
   child.on('close',(code,terminationSignal)=>{if(done)return;if(code!==0||terminationSignal){finish(fail('PDF_SANDBOX_OR_PARSE'));return;}let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,bytes));}catch{finish(fail('PDF_ENCODING'));return;}finish(null,text);});
   if(active.aborted){cancel();return;}child.stdin.end(body);
  }catch{finish(fail('PDF_SANDBOX_UNAVAILABLE'));}
 });
}
export async function extractPdfDocument(body,url,{signal,parse=runSandboxedPdf}={}){
 validateInput(body);if(signal?.aborted)throw fail('PDF_CANCELLED');
 const output=await parse(body,{signal});if(signal?.aborted)throw fail('PDF_CANCELLED');
 if(typeof output!=='string'||Buffer.byteLength(output)>PDF_OUTPUT_BYTES||!output.trim())throw fail('PDF_OUTPUT');
 // Retain page breaks and stable UTF-16 locators into the extraction.
 const text=output.endsWith('\f')?output.slice(0,-1):output,pages=text.split('\f'),pageMap=[];let start=0;
 if(pages.length>200)throw fail('PDF_PAGE_LIMIT');
 for(let i=0;i<pages.length;i++){const end=start+pages[i].length;pageMap.push({page:i+1,startOffset:start,endOffset:end});start=end+1;}
 return Object.freeze({url,mediaType:'application/pdf',rawDigest:digest(body),textDigest:digest(text),text,links:Object.freeze([]),pageMap:Object.freeze(pageMap.map(Object.freeze)),parser:'linux-bwrap-poppler-text/v1',retrievedAt:new Date().toISOString(),metadata:Object.freeze({tableExtraction:'layout text only',ocr:'not_performed'})});
}
