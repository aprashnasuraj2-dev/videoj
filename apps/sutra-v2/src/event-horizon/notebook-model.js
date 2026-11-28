import {parseUniqueJson} from '../../../../packages/sutra-consent/strict-json.js';

export const NOTEBOOK_LIMITS=Object.freeze({notes:80,body:2000,quote:1000,source:65536,archive:262144});
export const noteKinds=Object.freeze(['observation','hypothesis','counterexample','question','decision']);
export const noteStates=Object.freeze(['open','reviewed','withdrawn']);
const identifier=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const pinPattern=/^sha256:[a-f0-9]{64}$/;
const fail=code=>{throw Error(code);};
const validId=x=>typeof x==='string'&&identifier.test(x)&&!['constructor','prototype','__proto__'].includes(x);
const clean=(text,max)=>typeof text==='string'&&text.length<=max&&!/[\ud800-\udfff]/u.test(text);
function freeze(x){
 if(x&&typeof x==='object'){
  for(const v of Object.values(x))freeze(v);
  Object.freeze(x);
 }
 return x;
}
function keys(x,expected){
 return x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===expected.length&&expected.every(k=>Object.hasOwn(x,k));
}
async function pin(text){
 const data=new TextEncoder().encode(text);
 return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join('');
}
export function captureNotebookSources(workspace){
 if(!workspace)return [];
 const list=[{id:'question',lineage:'question',text:workspace.question??''},...(workspace.sources??[])];
 const seen=new Set();
 const valid=[];
 for(const s of list){
  if(!validId(s.id)||seen.has(s.id)||!clean(s.text,NOTEBOOK_LIMITS.source)||!clean(s.lineage,160))continue;
  seen.add(s.id);
  valid.push(Object.freeze({id:s.id,lineage:s.lineage,text:s.text}));
 }
 return Object.freeze(valid);
}
function validBoundary(text,i){
 if(i<=0||i>=text.length)return true;
 const a=text.charCodeAt(i-1),b=text.charCodeAt(i);
 return !(a>=0xd800&&a<=0xdbff&&b>=0xdc00&&b<=0xdfff);
}
export async function anchorSelection(source,start,end,version=null){
 if(!source||!validId(source.id)||!clean(source.text,NOTEBOOK_LIMITS.source)||!clean(source.lineage,160)||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>source.text.length||end-start>NOTEBOOK_LIMITS.quote||!validBoundary(source.text,start)||!validBoundary(source.text,end)||version!==null&&!pinPattern.test(version))fail('NOTEBOOK_SELECTION');
 return freeze({sourceId:source.id,lineage:source.lineage,start,end,quote:source.text.slice(start,end),sourcePin:await pin(source.text),version});
}
function validateAnchor(a){
 if(!keys(a,['sourceId','lineage','start','end','quote','sourcePin','version'])||!validId(a.sourceId)||!clean(a.lineage,160)||!Number.isSafeInteger(a.start)||!Number.isSafeInteger(a.end)||a.start<0||a.end<=a.start||a.end>NOTEBOOK_LIMITS.source||a.end-a.start>NOTEBOOK_LIMITS.quote||!clean(a.quote,NOTEBOOK_LIMITS.quote)||a.quote.length!==a.end-a.start||!pinPattern.test(a.sourcePin)||a.version!==null&&!pinPattern.test(a.version))fail('NOTEBOOK_ANCHOR');
 return freeze({...a});
}
function validateNote(n){
 if(!keys(n,['id','kind','state','body','anchor'])||!validId(n.id)||!noteKinds.includes(n.kind)||!noteStates.includes(n.state)||!clean(n.body,NOTEBOOK_LIMITS.body)||!n.body.trim())fail('NOTEBOOK_NOTE');
 return freeze({...n,anchor:n.anchor===null?null:validateAnchor(n.anchor)});
}
export async function inspectAnchor(anchor,sources,version=null){
 if(!anchor)return {status:'unanchored',positions:[]};
 validateAnchor(anchor);
 const source=sources.find(s=>s.id===anchor.sourceId);
 if(!source)return {status:'source_missing',positions:[]};
 const currentPin=await pin(source.text);
 if(currentPin===anchor.sourcePin&&source.lineage===anchor.lineage&&source.text.slice(anchor.start,anchor.end)===anchor.quote){
  return {status:anchor.version===version?'exact_current':'exact_text_version_changed',positions:[anchor.start],currentPin};
 }
 // Finding a quote in changed text is only a suggested re-selection.
 // Never move an annotation automatically; repeated matches remain ambiguous.
 const positions=[];
 let offset=0;
 while(offset<=source.text.length&&positions.length<21){
  const i=source.text.indexOf(anchor.quote,offset);
  if(i<0)break;
  positions.push(i);
  offset=i+Math.max(1,anchor.quote.length);
 }
 return {status:positions.length===0?'quote_missing':positions.length===1?'changed_unique_match':'changed_multiple_matches',positions:positions.slice(0,20),truncated:positions.length>20,currentPin};
}
export function createNotebook(initial=[]){
 let notes=freeze(initial.map(validateNote));
 if(notes.length>NOTEBOOK_LIMITS.notes||new Set(notes.map(n=>n.id)).size!==notes.length)fail('NOTEBOOK_LIMIT');
 let revision=0;
 let counter=0;
 function snapshot(){return Object.freeze({revision,notes});}
 function nextId(){
  let id;
  do{id='note_'+(++counter);}while(notes.some(n=>n.id===id));
  return id;
 }
 function add({kind,body,anchor=null}){
  if(notes.length>=NOTEBOOK_LIMITS.notes)fail('NOTEBOOK_LIMIT');
  const note=validateNote({id:nextId(),kind,state:'open',body,anchor});
  notes=freeze([...notes,note]);
  revision++;
  return note;
 }
 function update(id,patch){
  const current=notes.find(n=>n.id===id);
  if(!current||!patch||Object.keys(patch).some(k=>!['kind','state','body','anchor'].includes(k)))fail('NOTEBOOK_UPDATE');
  const note=validateNote({...current,...patch});
  notes=freeze(notes.map(n=>n.id===id?note:n));
  revision++;
  return note;
 }
 function remove(id){
  if(!notes.some(n=>n.id===id))fail('NOTEBOOK_ID');
  notes=freeze(notes.filter(n=>n.id!==id));
  revision++;
 }
 function replace(next){
  if(!Array.isArray(next)||next.length>NOTEBOOK_LIMITS.notes)fail('NOTEBOOK_LIMIT');
  const data=next.map(validateNote);
  if(new Set(data.map(n=>n.id)).size!==data.length)fail('NOTEBOOK_DUPLICATE');
  notes=freeze(data);
  revision++;
  return snapshot();
 }
 return Object.freeze({snapshot,add,update,remove,replace});
}
export function exportNotebook(notes){
 if(!Array.isArray(notes)||notes.length>NOTEBOOK_LIMITS.notes)fail('NOTEBOOK_LIMIT');
 const text=JSON.stringify({schema:'sutra-evidence-notebook/v1',notes:notes.map(validateNote)});
 if(text.length>NOTEBOOK_LIMITS.archive)fail('NOTEBOOK_ARCHIVE_LIMIT');
 return text;
}
export function parseNotebook(text){
 const data=parseUniqueJson(text,{maxChars:NOTEBOOK_LIMITS.archive,maxDepth:10});
 if(!keys(data,['schema','notes'])||data.schema!=='sutra-evidence-notebook/v1'||!Array.isArray(data.notes))fail('NOTEBOOK_ARCHIVE');
 return createNotebook(data.notes).snapshot().notes;
}
export function filterNotes(notes,{kind='all',state='all',query=''}={}){
 const q=String(query).trim().toLowerCase().slice(0,100);
 return notes.filter(n=>(kind==='all'||n.kind===kind)&&(state==='all'||n.state===state)&&(!q||[n.id,n.body,n.anchor?.quote,n.anchor?.sourceId].filter(Boolean).some(s=>s.toLowerCase().includes(q))));
}
export function notebookSummary(notes){
 const kinds=Object.fromEntries(noteKinds.map(k=>[k,0]));
 const states=Object.fromEntries(noteStates.map(k=>[k,0]));
 let anchored=0;
 for(const n of notes){
  kinds[n.kind]++;
  states[n.state]++;
  if(n.anchor)anchored++;
 }
 return {total:notes.length,kinds,states,anchored};
}
