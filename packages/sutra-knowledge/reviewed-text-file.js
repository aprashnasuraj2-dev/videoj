// Exact local UTF-8 text document import. No PDF, OCR, spreadsheet evaluation,
// MIME-based trust, external fetch or automatic numeric extraction.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {sealReviewedDraft} from './reviewed-draft.js';
export const VERSION='sutra-reviewed-text-file/v1';
export const MAX_FILE_BYTES=65536;
const fail=x=>{throw TypeError('TEXT_FILE_'+x);};
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function inspectReviewedTextFile(input){
 if(!(input instanceof Uint8Array)||input.length<1||input.length>MAX_FILE_BYTES)fail('SIZE');
 // Copy bytes before any asynchronous operation so the caller cannot mutate the admitted input.
 const bytes=Uint8Array.from(input);
 let text;try{text=dec.decode(bytes);}catch{fail('UTF8');}
 // Browser textareas normalize CR/CRLF. Refuse rather than silently normalize.
 // Preserve LF, tabs, Unicode and a UTF-8 BOM if present.
 if(!text.trim()||text.length>16384||/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(text))fail('TEXT_PROFILE');
 const roundtrip=enc.encode(text);
 if(roundtrip.length!==bytes.length||roundtrip.some((v,i)=>v!==bytes[i]))fail('BYTE_ROUNDTRIP');
 return freeze({version:VERSION,text,byteLength:bytes.length,utf16Length:text.length,sourceDigest:await casePin(text),qualification:'Exact UTF-8 bytes represented as text; no MIME or filename authority, source authenticity, extraction, interpretation or action authority.'});
}
export async function addReviewedTextFile(draftText,input,{sourceId,lineage,sourceDigest}){
 if(!id(sourceId)||!id(lineage))fail('IDENTITY');
 const doc=await inspectReviewedTextFile(input);
 if(doc.sourceDigest!==sourceDigest)fail('SOURCE_PIN');
 const old=parseUniqueJson(draftText,{maxChars:262144,maxDepth:8});
 await sealReviewedDraft(draftText);
 const draft={...old,sources:[...old.sources,{id:sourceId,lineage,text:doc.text}]};
 const sealed=await sealReviewedDraft(JSON.stringify(draft));
 return freeze({version:VERSION,sourceId,sourceDigest:doc.sourceDigest,byteLength:doc.byteLength,draft,contractText:sealed.contractText,contractPin:sealed.pin,admittedNewBindings:0,decisionAuthority:'NONE',qualification:doc.qualification});
}
