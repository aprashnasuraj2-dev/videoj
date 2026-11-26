import {snapshotDataArray,snapshotDataRecord} from '../sutra-evidence/index.js';
import {parseUniqueJson} from './strict-json.js';

const fail=code=>{const error=new Error('Epistemic answer rejected ('+code+').');error.code=code;throw error;};
const text=(value,max)=>typeof value==='string'&&value.trim()&&value.length<=max&&!/[\u0000\u007f]/.test(value);
const exact=(value,keys,limit=keys.length)=>{
 let row;try{row=snapshotDataRecord(value,limit);}catch{fail('ANSWER_FORMAT');}
 if(Object.keys(row).sort().join(',')!==[...keys].sort().join(','))fail('ANSWER_FORMAT');
 return row;
};
const answerArray=(value,max)=>{try{return snapshotDataArray(value,max);}catch{fail('ANSWER_FORMAT');}};
const evidenceArray=(value,max)=>{try{return snapshotDataArray(value,max);}catch{fail('EVIDENCE_FORMAT');}};
const evidenceRecord=(value,max)=>{try{return snapshotDataRecord(value,max);}catch{fail('EVIDENCE_FORMAT');}};
const lessonKey=(sourceId,cueId)=>sourceId+'\u0000'+cueId;

export function validateEpistemicAnswer(answer,{lessonReceipts=[],webReceipts=[],peerReceipts=[]}={}){
 let root;try{root=parseUniqueJson(answer,{maxChars:12000,maxDepth:12});}catch{fail('ANSWER_FORMAT');}
 root=exact(root,['claims']);
 const claims=answerArray(root.claims,12);if(!claims.length)fail('ANSWER_FORMAT');
 const lessons=new Map(),web=new Map(),peers=new Map();
 for(const raw of evidenceArray(lessonReceipts,20)){
  const r=evidenceRecord(raw,32);
  if(!text(r.sourceId,160)||!text(r.cueId,160)||!text(r.excerpt,4000))fail('EVIDENCE_FORMAT');
  lessons.set(lessonKey(r.sourceId,r.cueId),r);
 }
 for(const raw of evidenceArray(webReceipts,6)){
  const r=evidenceRecord(raw,16);
  if(!text(r.sourceId,32)||!text(r.url,2048)||!text(r.excerpt,3000))fail('EVIDENCE_FORMAT');
  let url;try{url=new URL(r.url);}catch{fail('EVIDENCE_FORMAT');}
  if(!['https:','http:'].includes(url.protocol))fail('EVIDENCE_FORMAT');
  web.set(r.sourceId,r);
 }
 for(const raw of evidenceArray(peerReceipts,4)){
  const r=evidenceRecord(raw,16);
  if(!text(r.sourceId,32)||!text(r.origin,2048)||!text(r.network,120)||!text(r.agent,120)||!text(r.excerpt,3000)||r.verification!=='peer_claim')fail('EVIDENCE_FORMAT');
  let origin;try{origin=new URL(r.origin);}catch{fail('EVIDENCE_FORMAT');}
  if(!['https:','http:'].includes(origin.protocol)||origin.username||origin.password||origin.search||origin.hash)fail('EVIDENCE_FORMAT');
  peers.set(r.sourceId,r);
 }
 const output=[];
 for(const raw of claims){
  const claim=exact(raw,['kind','text','citations']);
  if(!['source_claim','inference','conflict','uncertainty'].includes(claim.kind)||!text(claim.text,1000))fail('ANSWER_FORMAT');
  const citations=answerArray(claim.citations,4),seen=new Set(),clean=[],authorities=new Set();
  if(['source_claim','conflict'].includes(claim.kind)&&!citations.length)fail('CITATION_REQUIRED');
  if(['inference','uncertainty'].includes(claim.kind)&&citations.length)fail('CITATION_FORBIDDEN');
  for(const rawCitation of citations){
   const base=(()=>{try{return snapshotDataRecord(rawCitation,4);}catch{fail('ANSWER_FORMAT');}})();
   if(base.kind==='lesson'){
    const c=exact(base,['kind','sourceId','cueId','quote'],4),r=lessons.get(lessonKey(c.sourceId,c.cueId));
    if(!r||!text(c.quote,500)||c.quote.trim().length<12||!r.excerpt.includes(c.quote))fail('CITATION_INVALID');
    const id='lesson:'+c.sourceId+'\u0000'+c.cueId;if(seen.has(id))fail('CITATION_INVALID');seen.add(id);authorities.add('lesson:'+c.sourceId);
    clean.push(Object.freeze({kind:'lesson',sourceId:c.sourceId,cueId:c.cueId,quote:c.quote}));
   }else if(base.kind==='web'){
    const c=exact(base,['kind','sourceId','quote'],3),r=web.get(c.sourceId);
    if(!r||!text(c.quote,500)||c.quote.trim().length<12||!r.excerpt.includes(c.quote))fail('CITATION_INVALID');
    const id='web:'+c.sourceId;if(seen.has(id))fail('CITATION_INVALID');seen.add(id);authorities.add('host:'+new URL(r.url).hostname.toLowerCase());
    clean.push(Object.freeze({kind:'web',sourceId:c.sourceId,quote:c.quote}));
   }else if(base.kind==='peer'){
    const c=exact(base,['kind','sourceId','quote'],3),r=peers.get(c.sourceId);
    if(!r||!text(c.quote,500)||c.quote.trim().length<12||!r.excerpt.includes(c.quote))fail('CITATION_INVALID');
    const id='peer:'+c.sourceId;if(seen.has(id))fail('CITATION_INVALID');seen.add(id);authorities.add('host:'+new URL(r.origin).hostname.toLowerCase());
    clean.push(Object.freeze({kind:'peer',sourceId:c.sourceId,quote:c.quote}));
   }else fail('CITATION_INVALID');
  }
  if(claim.kind==='conflict'&&authorities.size<2)fail('INDEPENDENCE_REQUIRED');
  output.push(Object.freeze({kind:claim.kind,text:claim.text,citations:Object.freeze(clean)}));
 }
 const cited=new Set(output.flatMap(claim=>claim.citations.map(c=>c.kind)));
 const evidenceKinds=['lesson','web','peer'].filter(kind=>cited.has(kind));
 const basis=evidenceKinds.length>1?evidenceKinds.join('_and_'):evidenceKinds[0]??(output.some(c=>c.kind==='inference')?'model_inference':'uncertainty');
 return Object.freeze({claims:Object.freeze(output),basis,verification:'quotation_integrity_only',truthStatus:'unverified'});
}
export function formatEpistemicAnswer(value){
 const labels={source_claim:'Source claim',inference:'Model inference',conflict:'Conflicting evidence',uncertainty:'Uncertainty'};
 if(!value||!Array.isArray(value.claims))fail('ANSWER_FORMAT');
 return value.claims.map(claim=>labels[claim.kind]+': '+claim.text).join(' ');
}
