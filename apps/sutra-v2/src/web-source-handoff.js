// Direct model-free public source handoff into SUTRA reviewed evidence form.
// Caller retains exact report snapshot/digest; no source is admitted automatically.
import {validateSourceProvenance} from '../../../packages/sutra-knowledge/source-provenance.js';
const FAIL=code=>{throw Error('WEB_HANDOFF_'+code);};
const encoder=new TextEncoder();
const sha=/^sha256:[a-f0-9]{64}$/;
async function digest(data){return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(data))),x=>x.toString(16).padStart(2,'0')).join('');}
export async function prepareWebSourceCandidate({report,reportPin,sourceId='source_1'}={}){
 if(!report||report.schema!=='sutra-web-access-result/v1'||report.operation!=='fetch'||report.authority!=='NONE'||!sha.test(reportPin??'')||!Array.isArray(report.documents)||report.documents.length!==1||sourceId!=='source_1')FAIL('REPORT');
 const snapshot=JSON.stringify(report);
 if(encoder.encode(snapshot).length>524288||await digest(snapshot)!==reportPin)FAIL('REPORT_PIN');
 const exact=JSON.parse(snapshot),d=exact.documents[0];
 if(d?.id!==sourceId||d.verificationStatus!=='unverified_public_extraction'||typeof d.text!=='string'||!d.text.trim()||d.text.length>16384||encoder.encode(d.text).length>16384||/[\r\u0000\ud800-\udfff]/u.test(d.text))FAIL('SOURCE');
 if(!sha.test(d.textDigest)||await digest(d.text)!==d.textDigest||!sha.test(d.fullTextDigest)||d.extractionTruncated===false&&d.fullTextDigest!==d.textDigest||!sha.test(d.rawDigest))FAIL('SOURCE_DIGEST');
 const p=validateSourceProvenance({version:1,reportPin,documentId:d.id,sourceDigest:d.textDigest,rawDigest:d.rawDigest,requestedUrl:d.url,finalUrl:d.finalUrl,retrievedAt:d.retrievedAt,mediaType:d.mediaType,parser:d.parser,extractionTruncated:d.extractionTruncated===true,pages:d.mediaType==='application/pdf'?(d.pageMap??[]).map(row=>({page:row.page,start:row.startOffset,end:row.endOffset})):[],passages:[]},d.text,d.textDigest);
 Object.freeze(p.pages);Object.freeze(p.passages);Object.freeze(p);
 return Object.freeze({selection:null,provenance:p,id:'research_'+d.textDigest.slice(7,39),lineage:'unverified_external',text:d.text,sourceId:d.id,sourceDigest:d.textDigest,reportPin,url:d.finalUrl,extractionTruncated:d.extractionTruncated===true,truthStatus:'UNVERIFIED',adoption:'NONE'});
}
