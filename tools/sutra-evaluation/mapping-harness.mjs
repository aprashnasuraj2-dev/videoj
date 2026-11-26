import {createLocalAnswer} from '../../apps/sutra/src/local-answer.js';
import {validateReceipt} from '../../packages/sutra-evidence/index.js';
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const ART=/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._~/-]{1,240}$/;
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys)=>plain(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
export function evaluateRankedMappings({sources,cases,sourceArtifacts,now}={}){
 if(!Array.isArray(sources)||!sources.length||sources.length>20||!Array.isArray(cases)||!cases.length||cases.length>200||!plain(sourceArtifacts))throw Error('Invalid ranked evaluation input.');
 const cueIds=new Set(),sourceIds=new Set();
 for(const source of sources){
  if(!plain(source)||!ID.test(source.id??'')||sourceIds.has(source.id)||!Array.isArray(source.cues))throw Error('Invalid ranked evaluation source.');
  sourceIds.add(source.id);
  if(!Object.hasOwn(sourceArtifacts,source.id)||typeof sourceArtifacts[source.id]!=='string'||!ART.test(sourceArtifacts[source.id]))throw Error('Missing raw source artifact trace.');
  for(const cue of source.cues){if(!plain(cue)||!ID.test(cue.id??''))throw Error('Invalid ranked evaluation cue.');cueIds.add(cue.id);}
 }
 if(Object.keys(sourceArtifacts).some(id=>!sourceIds.has(id)))throw Error('Unknown source artifact trace.');
 const lookup=createLocalAnswer({sources,...(now?{now}:{})}),caseIds=new Set(),rows=[];
 for(const c of cases){
  if(!exact(c,['id','query','acceptableCueIds'])||!ID.test(c.id??'')||caseIds.has(c.id)||typeof c.query!=='string'||!c.query.trim()||c.query.length>240||
   !Array.isArray(c.acceptableCueIds)||c.acceptableCueIds.length>20||new Set(c.acceptableCueIds).size!==c.acceptableCueIds.length||c.acceptableCueIds.some(id=>!ID.test(id)||!cueIds.has(id)))throw Error('Invalid ranked evaluation case.');
  caseIds.add(c.id);
  const result=lookup.query(c.query);
  if(result.mappings.length!==result.receipts.length||result.disambiguation.displayedCount!==result.mappings.length)throw Error('Mapping/evidence cardinality mismatch.');
  const trace=result.mappings.map((mapping,index)=>{
   const receipt=result.receipts[index],validation=validateReceipt(receipt,{sources});
   if(validation.level!=='catalog_matched'||receipt.sourceId!==mapping.sourceId||receipt.cueId!==mapping.cueId)throw Error('Displayed mapping lacks exact source evidence.');
   return Object.freeze({rank:mapping.rank,artifact:sourceArtifacts[receipt.sourceId],sourceId:receipt.sourceId,sourceVersion:receipt.sourceVersion,sourceHash:receipt.sourceHash,mediaHash:receipt.mediaHash,cueId:receipt.cueId,start:receipt.start,end:receipt.end,retrievedAt:receipt.retrievedAt});
  });
  const hitIndex=result.mappings.findIndex(row=>c.acceptableCueIds.includes(row.cueId)),matchedRank=hitIndex<0?null:hitIndex+1;
  const expectedAbstain=c.acceptableCueIds.length===0,top1=matchedRank===1,alternativeHit=matchedRank!==null&&matchedRank>1;
  rows.push(Object.freeze({id:c.id,state:result.state,primary:result.mappings[0]??null,alternatives:Object.freeze(result.mappings.slice(1)),disambiguation:result.disambiguation,
   acceptableCueIds:Object.freeze([...c.acceptableCueIds]),matchedRank,top1,alternativeHit,reciprocalRank:matchedRank?1/matchedRank:0,
   abstentionCorrect:expectedAbstain?result.disambiguation.fallback==='abstain':true,evidenceTrace:Object.freeze(trace)}));
 }
 const answerable=rows.filter(row=>row.acceptableCueIds.length),unanswerable=rows.filter(row=>!row.acceptableCueIds.length);
 return freeze({schema:1,caseCount:rows.length,metrics:{
  top1Accuracy:answerable.length?mean(answerable.map(row=>row.top1?1:0)):1,
  meanReciprocalRank:answerable.length?mean(answerable.map(row=>row.reciprocalRank)):1,
  alternativeRecoveryRate:answerable.length?mean(answerable.map(row=>row.alternativeHit?1:0)):0,
  abstentionAccuracy:unanswerable.length?mean(unanswerable.map(row=>row.abstentionCorrect?1:0)):1,
  evidenceCoverage:mean(rows.map(row=>row.evidenceTrace.length===row.disambiguation.displayedCount?1:0))
 },cases:Object.freeze(rows),limitation:'Deterministic lexical mapping score over declared acceptable cue IDs. Valid receipts and artifact traces establish source identity only, not factual truth, semantic correctness or human adjudication.'});
}
