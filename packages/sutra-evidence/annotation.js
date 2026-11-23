/** SUTRA Web Annotation media-evidence profile.
 * Standards-shaped annotation + a small integrity sidecar. Byte equality is not truth.
 */
export const PROFILE_ID='urn:sutra:evidence:web-annotation-media:0.1';
export const ANNOTATION_CONTEXT='http://www.w3.org/ns/anno.jsonld';
export const MEDIA_FRAGMENTS='http://www.w3.org/TR/media-frags/';
const SRI=/^sha256-[A-Za-z0-9+/]{43}=$/;
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value);
const error=(code,path)=>({code,path});
const iri=value=>{if(typeof value==='string'&&/^urn:[A-Za-z0-9][A-Za-z0-9:._-]{1,240}$/.test(value))return true;try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&!u.hash;}catch{return false;}};
function contextIncludes(value,target){return value===target||Array.isArray(value)&&value.includes(target);}
export function parseMediaFragment(value){
 if(typeof value!=='string')return null;
 const m=/^t=(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/.exec(value);
 if(!m)return null;const start=Number(m[1]),end=Number(m[2]);
 return Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start?{start,end}:null;
}
export function cueHref(annotation){
 const checked=validateAnnotationProfile(annotation);
 if(!checked.valid)throw new Error('Invalid SUTRA evidence annotation.');
 return checked.cueHref;
}
export function validateAnnotationProfile(annotation,{manifest}={}){
 const errors=[],fail=(code,path)=>errors.push(error(code,path));
 if(!isObject(annotation))return {valid:false,level:'invalid',errors:[error('ANNOTATION_TYPE','')]};
 if(!contextIncludes(annotation['@context'],ANNOTATION_CONTEXT))fail('CONTEXT','@context');
 if(annotation.type!=='Annotation')fail('ANNOTATION_TYPE','type');
 if(!iri(annotation.id))fail('ANNOTATION_ID','id');
 if(annotation.motivation!=='linking')fail('MOTIVATION','motivation');
 if(!validDate(annotation.created))fail('DATE','created');
 if(!isObject(annotation.generator)||annotation.generator.id!==PROFILE_ID)fail('PROFILE','generator.id');
 if(annotation.generator.type!=='Software')fail('PROFILE','generator.type');
 const body=annotation.body;
 if(!isObject(body)||body.type!=='TextualBody')fail('BODY','body');
 else{
  if(!iri(body.id))fail('BODY_ID','body.id');
  if(body.purpose!=='describing')fail('BODY_PURPOSE','body.purpose');
  if(body.format!=='text/plain')fail('BODY_FORMAT','body.format');
  if(typeof body.value!=='string'||!body.value.trim()||body.value.length>4000)fail('BODY_VALUE','body.value');
  if(body.language!==undefined&&(typeof body.language!=='string'||!/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(body.language)))fail('BODY_LANGUAGE','body.language');
 }
 const target=annotation.target;let fragment=null,sourceId=null;
 if(!isObject(target)||target.type!=='SpecificResource')fail('TARGET','target');
 else{
  const source=target.source;
  if(!isObject(source)||!iri(source.id)||!['Video','Audio'].includes(source.type)||typeof source.format!=='string'||!source.format.includes('/'))fail('SOURCE','target.source');
  else sourceId=source.id;
  const selector=target.selector;
  if(!isObject(selector)||selector.type!=='FragmentSelector'||selector.conformsTo!==MEDIA_FRAGMENTS)fail('SELECTOR','target.selector');
  else{fragment=parseMediaFragment(selector.value);if(!fragment)fail('FRAGMENT','target.selector.value');}
 }
 if(errors.length)return {valid:false,level:'invalid',errors};
 const cueHrefValue=`${sourceId}#${target.selector.value}`;
 if(manifest===undefined)return {valid:true,level:'annotation_shape',errors:[],fragment,sourceId,cueId:body.id,cueHref:cueHrefValue};
 const manifestCheck=validateIntegrityManifest(manifest,{sourceId});
 if(!manifestCheck.valid)return {valid:false,level:'invalid',errors:manifestCheck.errors,fragment,sourceId,cueId:body.id,cueHref:cueHrefValue};
 return {valid:true,level:'manifest_bound',errors:[],fragment,sourceId,cueId:body.id,cueHref:cueHrefValue,resources:manifestCheck.resources};
}
export function validateIntegrityManifest(manifest,{sourceId}={}){
 const errors=[],fail=(code,path)=>errors.push(error(code,path));
 if(!isObject(manifest))return {valid:false,errors:[error('MANIFEST_TYPE','manifest')]};
 if(manifest.version!==1)fail('MANIFEST_VERSION','manifest.version');
 if(manifest.profile!==PROFILE_ID)fail('MANIFEST_PROFILE','manifest.profile');
 if(typeof manifest.sourceVersion!=='string'||!manifest.sourceVersion.trim()||manifest.sourceVersion.length>128)fail('SOURCE_VERSION','manifest.sourceVersion');
 if(!Array.isArray(manifest.resources)||manifest.resources.length<2||manifest.resources.length>16)fail('MANIFEST_RESOURCES','manifest.resources');
 const resources=[];const ids=new Set();let media=0,transcript=0;
 for(const [index,item] of (Array.isArray(manifest.resources)?manifest.resources:[]).entries()){
  const path=`manifest.resources[${index}]`;
  if(!isObject(item)||!iri(item.id)||!['media','transcript'].includes(item.role)||typeof item.integrity!=='string'||!SRI.test(item.integrity)){fail('MANIFEST_RESOURCE',path);continue;}
  if(ids.has(item.id)){fail('DUPLICATE_RESOURCE',path+'.id');continue;}ids.add(item.id);
  if(item.role==='media'){media++;if(sourceId&&item.id!==sourceId)fail('MEDIA_SOURCE_MISMATCH',path+'.id');}
  if(item.role==='transcript')transcript++;
  resources.push({...item});
 }
 if(media!==1)fail('MEDIA_RESOURCE','manifest.resources');
 if(transcript!==1)fail('TRANSCRIPT_RESOURCE','manifest.resources');
 return {valid:errors.length===0,errors,resources};
}
function toBytes(value){
 if(typeof value==='string')return new TextEncoder().encode(value);
 if(value instanceof Uint8Array)return value;
 if(value instanceof ArrayBuffer)return new Uint8Array(value);
 if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength);
 throw new TypeError('Expected string or bytes.');
}
function base64(bytes){
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';
 for(let i=0;i<bytes.length;i+=3){
  const a=bytes[i],b=i+1<bytes.length?bytes[i+1]:0,c=i+2<bytes.length?bytes[i+2]:0,n=(a<<16)|(b<<8)|c;
  out+=alphabet[(n>>18)&63]+alphabet[(n>>12)&63]+(i+1<bytes.length?alphabet[(n>>6)&63]:'=')+(i+2<bytes.length?alphabet[n&63]:'=');
 }return out;
}
export async function sha256Integrity(value){
 const bytes=toBytes(value);if(!globalThis.crypto?.subtle)throw new Error('Web Crypto SHA-256 is unavailable.');
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return 'sha256-'+base64(digest);
}
export async function verifyIntegrity(value,expected){if(typeof expected!=='string'||!SRI.test(expected))return false;return await sha256Integrity(value)===expected;}
function vttSeconds(value){
 const parts=value.split(':');if(parts.length<2||parts.length>3)return NaN;
 const sec=Number(parts.pop()),min=Number(parts.pop()),hour=parts.length?Number(parts.pop()):0;
 return Number.isFinite(sec)&&Number.isFinite(min)&&Number.isFinite(hour)&&min>=0&&min<60&&sec>=0&&sec<60?hour*3600+min*60+sec:NaN;
}
export function parseWebVtt(text){
 if(typeof text!=='string')return [];const normalized=text.replace(/\r\n?/g,'\n');if(!normalized.startsWith('WEBVTT'))return [];
 const blocks=normalized.slice(6).trim().split(/\n{2,}/),cues=[];
 for(const block of blocks){
  const lines=block.split('\n');if(!lines.length||/^(NOTE|STYLE|REGION)(?:\s|$)/.test(lines[0]))continue;
  const timingIndex=lines.findIndex(line=>line.includes('-->'));if(timingIndex<0)continue;
  const id=timingIndex>0?lines.slice(0,timingIndex).join('\n').trim():'';const m=/^(\S+)\s+-->\s+(\S+)/.exec(lines[timingIndex]);if(!m)continue;
  const start=vttSeconds(m[1]),end=vttSeconds(m[2]);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)continue;
  cues.push({id,start,end,text:lines.slice(timingIndex+1).join('\n').trim()});
 }
 return cues;
}
function resourceValue(resources,id){
 if(resources instanceof Map)return resources.get(id);
 if(isObject(resources))return resources[id];
 return undefined;
}
export async function validateEvidenceBytes(annotation,{manifest,resources}={}){
 const base=validateAnnotationProfile(annotation,{manifest});if(!base.valid)return base;
 if(!isObject(resources)&&!(resources instanceof Map))return {...base,level:'manifest_bound',verifiedResources:[],errors:[]};
 const verifiedResources=[],errors=[];let transcriptText=null;
 for(const item of base.resources){
  const value=resourceValue(resources,item.id);if(value===undefined)continue;
  if(!(await verifyIntegrity(value,item.integrity))){errors.push(error('INTEGRITY_MISMATCH',item.role));continue;}
  verifiedResources.push(item.role);
  if(item.role==='transcript')transcriptText=new TextDecoder('utf-8',{fatal:true}).decode(toBytes(value));
 }
 if(errors.length)return {...base,valid:false,level:'invalid',errors,verifiedResources};
 if(transcriptText!==null){
  const cues=parseWebVtt(transcriptText),matches=cues.filter(cue=>cue.id===base.cueId);
  if(matches.length!==1)return {...base,valid:false,level:'invalid',errors:[error(matches.length?'AMBIGUOUS_CUE':'MISSING_CUE','body.id')],verifiedResources};
  const cue=matches[0];
  if(Math.abs(cue.start-base.fragment.start)>0.0005||Math.abs(cue.end-base.fragment.end)>0.0005)return {...base,valid:false,level:'invalid',errors:[error('CUE_RANGE','target.selector.value')],verifiedResources};
  if(cue.text!==annotation.body.value)return {...base,valid:false,level:'invalid',errors:[error('QUOTE_MISMATCH','body.value')],verifiedResources};
 }
 const required=['transcript'];const complete=required.every(role=>verifiedResources.includes(role));
 return {...base,valid:true,level:complete?'transcript_verified':'manifest_bound',errors:[],verifiedResources};
}
