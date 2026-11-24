import {snapshotDataRecord,snapshotDataArray} from '../sutra-evidence/index.js';
export const MAX_REVIEWED_MEDIA_BYTES=24*1024*1024;
const MEDIA_TYPES=new Set(['video/mp4','video/webm']);
const SHA=/^[a-f0-9]{64}$/,ID=/^[A-Za-z][A-Za-z0-9._:-]{0,127}$/;
const validId=v=>typeof v==='string'&&ID.test(v);
const validHash=v=>typeof v==='string'&&SHA.test(v);
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys,required=keys)=>plain(o)&&Object.keys(o).every(k=>keys.includes(k))&&required.every(k=>Object.hasOwn(o,k));
const safeText=(v,n)=>typeof v==='string'&&v.trim()&&v.length<=n&&!/[\u0000-\u001f\u007f]/.test(v);
// Canonical ASCII artifact names only. Reject URL-normalized control characters,
// percent-encoded dot segments and backslashes before any fetch or player mount.
const pathPart=/^[A-Za-z0-9._~-]+$/;
const safeSegments=parts=>parts.every(p=>pathPart.test(p)&&p!=='.'&&p!=='..');
const safeRelative=v=>typeof v==='string'&&v.length<=240&&safeSegments((v.startsWith('./')?v.slice(2):v).split('/'));
const safePublicPath=v=>typeof v==='string'&&v.length<=300&&v.startsWith('/')&&safeSegments(v.split('#',1)[0].slice(1).split('/'));
const safeGuideHref=v=>safePublicPath(v)&&v.includes('#')&&v.indexOf('#')===v.lastIndexOf('#')&&/^[A-Za-z0-9._:-]{1,128}$/.test(v.split('#')[1]);
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
// Public same-origin content reads only; bound decoded bytes, including when
// Content-Length is missing or a compressed wire length understates the body.
export async function readContentBytes({url,origin,fetchImpl=fetch,signal,maxBytes,accept='application/octet-stream'}={}){
 const target=new URL(url);
 const loopback=['127.0.0.1','localhost','[::1]'].includes(target.hostname);
 if(target.origin!==origin||target.protocol!=='https:'&&!(target.protocol==='http:'&&loopback)||target.username||target.password||target.hash||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>(MEDIA_TYPES.has(accept)?MAX_REVIEWED_MEDIA_BYTES:2*1024*1024))throw Error('CONTENT_READ_CONFIG');
 signal?.throwIfAborted();
 let reader,response,received,abort,finished=false;
 // A transport may disregard AbortSignal. Dispose a response arriving after
 // the caller stopped, rather than leaving an unconsumed body running.
 const cancelBody=body=>{try{void Promise.resolve(body?.cancel()).catch(()=>{});}catch{}};
 const stopped=new Promise((_,reject)=>{abort=()=>reject(Error('CONTENT_CANCELLED'));signal?.addEventListener('abort',abort,{once:true});});
 stopped.catch(()=>{});
 try{
  const incoming=Promise.resolve(fetchImpl(target.href,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',headers:{Accept:accept},signal})).then(value=>{
   if(finished||signal?.aborted){cancelBody(value?.body);throw Error('CONTENT_CANCELLED');}
   received=value;return value;
  });
  response=await Promise.race([incoming,stopped]);
  signal?.throwIfAborted();
  if(!response.ok||response.status!==200||response.redirected||response.url&&response.url!==target.href||response.headers.has('content-range'))throw Error('CONTENT_RESPONSE');
  if(MEDIA_TYPES.has(accept)&&response.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()!==accept)throw Error('CONTENT_MEDIA_RESPONSE');
  if(Number(response.headers.get('content-length'))>maxBytes)throw Error('CONTENT_SIZE');
  reader=response.body?.getReader();if(!reader)throw Error('CONTENT_BODY');
  let total=0,buffer=new Uint8Array(Math.min(maxBytes,16384));
  // Geometric growth bounds allocation even if a transport sends millions
  // of tiny chunks. Never retain one object for every incoming fragment.
  for(;;){
   signal?.throwIfAborted();
   const {done,value}=await Promise.race([reader.read(),stopped]);
   signal?.throwIfAborted();if(done)break;
   if(!(value instanceof Uint8Array))throw Error('CONTENT_BODY');
   if(value.byteLength>maxBytes-total)throw Error('CONTENT_SIZE');
   if(!value.byteLength)continue;
   if(total+value.byteLength>buffer.length){
    const next=new Uint8Array(Math.min(maxBytes,Math.max(buffer.length*2,total+value.byteLength)));
    next.set(buffer.subarray(0,total));buffer=next;
   }
   buffer.set(value,total);total+=value.byteLength;
  }
  signal?.throwIfAborted();
  return {response,bytes:buffer.subarray(0,total)};
 }finally{
  finished=true;signal?.removeEventListener('abort',abort);
  if(reader){cancelBody(reader);try{reader.releaseLock();}catch{}}
  else if((response??received)?.body)cancelBody((response??received).body);
 }
}
// Fetch the complete media artifact once, validate the decoded bytes, then let
// the caller mount only a blob from those bytes. A digest-shaped path or a
// matching native duration is not byte verification.
export async function readVerifiedLessonMedia({url,origin,mediaHash,mode,fetchImpl=fetch,signal}={}){
 const target=new URL(url),ext=target.pathname.split('.').pop()?.toLowerCase(),mime=ext==='mp4'?'video/mp4':ext==='webm'?'video/webm':null;
 if(!mime||!validHash(mediaHash)||!['synthetic','reviewed'].includes(mode)||mode==='reviewed'&&!target.pathname.split('/').includes(mediaHash))throw Error('CONTENT_MEDIA_CONFIG');
 const {response,bytes}=await readContentBytes({url:target.href,origin,fetchImpl,signal,maxBytes:mode==='reviewed'?MAX_REVIEWED_MEDIA_BYTES:1024*1024,accept:mime});
 if(response.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()!==mime||!bytes.byteLength)throw Error('CONTENT_MEDIA_RESPONSE');
 if(await hash(bytes)!==mediaHash)throw Error('CONTENT_MEDIA_HASH');
 signal?.throwIfAborted();
 return {bytes,mime};
}
const boundedBytes=readContentBytes;
const boundedJson=async({url,origin,fetchImpl,signal,maxBytes})=>{
 const {response,bytes}=await boundedBytes({url,origin,fetchImpl,signal,maxBytes,accept:'application/json'});
 if(response.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()!=='application/json')throw Error('CONTENT_RESPONSE');
 let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('CONTENT_JSON');}
 if(!plain(data))throw Error('CONTENT_JSON');return {data,bytes};
};
const validSource=source=>plain(source)&&validId(source.id)&&safeText(source.version,128)&&validHash(source.hash)&&validHash(source.mediaHash)&&Number.isFinite(source.duration)&&source.duration>0&&source.duration<=86400&&Array.isArray(source.cues)&&source.cues.length>0&&source.cues.length<=500&&new Set(source.cues.map(x=>x?.id)).size===source.cues.length&&source.cues.every(c=>plain(c)&&validId(c.id)&&Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start>=0&&c.end>c.start&&c.end<=source.duration&&safeText(c.text,2000));
const validVideo=claim=>plain(claim)&&safeText(claim.title,120)&&safeText(claim.scope,160)&&validId(claim.claimKey)&&(safeText(claim.value,120)||Number.isFinite(claim.value)||typeof claim.value==='boolean')&&safeText(claim.provenance,240)&&safeText(claim.dateBasis,120);
const validGuide=claim=>claim===null||plain(claim)&&claim.sourceKind==='guide'&&validId(claim.sourceId)&&safeText(claim.sourceVersion,100)&&safeText(claim.title,120)&&safeText(claim.scope,160)&&validId(claim.claimKey)&&(safeText(claim.value,120)||Number.isFinite(claim.value)||typeof claim.value==='boolean')&&safeText(claim.excerpt,1200)&&safeText(claim.provenance,240)&&safeGuideHref(claim.sourceHref)&&validHash(claim.sourceHash);
// Derive the actual native tracks from the same catalog that binds the receipt.
// WebVTT is millisecond-based; never silently round a source interval or
// transform its text into different wording. Overlap is valid for captions,
// but not chapters, so an overlapping timeline gets no chapter navigation.
export function deriveReviewedTracks(source){
 const {duration,cues}=snapshotDataRecord(source,10);
 if(!Number.isFinite(duration)||duration<=0||duration>86400)throw Error('CONTENT_TRACK_TIMING');
 const millis=value=>{const ms=Math.round(value*1000);if(!Number.isFinite(value)||value<0||Math.abs(value*1000-ms)>1e-7)throw Error('CONTENT_TRACK_TIMING');return ms;};
 const stamp=ms=>[Math.floor(ms/3600000),Math.floor(ms%3600000/60000),Math.floor(ms%60000/1000)].map(x=>String(x).padStart(2,'0')).join(':')+'.'+String(ms%1000).padStart(3,'0');
 const ids=new Set(),rows=snapshotDataArray(cues,500).map(raw=>{
  const {id,start,end,text}=snapshotDataRecord(raw,8);
  if(!validId(id)||ids.has(id)||!safeText(text,2000)||end>duration)throw Error('CONTENT_TRACK_CUE');
  ids.add(id);const a=millis(start),b=millis(end);if(b<=a)throw Error('CONTENT_TRACK_TIMING');
  return {id,a,b,text:text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')};
 }).sort((a,b)=>a.a-b.a||a.b-b.b||(a.id<b.id?-1:a.id>b.id?1:0));
 if(!rows.length)throw Error('CONTENT_TRACK_CUE');
 const vtt=(suffix)=>'WEBVTT\n\n'+rows.map(c=>c.id+suffix+'\n'+stamp(c.a)+' --> '+stamp(c.b)+'\n'+c.text+'\n\n').join('');
 const captions=vtt(''),overlap=rows.some((row,i)=>i>0&&row.a<rows[i-1].b),chapters=overlap?null:vtt('-chapter');
 if(new TextEncoder().encode(captions).length>2*1024*1024||chapters&&new TextEncoder().encode(chapters).length>2*1024*1024)throw Error('CONTENT_TRACK_SIZE');
 return Object.freeze({captions,chapters});
}
export function validateContentProfile(profile,catalog){
 try{
  const p=snapshotDataRecord(profile,24),catalogRef=snapshotDataRecord(p.catalog,4),media=snapshotDataRecord(p.media,8),transcript=snapshotDataRecord(p.transcript,4),ui=snapshotDataRecord(p.ui,4);
  const video=snapshotDataRecord(p.videoClaim,12),guide=p.guideClaim===null?null:snapshotDataRecord(p.guideClaim,20);
  const c=snapshotDataRecord(catalog,8),rawSources=snapshotDataArray(c.sources,20),sources=rawSources.map(raw=>{
   const s=snapshotDataRecord(raw,10),rawCues=snapshotDataArray(s.cues,500),cues=rawCues.map(rawCue=>{
    const cue=snapshotDataRecord(rawCue,8);return {id:cue.id,start:cue.start,end:cue.end,text:cue.text};
   });
   return {id:s.id,version:s.version,hash:s.hash,mediaHash:s.mediaHash,duration:s.duration,cues};
  });
  profile={schema:p.schema,mode:p.mode,contentVersion:p.contentVersion,title:p.title,observedAt:p.observedAt,primarySourceId:p.primarySourceId,featuredCueId:p.featuredCueId,catalog:{path:catalogRef.path,sha256:catalogRef.sha256},transcript:{path:transcript.path,sha256:transcript.sha256},media:{video:media.video,poster:media.poster,chapters:media.chapters,captions:media.captions},videoClaim:{...video},guideClaim:guide?{...guide}:null,ui:{noticeTitle:ui.noticeTitle,noticeBody:ui.noticeBody}};
  catalog={schema:c.schema,contentVersion:c.contentVersion,sources};
 }catch{throw Error('CONTENT_DATA');}
 if(!exact(profile,['schema','mode','contentVersion','title','observedAt','primarySourceId','featuredCueId','catalog','transcript','media','videoClaim','guideClaim','ui'])||profile.schema!==1||!['synthetic','reviewed'].includes(profile.mode)||!safeText(profile.contentVersion,100)||!safeText(profile.title,160)||typeof profile.observedAt!=='string'||!/T.*(?:Z|[+-]\d\d:\d\d)$/.test(profile.observedAt)||!Number.isFinite(Date.parse(profile.observedAt))||!validId(profile.primarySourceId)||!validId(profile.featuredCueId))throw Error('CONTENT_PROFILE');
 if(!exact(profile.catalog,['path','sha256'])||!safeRelative(profile.catalog.path)||!validHash(profile.catalog.sha256))throw Error('CONTENT_CATALOG_REF');
 if(!exact(profile.transcript,['path','sha256'])||!safePublicPath(profile.transcript.path)||profile.transcript.path.includes('#')||!validHash(profile.transcript.sha256))throw Error('CONTENT_TRANSCRIPT');
 if(!exact(profile.media,['video','poster','chapters','captions'])||Object.values(profile.media).some(x=>!safePublicPath(x)||x.includes('#')))throw Error('CONTENT_MEDIA');
 if(!validVideo(profile.videoClaim))throw Error('CONTENT_VIDEO_CLAIM');
 if(!validGuide(profile.guideClaim)||profile.mode==='reviewed'&&profile.guideClaim===null)throw Error('CONTENT_GUIDE');
 if(!exact(profile.ui,['noticeTitle','noticeBody'])||!safeText(profile.ui.noticeTitle,120)||!safeText(profile.ui.noticeBody,400))throw Error('CONTENT_UI');
 if(!exact(catalog,['schema','contentVersion','sources'])||catalog.schema!==1||catalog.contentVersion!==profile.contentVersion||!Array.isArray(catalog.sources)||catalog.sources.length<1||catalog.sources.length>20||!catalog.sources.every(validSource)||new Set(catalog.sources.map(s=>s.id)).size!==catalog.sources.length)throw Error('CONTENT_CATALOG');
 // Schema 1 declares exactly one transcript/media artifact binding. An extra
 // catalog source would have no independently bound transcript/media artifact.
 // Multi-source retrieval tools remain available to hosts with their own bindings.
 if(catalog.sources.length!==1)throw Error('CONTENT_UNBOUND_SOURCE');
 const source=catalog.sources.find(s=>s.id===profile.primarySourceId),cue=source?.cues.find(c=>c.id===profile.featuredCueId);
 if(!source||!cue||source.hash!==profile.transcript.sha256)throw Error('CONTENT_PRIMARY');
 if(profile.mode==='reviewed'){
  deriveReviewedTracks(source);
  const addressed=(value,digest)=>value.split('#',1)[0].split('/').includes(digest);
  if(!addressed(profile.media.video,source.mediaHash)||!addressed(profile.transcript.path,source.hash)||!addressed(profile.guideClaim.sourceHref,profile.guideClaim.sourceHash))throw Error('CONTENT_ADDRESSING');
 }
 return freeze({profile:structuredClone(profile),sources:structuredClone(catalog.sources),source:structuredClone(source),featuredCue:structuredClone(cue)});
}
export async function loadContentProfile({baseUrl,fetchImpl=fetch,signal,timeoutMs=5000}={}){
 let base;try{base=new URL(baseUrl);}catch{throw Error('CONTENT_BASE');}
 const loopback=['127.0.0.1','localhost','[::1]'].includes(base.hostname);
 if((base.protocol!=='https:'&&!(base.protocol==='http:'&&loopback))||base.username||base.password||base.search||base.hash)throw Error('CONTENT_BASE');
 if(!base.pathname.endsWith('/'))base.pathname+='/';
 const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,Math.min(Math.max(timeoutMs,1),5000));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 try{
  const profileResult=await boundedJson({url:new URL('content-profile.json',base).href,origin:base.origin,fetchImpl,signal:controller.signal,maxBytes:32768}),profile=profileResult.data;
  if(!plain(profile.catalog)||!safeRelative(profile.catalog.path)||!validHash(profile.catalog.sha256))throw Error('CONTENT_CATALOG_REF');
  const catalogUrl=new URL(profile.catalog.path,base);if(catalogUrl.origin!==base.origin||!catalogUrl.pathname.startsWith(base.pathname))throw Error('CONTENT_CATALOG_REF');
  const catalogResult=await boundedJson({url:catalogUrl.href,origin:base.origin,fetchImpl,signal:controller.signal,maxBytes:262144});
  if(await hash(catalogResult.bytes)!==profile.catalog.sha256)throw Error('CONTENT_CATALOG_HASH');
  const validated=validateContentProfile(profile,catalogResult.data);
  const transcriptUrl=new URL(validated.profile.transcript.path,base.origin);
  if(transcriptUrl.origin!==base.origin||transcriptUrl.search||transcriptUrl.hash)throw Error('CONTENT_TRANSCRIPT');
  const transcriptResult=await boundedBytes({url:transcriptUrl.href,origin:base.origin,fetchImpl,signal:controller.signal,maxBytes:2*1024*1024,accept:'text/plain'});
  if(transcriptResult.response.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()!=='text/plain')throw Error('CONTENT_TRANSCRIPT_TYPE');
  if(await hash(transcriptResult.bytes)!==validated.profile.transcript.sha256)throw Error('CONTENT_TRANSCRIPT_HASH');
  let transcriptText;try{transcriptText=new TextDecoder('utf-8',{fatal:true}).decode(transcriptResult.bytes);}catch{throw Error('CONTENT_TRANSCRIPT_UTF8');}
  for(const cue of validated.source.cues)if(!transcriptText.includes(cue.text))throw Error('CONTENT_TRANSCRIPT_CUE');
  const profileSha256=await hash(profileResult.bytes);controller.signal.throwIfAborted();
  return freeze({...validated,artifacts:{profile:new URL('content-profile.json',base).href,profileSha256,catalog:catalogUrl.href,catalogSha256:profile.catalog.sha256,transcript:transcriptUrl.href,transcriptSha256:validated.profile.transcript.sha256}});
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort();}
}
export function receiptForCue(content,cueId,{retrievedAt}={}){
 const source=content?.source;
 if(typeof cueId!=='string'||!source||!Array.isArray(source.cues))throw Error('CONTENT_CUE');
 const matches=source.cues.filter(cue=>cue.id===cueId);
 if(matches.length!==1)throw Error('CONTENT_CUE');
 const cue=matches[0];
 return freeze({version:1,sourceId:source.id,sourceVersion:source.version,sourceHash:source.hash,mediaHash:source.mediaHash,cueId:cue.id,start:cue.start,end:cue.end,excerpt:cue.text,retrievedAt:retrievedAt??content.profile.observedAt,verification:'unverified'});
}
export function receiptForFeatured(content,options){
 return receiptForCue(content,content?.featuredCue?.id,options);
}
