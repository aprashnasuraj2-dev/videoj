import {snapshotDataRecord,snapshotDataArray} from '../sutra-evidence/index.js';
const SHA=/^[a-f0-9]{64}$/,ID=/^[A-Za-z][A-Za-z0-9._:-]{0,127}$/;
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys,required=keys)=>plain(o)&&Object.keys(o).every(k=>keys.includes(k))&&required.every(k=>Object.hasOwn(o,k));
const safeText=(v,n)=>typeof v==='string'&&v.trim()&&v.length<=n&&!/[\u0000-\u001f\u007f]/.test(v);
const safeRelative=v=>typeof v==='string'&&v.length<=240&&!v.startsWith('/')&&!v.includes('\\')&&!v.includes('?')&&!v.split('/').some(x=>x==='..'||x==='');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
const boundedJson=async({url,origin,fetchImpl,signal,maxBytes})=>{
 const response=await fetchImpl(url,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',headers:{Accept:'application/json'},signal});
 if(!response.ok||!response.headers.get('content-type')?.toLowerCase().includes('application/json')||response.url&&new URL(response.url).origin!==origin)throw Error('CONTENT_RESPONSE');
 if(Number(response.headers.get('content-length'))>maxBytes)throw Error('CONTENT_SIZE');
 const reader=response.body?.getReader();if(!reader)throw Error('CONTENT_BODY');let total=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes)throw Error('CONTENT_SIZE');chunks.push(value);}}finally{void reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(total);let off=0;for(const c of chunks){bytes.set(c,off);off+=c.length;}
 let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('CONTENT_JSON');}
 if(!plain(data))throw Error('CONTENT_JSON');return {data,bytes};
};
const validSource=source=>plain(source)&&ID.test(source.id??'')&&safeText(source.version,128)&&SHA.test(source.hash??'')&&SHA.test(source.mediaHash??'')&&Number.isFinite(source.duration)&&source.duration>0&&source.duration<=86400&&Array.isArray(source.cues)&&source.cues.length>0&&source.cues.length<=500&&new Set(source.cues.map(x=>x?.id)).size===source.cues.length&&source.cues.every(c=>plain(c)&&ID.test(c.id??'')&&Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start>=0&&c.end>c.start&&c.end<=source.duration&&safeText(c.text,2000));
const validGuide=claim=>claim===null||plain(claim)&&claim.sourceKind==='guide'&&ID.test(claim.sourceId??'')&&safeText(claim.sourceVersion,100)&&safeText(claim.title,120)&&safeText(claim.scope,160)&&ID.test(claim.claimKey??'')&&(safeText(claim.value,120)||Number.isFinite(claim.value)||typeof claim.value==='boolean')&&safeText(claim.excerpt,1200)&&safeText(claim.provenance,240)&&safeRelative(claim.sourceHref)&&claim.sourceHref.includes('#')&&SHA.test(claim.sourceHash??'');
export function validateContentProfile(profile,catalog){
 try{
  const p=snapshotDataRecord(profile,16),catalogRef=snapshotDataRecord(p.catalog,4),media=snapshotDataRecord(p.media,8),ui=snapshotDataRecord(p.ui,4);
  const guide=p.guideClaim===null?null:snapshotDataRecord(p.guideClaim,20);
  const c=snapshotDataRecord(catalog,8),rawSources=snapshotDataArray(c.sources,20),sources=rawSources.map(raw=>{
   const s=snapshotDataRecord(raw,10),rawCues=snapshotDataArray(s.cues,500),cues=rawCues.map(rawCue=>{
    const cue=snapshotDataRecord(rawCue,8);return {id:cue.id,start:cue.start,end:cue.end,text:cue.text};
   });
   return {id:s.id,version:s.version,hash:s.hash,mediaHash:s.mediaHash,duration:s.duration,cues};
  });
  profile={schema:p.schema,mode:p.mode,contentVersion:p.contentVersion,title:p.title,primarySourceId:p.primarySourceId,featuredCueId:p.featuredCueId,catalog:{path:catalogRef.path,sha256:catalogRef.sha256},media:{video:media.video,poster:media.poster,chapters:media.chapters,captions:media.captions},guideClaim:guide?{...guide}:null,ui:{noticeTitle:ui.noticeTitle,noticeBody:ui.noticeBody}};
  catalog={schema:c.schema,contentVersion:c.contentVersion,sources};
 }catch{throw Error('CONTENT_DATA');}
 if(!exact(profile,['schema','mode','contentVersion','title','primarySourceId','featuredCueId','catalog','media','guideClaim','ui'])||profile.schema!==1||!['synthetic','reviewed'].includes(profile.mode)||!safeText(profile.contentVersion,100)||!safeText(profile.title,160)||!ID.test(profile.primarySourceId??'')||!ID.test(profile.featuredCueId??''))throw Error('CONTENT_PROFILE');
 if(!exact(profile.catalog,['path','sha256'])||!safeRelative(profile.catalog.path)||!SHA.test(profile.catalog.sha256??''))throw Error('CONTENT_CATALOG_REF');
 if(!exact(profile.media,['video','poster','chapters','captions'])||Object.values(profile.media).some(x=>!safeRelative(x)))throw Error('CONTENT_MEDIA');
 if(!validGuide(profile.guideClaim)||profile.mode==='reviewed'&&profile.guideClaim===null)throw Error('CONTENT_GUIDE');
 if(!exact(profile.ui,['noticeTitle','noticeBody'])||!safeText(profile.ui.noticeTitle,120)||!safeText(profile.ui.noticeBody,400))throw Error('CONTENT_UI');
 if(!exact(catalog,['schema','contentVersion','sources'])||catalog.schema!==1||catalog.contentVersion!==profile.contentVersion||!Array.isArray(catalog.sources)||catalog.sources.length<1||catalog.sources.length>20||!catalog.sources.every(validSource)||new Set(catalog.sources.map(s=>s.id)).size!==catalog.sources.length)throw Error('CONTENT_CATALOG');
 const source=catalog.sources.find(s=>s.id===profile.primarySourceId),cue=source?.cues.find(c=>c.id===profile.featuredCueId);
 if(!source||!cue)throw Error('CONTENT_PRIMARY');
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
  if(!plain(profile.catalog)||!safeRelative(profile.catalog.path)||!SHA.test(profile.catalog.sha256??''))throw Error('CONTENT_CATALOG_REF');
  const catalogUrl=new URL(profile.catalog.path,base);if(catalogUrl.origin!==base.origin||!catalogUrl.pathname.startsWith(base.pathname))throw Error('CONTENT_CATALOG_REF');
  const catalogResult=await boundedJson({url:catalogUrl.href,origin:base.origin,fetchImpl,signal:controller.signal,maxBytes:262144});
  if(await hash(catalogResult.bytes)!==profile.catalog.sha256)throw Error('CONTENT_CATALOG_HASH');
  const validated=validateContentProfile(profile,catalogResult.data);
  return freeze({...validated,artifacts:{profile:new URL('content-profile.json',base).href,catalog:catalogUrl.href,catalogSha256:profile.catalog.sha256}});
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort();}
}
export function receiptForFeatured(content,{retrievedAt=new Date().toISOString()}={}){
 const {source,featuredCue}=content;if(!source||!featuredCue)throw Error('CONTENT_PRIMARY');
 return freeze({version:1,sourceId:source.id,sourceVersion:source.version,sourceHash:source.hash,mediaHash:source.mediaHash,cueId:featuredCue.id,start:featuredCue.start,end:featuredCue.end,excerpt:featuredCue.text,retrievedAt,verification:'unverified'});
}
