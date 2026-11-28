// Browser-only, no new network authority. A report digest is integrity evidence,
// not publisher authentication. Only exact extracted source text enters the draft.
import {validateSourceProvenance} from '../../../packages/sutra-knowledge/source-provenance.js';
const pin=/^sha256:[a-f0-9]{64}$/;
const fail=code=>{throw Error('RESEARCH_HANDOFF_'+code);};
const encoder=new TextEncoder();
async function digest(text){return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function prepareAutonomousSourceCandidate({report,reportPin,sourceId,citation}={}){
 if(!report||report.schema!=='sutra-autonomous-research-report/v1'||report.state!=='closed'||report.authority!=='NONE'||!pin.test(reportPin??'')||typeof sourceId!=='string'||!Array.isArray(report.documents)||report.documents.length>500)fail('REPORT');
 const raw=JSON.stringify(report);if(raw.length>33554432||encoder.encode(raw).length>33554432)fail('REPORT_PIN');
 // Capture all inputs before the first asynchronous digest. Validate and use
 // only the verified snapshot, never mutable original report references.
 const selected=citation===undefined?null:JSON.parse(JSON.stringify(citation));
 if(await digest(raw)!==reportPin)fail('REPORT_PIN');
 report=JSON.parse(raw);
 const rows=report.documents.filter(d=>d?.id===sourceId);if(rows.length!==1)fail('SOURCE');
 const d=rows[0],text=d.text,url=d.finalUrl??d.url;
 if(typeof text!=='string'||!text.trim()||text.length>16384||/[\r\u0000\ud800-\udfff]/u.test(text)||encoder.encode(text).length>16384)fail('SOURCE_SIZE_OR_TEXT');
 for(const address of [d.url,url]){
  if(typeof address!=='string'||address.length>2048||/[\u0000-\u0020\u007f]/.test(address))fail('SOURCE_URL');
  let parsed;try{parsed=new URL(address);}catch{fail('SOURCE_URL');}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.hash)fail('SOURCE_URL');
 }
 if(!pin.test(d.textDigest??'')||await digest(text)!==d.textDigest)fail('SOURCE_PIN');
 const pages=(d.pageMap??[]).map(p=>({page:p.page,start:p.startOffset,end:p.endOffset}));
 const passages=(report.passages??[]).filter(p=>p.sourceId===sourceId).map(p=>{const l=p.locator;if(p.sourceDigest!==d.textDigest||l?.coordinateSystem!=='utf16-extracted-text'||!Number.isSafeInteger(l.startOffset)||!Number.isSafeInteger(l.endOffset)||text.slice(l.startOffset,l.endOffset)!==p.supportingText)fail('PASSAGE');return {start:l.startOffset,end:l.endOffset,byteStart:encoder.encode(text.slice(0,l.startOffset)).length,byteEnd:encoder.encode(text.slice(0,l.endOffset)).length,page:l.page??null,quote:p.supportingText};});
 const provenance=validateSourceProvenance({version:1,reportPin,documentId:sourceId,sourceDigest:d.textDigest,rawDigest:d.rawDigest,requestedUrl:d.url,finalUrl:url,retrievedAt:d.retrievedAt,mediaType:d.mediaType,parser:d.parser,extractionTruncated:d.extractionTruncated===true,pages,passages},text,d.textDigest);
 let selection=null;
 if(selected){
  const candidates=(report.intelligence?.claims??[]).filter(c=>c.id===selected.claimId&&c.publicationStatus!=='withheld_from_findings');
  if(candidates.length!==1||!Number.isSafeInteger(selected.index)||selected.index<0)fail('CLAIM');
  const cite=candidates[0].citations?.[selected.index],l=cite?.locator;
  if(!cite||cite.sourceId!==sourceId||cite.sourceDigest!==d.textDigest||l?.coordinateSystem!=='utf16-extracted-text'||!Number.isSafeInteger(l.startOffset)||!Number.isSafeInteger(l.endOffset)||l.startOffset<0||l.endOffset<=l.startOffset||l.endOffset>text.length||text.slice(l.startOffset,l.endOffset)!==cite.quote||!passages.some(p=>p.start<=l.startOffset&&p.end>=l.endOffset&&p.page===(l.page??null)))fail('CITATION');
  selection=Object.freeze({start:l.startOffset,end:l.endOffset,quote:cite.quote,claimId:selected.claimId});
 }
 Object.freeze(provenance);for(const row of [...provenance.pages,...provenance.passages])Object.freeze(row);Object.freeze(provenance.pages);Object.freeze(provenance.passages);
 return Object.freeze({selection,provenance,id:'research_'+d.textDigest.slice(7,39),lineage:'unverified_external',text,sourceId,sourceDigest:d.textDigest,reportPin,url,extractionTruncated:d.extractionTruncated===true,truthStatus:'UNVERIFIED',adoption:'NONE'});
}
