import {validateReceipt} from '../sutra-evidence/index.js';
import {validateData} from '../sutra-runtime/vendor/nsdeploy/actions.js';
const schema=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const text=maxLength=>({type:'string',minLength:1,maxLength});
const number={type:'number',minimum:0,maximum:86400};
const definitions=[
 {name:'search_lesson',description:'Find literal text in the fixed local source catalog, optionally constrained to one source and a containing time interval. Results establish source consistency, not factual truth.',effect:'read',
  inputSchema:schema({query:text(120),sourceId:text(100),start:number,end:number},['query'])},
 {name:'read_cue',description:'Read one exact cue from the fixed local source catalog by source and cue ID.',effect:'read',inputSchema:schema({sourceId:text(100),cueId:text(100)})},
];
export class SourceToolError extends Error{constructor(code){super(`Source tool unavailable (${code}).`);this.code=code;}}
export function createSourceTools(catalog,{now=()=>new Date().toISOString()}={}){
 // Freeze a JSON snapshot: the host catalog is configuration, never model-supplied data.
 const sources=JSON.parse(JSON.stringify(catalog));if(!Array.isArray(sources)||sources.length<1||sources.length>20)throw new SourceToolError('CATALOG');
 const rows=[];const ids=new Set();
 for(const source of sources){if(ids.has(source.id)||!Array.isArray(source.cues)||source.cues.length>500)throw new SourceToolError('CATALOG');ids.add(source.id);for(const cue of source.cues){if(rows.some(x=>x.source.id===source.id&&x.cue.id===cue.id))throw new SourceToolError('CATALOG');const row={source,cue};receipt(row);rows.push(row);}}
 function receipt({source,cue}){const value={version:1,sourceId:source.id,sourceVersion:source.version,sourceHash:source.hash,mediaHash:source.mediaHash,cueId:cue.id,start:cue.start,end:cue.end,excerpt:cue.text,retrievedAt:now(),verification:'unverified'};if(!validateReceipt(value,{sources}).valid||cue.text.length>2000)throw new SourceToolError('CATALOG');return value;}
 return {
  list(){return structuredClone(definitions);},
  call(name,args){const definition=definitions.find(d=>d.name===name);if(!definition)throw new SourceToolError('UNKNOWN_TOOL');try{validateData(definition.inputSchema,args);}catch{throw new SourceToolError('ARGUMENTS');}
   let matches,filters={};if(name==='search_lesson'){
    const query=args.query.trim().toLocaleLowerCase('en');if(!query)throw new SourceToolError('ARGUMENTS');
    const hasStart=args.start!==undefined,hasEnd=args.end!==undefined;
    if(hasStart!==hasEnd||hasStart&&(!Number.isFinite(args.start)||!Number.isFinite(args.end)||args.end<=args.start))throw new SourceToolError('ARGUMENTS');
    filters={...(args.sourceId!==undefined?{sourceId:args.sourceId}:{}),...(hasStart?{start:args.start,end:args.end}:{})};
    matches=rows.filter(r=>
     r.cue.text.toLocaleLowerCase('en').includes(query)&&
     (args.sourceId===undefined||r.source.id===args.sourceId)&&
     (!hasStart||r.cue.start>=args.start&&r.cue.end<=args.end)
    ).slice(0,5);
   }else{matches=rows.filter(r=>r.source.id===args.sourceId&&r.cue.id===args.cueId);if(!matches.length)throw new SourceToolError('NOT_FOUND');}
   const receipts=matches.map(receipt);const result={version:1,receipts,limit:name==='search_lesson'?5:1,truthStatus:'unverified',...(name==='search_lesson'?{filters}:{})};if(new TextEncoder().encode(JSON.stringify(result)).length>16000)throw new SourceToolError('OUTPUT_SIZE');return result;
  },
 };
}
