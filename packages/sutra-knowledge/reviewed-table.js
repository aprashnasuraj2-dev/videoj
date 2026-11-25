// Restricted TSV paste: preserve every original character and reviewed cell span.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {sealReviewedDraft} from './reviewed-draft.js';
export const VERSION='sutra-reviewed-table/v1';
const fail=x=>{throw TypeError('TABLE_'+x);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export function inspectReviewedTable(sourceText){
 if(typeof sourceText!=='string'||!sourceText.trim()||sourceText.length>16384||/[\r\u0000\ud800-\udfff]/u.test(sourceText))fail('TEXT');
 // This is a deliberately narrow unquoted TSV profile, not CSV or spreadsheet evaluation.
 const lines=sourceText.split('\n');if(lines.at(-1)==='')lines.pop();
 if(lines.length<2||lines.length>129)fail('ROWS');
 let offset=0,width=null;
 const rows=lines.map((line,row)=>{
  let start=offset;const fields=line.split('\t');
  if(width===null)width=fields.length;
  if(width<2||width>16||fields.length!==width)fail('RECTANGULAR');
  const cells=fields.map((value,column)=>{
   const cell={row,column,text:value,start,end:start+value.length};
   start+=value.length+1;return cell;
  });
  offset+=line.length+1;return cells;
 });
 const headers=rows[0].map(c=>c.text);
 if(headers.some(h=>!h.trim())||new Set(headers).size!==headers.length)fail('HEADERS');
 return freeze({version:VERSION,headers,rows:rows.slice(1),rowCount:rows.length-1,columnCount:width,qualification:'Exact unquoted tab-separated textarea text, first row headers. No formulas, locale conversion, header interpretation, or automatic numeric admission.'});
}
// An explicit selection envelope binds the exact source bytes and each coordinate.
// All selected cells are admitted by the existing reviewed compiler, atomically.
export async function addReviewedTable(draftText,sourceText,selectionText,selectionPin){
 if(typeof selectionPin!=='string'||await casePin(selectionText)!==selectionPin)fail('SELECTION_PIN');
 const old=parseUniqueJson(draftText,{maxChars:262144,maxDepth:8});
 await sealReviewedDraft(draftText);
 const table=inspectReviewedTable(sourceText),selection=parseUniqueJson(selectionText,{maxChars:65536,maxDepth:8});
 if(!keys(selection,['version','sourceDigest','sourceId','lineage','cells'])||selection.version!==1||selection.sourceDigest!==await casePin(sourceText)||!id(selection.sourceId)||!id(selection.lineage)||!Array.isArray(selection.cells)||!selection.cells.length||selection.cells.length>64)fail('SELECTION');
 const seen=new Set(),coordinates=new Set();
 const bindings=selection.cells.map(s=>{
  if(!keys(s,['id','row','column','type'])||!id(s.id)||seen.has(s.id)||!Number.isSafeInteger(s.row)||!Number.isSafeInteger(s.column)||s.row<1||s.row>table.rowCount||s.column<0||s.column>=table.columnCount)fail('CELL');
  const key=s.row+':'+s.column;if(coordinates.has(key))fail('DUPLICATE_CELL');
  seen.add(s.id);coordinates.add(key);
  const c=table.rows[s.row-1][s.column];if(!c.text.trim()||c.text!==c.text.trim())fail('CELL_TOKEN');
  return {id:s.id,sourceId:selection.sourceId,start:c.start,end:c.end,type:s.type};
 });
 const draft={...old,sources:[...old.sources,{id:selection.sourceId,text:sourceText,lineage:selection.lineage}],bindings:[...old.bindings,...bindings]};
 const sealed=await sealReviewedDraft(JSON.stringify(draft));
 return freeze({version:VERSION,selectionDigest:selectionPin,sourceDigest:selection.sourceDigest,draft,contractText:sealed.contractText,contractPin:sealed.pin,
  selectedCells:selection.cells.map(s=>({id:s.id,row:s.row,column:s.column,header:table.headers[s.column],token:table.rows[s.row-1][s.column].text})),
  decisionAuthority:'NONE',qualification:'Cell coordinates and caller-declared quantity types are bound to exact pasted source bytes. Numeric token admission uses the reviewed compiler. No automatic selection, spreadsheet formula execution, provenance authenticity, or semantic interpretation.'});
}
