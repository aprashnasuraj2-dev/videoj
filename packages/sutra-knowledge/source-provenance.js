// Optional acquisition metadata in the pinned reviewed-source record.
// The report pin is a retained reference, NOT publisher authenticity or raw-byte replay.
const fail=()=>{throw TypeError('PROVENANCE_SCHEMA');};
const keys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
const pin=x=>typeof x==='string'&&/^sha256:[a-f0-9]{64}$/.test(x);
const url=x=>typeof x==='string'&&x.length<=2048&&/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?][^\u0000-\u0020\u007f#\\]*)?$/.test(x);
const timestamp=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const enc=new TextEncoder();
const int=x=>Number.isSafeInteger(x)&&x>=0&&!Object.is(x,-0);
function boundary(s,n){return int(n)&&n<=s.length&&!(n>0&&n<s.length&&/[\ud800-\udbff]/.test(s[n-1])&&/[\udc00-\udfff]/.test(s[n]));}
const span=(text,start,end,allowEmpty=false)=>boundary(text,start)&&boundary(text,end)&&(allowEmpty?end>=start:end>start);
export function validateSourceProvenance(p,text,sourceDigest){
 if(!keys(p,['version','reportPin','documentId','sourceDigest','rawDigest','requestedUrl','finalUrl','retrievedAt','mediaType','parser','extractionTruncated','pages','passages'])||p.version!==1||!pin(p.reportPin)||!pin(p.rawDigest)||!pin(p.sourceDigest)||p.sourceDigest!==sourceDigest||typeof p.documentId!=='string'||!/^source_[1-9][0-9]{0,3}$/.test(p.documentId)||!url(p.requestedUrl)||!url(p.finalUrl)||!timestamp(p.retrievedAt)||!['text/plain','text/html','text/csv','application/json','application/pdf'].includes(p.mediaType)||typeof p.parser!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,79}$/.test(p.parser)||typeof p.extractionTruncated!=='boolean'||!Array.isArray(p.pages)||p.pages.length>128||!Array.isArray(p.passages)||p.passages.length>64||typeof text!=='string')fail();
 let prior=0,lastPage=0;
 for(const row of p.pages){if(!keys(row,['page','start','end'])||!int(row.page)||row.page<=lastPage||!span(text,row.start,row.end,true)||row.start<prior)fail();prior=row.end;lastPage=row.page;}
 if(p.mediaType==='application/pdf'?!p.pages.length:p.pages.length!==0)fail();
 const seen=new Set();
 for(const row of p.passages){
  if(!keys(row,['start','end','byteStart','byteEnd','page','quote'])||!span(text,row.start,row.end)||!int(row.byteStart)||!int(row.byteEnd)||row.byteStart!==enc.encode(text.slice(0,row.start)).length||row.byteEnd!==enc.encode(text.slice(0,row.end)).length||row.quote!==text.slice(row.start,row.end)||row.quote.length>4000)fail();
  const key=row.start+':'+row.end;if(seen.has(key))fail();seen.add(key);
  if(p.mediaType==='application/pdf'){if(!p.pages.some(x=>x.page===row.page&&x.start<=row.start&&x.end>=row.end))fail();}else if(row.page!==null)fail();
 }
 return p;
}
