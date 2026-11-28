// Advisory only: never mutates the alias catalog or creates executable candidates.
// Called only after reviewed contract validation. No inferred numeric values.
const tokens=s=>s.normalize('NFKC').toLowerCase().match(/[\p{L}\p{M}\p{N}_]+/gu)??[];
const YEAR=/(?<![\p{L}\p{N}])(?:19|20)\d{2}(?![\p{L}\p{N}])/gu;
const ATTACHED=/\b(?:in|for|during|as of)\s*$/i;
const AMBIGUOUS=/\b(?:between|from|through|until|since|before|after|versus|vs|compared|forecast|projected|expected|target|budget|planned|not|except|unless)\b/i;
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
function relevant(clause,base){const a=tokens(base),b=tokens(clause);return a.length>0&&b.some((_,i)=>a.every((x,j)=>b[i+j]===x));}
export function suggestTemporalAliases(contract,lookup,parses){
 const requested=new Map();
 for(const p of parses){if(!['TEMPORAL_COMPARISON','TEMPORAL_RELATIVE_CHANGE'].includes(p.mode))continue;
  for(const {alias} of p.parts){const m=/^(.+) ((?:19|20)\d{2})$/.exec(alias);if(!lookup.has(alias)&&m&&lookup.has(m[1]))requested.set(alias,{base:m[1],year:m[2]});}}
 if(!requested.size)return [];
 const bindings=new Map(contract.bindings.map(b=>[b.id,b])),docs=new Map(contract.sources.map(s=>[s.id,{...s,bytes:enc.encode(s.text)}])),out=[];
 for(const [alias,{base,year}] of requested){
  const matches=[];
  for(const id of lookup.get(base)){
   const b=bindings.get(id),d=docs.get(b?.span.sourceId);if(!d)continue;
   let start,end;try{start=dec.decode(d.bytes.subarray(0,b.span.start)).length;end=start+dec.decode(d.bytes.subarray(b.span.start,b.span.end)).length;}catch{continue;}
   for(const m of d.text.matchAll(/[^;\n!?]+?(?:\.(?=\s|$)|[;\n!?]|$)/gu)){
    const clause=m[0],offset=m.index;if(start<offset||end>offset+clause.length||clause.length>512)continue;
    const years=[...clause.matchAll(YEAR)];if(years.length!==1||years[0][0]!==year||!relevant(clause,base)||AMBIGUOUS.test(clause))continue;
    const y=years[0],ys=offset+y.index,ye=ys+year.length;
    if(!ATTACHED.test(clause.slice(0,y.index))||!(ye<=start||ys>=end)||/^\s*[-/]\d/.test(clause.slice(y.index+year.length)))continue;
    matches.push({bindingId:id,sourceId:d.id,sourceDigest:d.digest,yearSpan:{start:enc.encode(d.text.slice(0,ys)).length,end:enc.encode(d.text.slice(0,ye)).length,quote:year},clauseSpan:{start:enc.encode(d.text.slice(0,offset)).length,end:enc.encode(d.text.slice(0,offset+clause.length)).length,quote:clause}});
   }
  }
  if(matches.length)out.push({alias,baseAlias:base,status:'REQUIRES_EXPLICIT_REVIEW',matches,decisionAuthority:'NONE'});
 }
 return out;
}
