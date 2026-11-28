// Fixed public, keyless native transport probes. No model or search credentials.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {admitManifest,authorizeResearch,digest} from './research-session.js';
import {createDocumentReader} from './document-reader.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
const load=()=>parseUniqueJson(readFileSync(new URL('./fixtures/keyless-release-documents.json',import.meta.url),'utf8'),{maxChars:16384,maxDepth:8});
const safe=e=>typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'OPERATION_FAILED';
const fail=code=>{throw Object.assign(Error('Keyless document probe refused: '+code),{code});};
export function previewDocumentProbes(){
 const plan=load();admitManifest(plan.manifestText);
 return {plan,planPin:digest(JSON.stringify(plan))};
}
export function classifyDocumentProbe({expected,document,error,operations}){
 if(expected==='cancel')return !document&&operations.length===0&&['INACTIVE','CANCELLED','CANCELLED_OR_TIMEOUT'].includes(error)?'PASS':'FAIL';
 if(expected==='ROBOTS')return !document&&error==='ROBOTS'&&operations.every(x=>x.kind!=='document')?'PASS':'FAIL';
 if(expected==='NOT_FOUND')return !document&&error==='NOT_FOUND'&&operations.some(x=>x.kind==='document')?'PASS':'FAIL';
 if(!document||error||!/^sha256:[0-9a-f]{64}$/.test(document.rawDigest)||!/^sha256:[0-9a-f]{64}$/.test(document.textDigest)||typeof document.text!=='string'||!document.text.trim())return 'FAIL';
 if(expected==='redirect')return document.redirectChain.length>0?'PASS':'FAIL';
 return document.mediaType===expected?'PASS':'FAIL';
}
export async function executeDocumentProbes({approvedPlanPin,approvePublicContact=false,approveEstimatedCost=false}={}){
 const {plan,planPin}=previewDocumentProbes();
 if(approvedPlanPin!==planPin||!approvePublicContact||!approveEstimatedCost)fail('SUITE_APPROVAL');
 const rows=[];
 for(const c of plan.cases){
  const p=admitManifest(plan.manifestText),controller=new AbortController(),ops=[],start=performance.now();
  const a=authorizeResearch(plan.manifestText,{approvedPlanPin:p.planPin,approvePublicContact:true,approveEstimatedCost:true,signal:controller.signal});
  let document,error=null;
  try{
   const reader=createDocumentReader({authorization:a});
   if(c.expected==='cancel')controller.abort();
   document=await reader(c.url,{signal:controller.signal,beforeDispatch:async op=>{ops.push({kind:op.kind,url:op.url});}});
  }catch(e){error=safe(e);}
  finally{a.close();}
  const outcome=classifyDocumentProbe({expected:c.expected,document,error,operations:ops});
  rows.push({id:c.id,url:c.url,expected:c.expected,outcome,error,operations:ops,usage:a.usage(),document:document?{finalUrl:document.finalUrl,mediaType:document.mediaType,rawDigest:document.rawDigest,textDigest:document.textDigest,textLength:document.text.length,parser:document.parser,retrievedAt:document.retrievedAt,redirectChain:document.redirectChain}:null,durationMs:Math.round(performance.now()-start),authority:'NONE'});
 }
 return {schema:'sutra-keyless-document-receipt/v1',planPin,rows,authority:'NONE',qualification:'Actual native reader, no injected transport; scheduled operations do not attest successful network contact. No raw source or error bodies. This direct URL probe does not prove search discovery, truth or license clearance.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [mode,pin,...flags]=process.argv.slice(2);
  if(mode==='--plan'&&pin===undefined)console.log(JSON.stringify(previewDocumentProbes(),null,2));
  else if(mode==='--run'&&flags.length===2&&new Set(flags).size===2&&flags.includes('--approve-public-contact')&&flags.includes('--approve-estimated-cost')){
   const r=await executeDocumentProbes({approvedPlanPin:pin,approvePublicContact:true,approveEstimatedCost:true});console.log(JSON.stringify(r,null,2));
   // Both JSON candidates are recorded; a successful strict application/json from either is sufficient for the media class.
   if(r.rows.some(x=>!['json','json-alternative'].includes(x.id)&&x.outcome!=='PASS')||!r.rows.some(x=>['json','json-alternative'].includes(x.id)&&x.outcome==='PASS'))process.exitCode=1;
  }else fail('SUITE_COMMAND');
 }catch(e){console.error(JSON.stringify({error:safe(e)}));process.exitCode=1;}
}
