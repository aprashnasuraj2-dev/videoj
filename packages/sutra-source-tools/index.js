import {validateReceipt,snapshotDataRecord,snapshotDataArray} from '../sutra-evidence/index.js';
import {validateData} from '../sutra-runtime/vendor/nsdeploy/actions.js';
const schema=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const text=maxLength=>({type:'string',minLength:1,maxLength});
const number={type:'number',minimum:0,maximum:86400};
const definitions=[
 {name:'search_lesson',description:'Find literal text in the fixed local source catalog, optionally constrained to one source and a containing time interval. Results establish source consistency, not factual truth.',effect:'read',
  inputSchema:schema({query:text(120),sourceId:text(128),start:number,end:number},['query'])},
 {name:'read_cue',description:'Read one exact cue from the fixed local source catalog by source and cue ID.',effect:'read',inputSchema:schema({sourceId:text(128),cueId:text(128)})},
];
export class SourceToolError extends Error{constructor(code){super(`Source tool unavailable (${code}).`);this.code=code;}}
export function createSourceTools(catalog,{now=()=>new Date().toISOString()}={}){
 // Project immutable primitive source/cue fields into an indexed catalog.
 // Registration is O(cues), with one independent singleton validation per cue;
 // exact reads use source/cue maps; literal search counts all matches within the bounded catalog.
 const rows=[],bySource=new Map();let textUnits=0;
 try{
  const sources=snapshotDataArray(catalog,20);
  if(!sources.length)throw new Error('Empty catalog.');
  for(const rawSource of sources){
   const d=snapshotDataRecord(rawSource);
   const source={id:d.id,version:d.version,hash:d.hash,mediaHash:d.mediaHash,duration:d.duration};
   if(typeof source.id!=='string'||bySource.has(source.id)||!Number.isFinite(source.duration)||source.duration<=0)throw new Error('Bad source.');
   const cues=snapshotDataArray(d.cues,500),byCue=new Map(),sourceRows=[];
   bySource.set(source.id,{byCue,rows:sourceRows});
   for(const rawCue of cues){
    const c=snapshotDataRecord(rawCue),cue={id:c.id,start:c.start,end:c.end,text:c.text};
    if(typeof cue.text!=='string'||cue.text.length>2000||byCue.has(cue.id))throw new Error('Bad cue.');
    textUnits+=cue.text.length;
    if(textUnits>4_000_000)throw new Error('Catalog text budget exceeded.');
    const row={source,cue,folded:cue.text.normalize('NFKC').toLocaleLowerCase('en')};
    const sample=receipt(row);
    if(validateReceipt(sample,{sources:[{...source,cues:[cue]}]}).level!=='catalog_matched')throw new Error('Invalid source reference.');
    byCue.set(cue.id,row);sourceRows.push(row);rows.push(row);
   }
   // Reject malformed metadata even when the source contains no cues.
   if(!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(source.id)||typeof source.version!=='string'||!source.version.trim()||source.version.length>128||
      typeof source.hash!=='string'||!/^[a-f0-9]{64}$/.test(source.hash)||typeof source.mediaHash!=='string'||!/^[a-f0-9]{64}$/.test(source.mediaHash))throw new Error('Bad metadata.');
  }
 }catch{throw new SourceToolError('CATALOG');}
 function receipt({source,cue}){
  const value={version:1,sourceId:source.id,sourceVersion:source.version,sourceHash:source.hash,mediaHash:source.mediaHash,cueId:cue.id,start:cue.start,end:cue.end,excerpt:cue.text,retrievedAt:now(),verification:'unverified'};
  if(validateReceipt(value,{sources:[{...source,cues:[cue]}]}).level!=='catalog_matched')throw new SourceToolError('CATALOG');
  return value;
 }
 return {
  list(){return structuredClone(definitions);},
  call(name,args){const definition=definitions.find(d=>d.name===name);if(!definition)throw new SourceToolError('UNKNOWN_TOOL');try{args=snapshotDataRecord(args,8);validateData(definition.inputSchema,args);}catch{throw new SourceToolError('ARGUMENTS');}
   let matches,filters={};if(name==='search_lesson'){
    const query=args.query.normalize('NFKC').trim().toLocaleLowerCase('en');if(!query)throw new SourceToolError('ARGUMENTS');
    const hasStart=args.start!==undefined,hasEnd=args.end!==undefined;
    if(hasStart!==hasEnd||hasStart&&(!Number.isFinite(args.start)||!Number.isFinite(args.end)||args.end<=args.start))throw new SourceToolError('ARGUMENTS');
    filters={...(args.sourceId!==undefined?{sourceId:args.sourceId}:{}),...(hasStart?{start:args.start,end:args.end}:{})};
    matches=[];let matchCount=0;
    const candidates=args.sourceId===undefined?rows:bySource.get(args.sourceId)?.rows??[];
    for(const r of candidates){
     if(!r.folded.includes(query)||hasStart&&(r.cue.start<args.start||r.cue.end>args.end))continue;
     matchCount++;
     if(matches.length<5)matches.push(r);
    }
    filters={filters,returnedCount:matches.length,matchCount,truncated:matchCount>matches.length};
   }else{const row=bySource.get(args.sourceId)?.byCue.get(args.cueId);if(!row)throw new SourceToolError('NOT_FOUND');matches=[row];}
   const receipts=matches.map(receipt);const result={version:1,receipts,limit:name==='search_lesson'?5:1,truthStatus:'unverified',...(name==='search_lesson'?{filters:filters.filters,returnedCount:filters.returnedCount,matchCount:filters.matchCount,truncated:filters.truncated}:{})};if(new TextEncoder().encode(JSON.stringify(result)).length>16000)throw new SourceToolError('OUTPUT_SIZE');return result;
  },
 };
}
