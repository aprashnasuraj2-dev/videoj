// Browser-only, no new network authority. A report digest is integrity evidence,
// not publisher authentication. Only exact extracted source text enters the draft.
const pin=/^sha256:[a-f0-9]{64}$/;
const fail=code=>{throw Error('RESEARCH_HANDOFF_'+code);};
const encoder=new TextEncoder();
async function digest(text){return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function prepareAutonomousSourceCandidate({report,reportPin,sourceId}={}){
 if(!report||report.schema!=='sutra-autonomous-research-report/v1'||report.state!=='closed'||report.authority!=='NONE'||!pin.test(reportPin??'')||typeof sourceId!=='string'||!Array.isArray(report.documents)||report.documents.length>500)fail('REPORT');
 const raw=JSON.stringify(report);if(raw.length>33554432||encoder.encode(raw).length>33554432||await digest(raw)!==reportPin)fail('REPORT_PIN');
 const rows=report.documents.filter(d=>d?.id===sourceId);if(rows.length!==1)fail('SOURCE');
 const d=rows[0],text=d.text,url=d.finalUrl??d.url;
 if(typeof text!=='string'||!text.trim()||text.length>16384||/[\r\u0000\ud800-\udfff]/u.test(text)||encoder.encode(text).length>16384)fail('SOURCE_SIZE_OR_TEXT');
 if(typeof url!=='string'||url.length>2048||/[\u0000-\u0020\u007f]/.test(url))fail('SOURCE_URL');
 let parsed;try{parsed=new URL(url);}catch{fail('SOURCE_URL');}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password)fail('SOURCE_URL');
 if(!pin.test(d.textDigest??'')||await digest(text)!==d.textDigest)fail('SOURCE_PIN');
 return Object.freeze({id:'research_'+d.textDigest.slice(7,39),lineage:'unverified_external',text,sourceId,sourceDigest:d.textDigest,reportPin,url,extractionTruncated:d.extractionTruncated===true,truthStatus:'UNVERIFIED',adoption:'NONE'});
}
