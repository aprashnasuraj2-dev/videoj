// Deterministic, bounded evidence indexing. Exact text integrity is not factual verification.
import {digest,secretLike} from './research-session.js';
const fail=code=>{throw Object.assign(Error('Evidence refused: '+code),{code});};
const refId=(prefix,parts)=>prefix+'_'+digest(JSON.stringify(parts)).slice(7,31);
export function verifyPassage(p,doc){
 return Boolean(p&&doc&&p.sourceId===doc.id&&p.sourceDigest===doc.textDigest&&doc.textDigest===digest(doc.text)&&p.locator?.coordinateSystem==='utf16-extracted-text'&&Number.isSafeInteger(p.locator.startOffset)&&Number.isSafeInteger(p.locator.endOffset)&&p.locator.startOffset>=0&&p.locator.endOffset>p.locator.startOffset&&p.locator.endOffset<=doc.text.length&&doc.text.slice(p.locator.startOffset,p.locator.endOffset)===p.supportingText);
}
export function verifyEvidence(documents,passages){
 if(!Array.isArray(documents)||documents.length>60||!Array.isArray(passages)||passages.length>480)fail('EVIDENCE_SIZE');
 const byId=new Map();
 for(const d of documents){if(!d||typeof d.id!=='string'||byId.has(d.id)||typeof d.text!=='string'||d.text.length>100000||d.textDigest!==digest(d.text))fail('DOCUMENT_DIGEST');byId.set(d.id,d);}
 const refs=[],seen=new Set();
 for(const p of passages){
  if(!verifyPassage(p,byId.get(p.sourceId)))fail('PASSAGE_INTEGRITY');
  const id=refId('passage',[p.sourceId,p.sourceDigest,p.locator.startOffset,p.locator.endOffset]);if(seen.has(id))fail('PASSAGE_DUPLICATE');seen.add(id);
  refs.push({id,sourceId:p.sourceId,sourceDigest:p.sourceDigest,locator:{...p.locator},verificationStatus:'exact_span_only'});
 }
 return {refs,sourceCount:documents.length,passageCount:refs.length,truthStatus:'UNVERIFIED'};
}
const NUMBER=/(?:\b(USD|EUR|NPR|GBP|JPY|INR)\s+|([$€£¥])\s*)?(-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)(?:\s+(million|billion|thousand|trillion)\b)?(?:\s*(%|(?:percent|kWh|MWh|GWh|TWh|MW|GW|kW|kg|tonnes?|ms|seconds?|hours?|days?|USD|EUR|NPR|GBP|JPY|INR)\b))?/gi;
function exactDecimal(value){
 let s=value.replace(/,/g,''),sign=s.startsWith('-')?'-':'';if(sign)s=s.slice(1);
 let [whole,frac='']=s.split('.');whole=whole.replace(/^0+(?=\d)/,'');frac=frac.replace(/0+$/,'');
 return (whole==='0'&&!frac?'':sign)+whole+(frac?'.'+frac:'');
}
export function extractNumericObservations(passages,refs){
 if(passages.length!==refs.length)fail('EVIDENCE_REFS');
 const observations=[];
 for(let i=0;i<passages.length&&observations.length<160;i++){
  const p=passages[i],ref=refs[i],text=p.supportingText;
  if(typeof text!=='string'||secretLike(text))continue;
  const years=[...new Set(text.match(/\b(?:19|20)\d{2}\b/g)??[])],period=years.length===1?years[0]:null;
  for(const m of text.matchAll(NUMBER)){
   if(observations.length>=160)break;
   const prefix=m[1]?.toUpperCase()??m[2]??null,suffix=m[5]?.toLowerCase()??null,scale=m[4]?.toLowerCase()??null;
   if(!prefix&&!suffix&&!scale)continue;
   // Compound currencies or rates cannot be safely reduced to a single known unit.
   if(prefix&&suffix)continue;
   const unit=prefix??(suffix==='percent'?'%':suffix)??null;
   const start=p.locator.startOffset+m.index,end=start+m[0].length;
   const context=(text.slice(0,m.index)+'<value>'+text.slice(m.index+m[0].length)).toLowerCase().replace(/\s+/g,' ').trim();
   observations.push({id:refId('number',[ref.id,start,end]),passageId:ref.id,sourceId:p.sourceId,sourceDigest:p.sourceDigest,locator:{startOffset:start,endOffset:end,coordinateSystem:'utf16-extracted-text'},exactText:m[0],value:exactDecimal(m[3]),unit,scale,period,contextKey:digest(context),denominator:'NOT_ESTABLISHED',status:'candidate_observation'});
  }
 }
 return observations;
}
export function compareNumericObservations(observations){
 const groups=new Map(),comparisons=[];
 for(const o of observations){
  // No comparison across ambiguous periods, currencies, unit/scale differences or wording.
  if(!o.period||!o.unit||['$','¥'].includes(o.unit))continue;
  const k=JSON.stringify([o.period,o.unit,o.scale,o.contextKey]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(o);
 }
 for(const group of groups.values())for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length&&comparisons.length<100;j++){
  const a=group[i],b=group[j];if(a.sourceId===b.sourceId||a.value===b.value)continue;
  comparisons.push({id:refId('difference',[a.id,b.id]),left:a.id,right:b.id,status:'potential_discrepancy',reason:'Same explicit period, unit, scale and surrounding wording; definitions, denominator and source independence remain unverified.'});
 }
 return comparisons;
}
function shingles(text){
 const words=(text.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[]).slice(0,2000),set=new Set();
 if(words.length<22)return set;
 for(let i=0;i+2<words.length&&set.size<1000;i++)set.add(words.slice(i,i+3).join(' '));
 return set;
}
export function compareSourceLineage(documents){
 const sameHost=new Map(),nearDuplicates=[],sh=documents.map(d=>shingles(d.text));
 for(const d of documents){const host=new URL(d.url).hostname;if(!sameHost.has(host))sameHost.set(host,[]);sameHost.get(host).push(d.id);}
 for(let i=0;i<documents.length;i++)for(let j=i+1;j<documents.length&&nearDuplicates.length<100;j++){
  const a=sh[i],b=sh[j];if(a.size<20||b.size<20)continue;
  let common=0;for(const x of a)if(b.has(x))common++;
  const similarity=common/(a.size+b.size-common);
  if(similarity>=0.9)nearDuplicates.push({left:documents[i].id,right:documents[j].id,similarity:Number(similarity.toFixed(4)),status:'potential_common_origin'});
 }
 return {sameHostGroups:[...sameHost].filter(([,ids])=>ids.length>1).map(([host,sourceIds])=>({host,sourceIds})),nearDuplicates,independenceStatus:'NOT_ESTABLISHED',method:'bounded lexical trigram similarity; not a citation-lineage proof'};
}
export function createEvidenceGraph(documents,refs,observations,comparisons,lineage){
 const nodes=[],edges=[],byUrl=new Map(documents.map(d=>[d.url,d.id]));
 for(const d of documents)nodes.push({id:d.id,kind:'source',digest:d.textDigest});
 for(const r of refs){nodes.push({id:r.id,kind:'passage'});edges.push({from:r.id,to:r.sourceId,relationship:'DERIVED_FROM'});}
 for(const o of observations){nodes.push({id:o.id,kind:'numeric_observation'});edges.push({from:o.id,to:o.passageId,relationship:'DERIVED_FROM'});}
 for(const d of documents)for(const u of d.links??[]){const id=byUrl.get(u);if(id&&id!==d.id&&edges.length<1000)edges.push({from:d.id,to:id,relationship:'LINKS_TO'});}
 for(const c of comparisons)edges.push({from:c.left,to:c.right,relationship:'POTENTIAL_CONTRADICTION'});
 for(const n of lineage.nearDuplicates)edges.push({from:n.left,to:n.right,relationship:'POTENTIAL_DUPLICATE'});
 return {nodes,edges,authority:'NONE'};
}
