// Execute the exact frozen, manually labeled topology corpus through the real compiler and replay engine.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft,draftComparisonProposal} from '../reviewed-draft.js';
import {FACETS} from '../semantic-investigation.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {exportStructuralExposure} from '../structural-exposure.js';
const bytes=readFileSync(new URL('./ancestry-development-cases.json',import.meta.url));
assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'0af4985a8c32eaef7a9073f5033b4d875f1bd774','Frozen labels changed');
const data=JSON.parse(bytes),type={kind:'count',unit:'items',scope:'synthetic_topology',dimension:[0,0,0]};
const norm=xs=>xs.map(x=>x.slice().sort().join('')).sort();
const sourceId=x=>x==='q'?'question':x;
const label=x=>x.replace(/^cohort_/,'');
const ids=x=>x.map(label);
const state=x=>x==='u'?'BLOCKED_MISSING_INPUT':x==='x'?'REFUSED':x==='r'?'CONDITIONALLY_REFUTED':'CONDITIONALLY_SATISFIED';
const parseTarget=x=>{const [rel,context]=x.split('@'),[pair,mode='s']=rel.split(':');return {pair,mode,context};};
async function build(c){
 const question='Question reviewed quantities: low 1; high 2; are the explicitly staged comparisons satisfied?';
 const sources=c.sources.map(s=>{const [id,lineage=id,key=id]=s.split(':');return {id,lineage,text:'Record '+key+': low 1; high 2;'};});
 const bindings=[];
 for(const [id,text] of [['q',question],...sources.map(s=>[s.id,s.text])]){
  for(const [suffix,marker] of [['low','low 1'],['high','high 2']]){
   const start=text.indexOf(marker)+marker.length-1;assert.ok(start>=0);
   bindings.push({id:id+'_'+suffix,sourceId:sourceId(id),start,end:start+1,type});
  }
 }
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources,bindings}));
 const targets=c.targets.length===1?[c.targets[0],c.targets[0]]:c.targets;
 const proposals=[],candidates=[];
 for(const [i,t] of targets.entries()){
  const {pair,mode,context}=parseTarget(t),id='t'+String(i+1).padStart(2,'0');
  let proposalText=await draftComparisonProposal(contractText,pin,pair[0]+'_high',pair[1]+'_low',mode==='r'?'lt':'gt');
  if(mode==='u'){const p=JSON.parse(proposalText);p.nodes[0]={id:'left_value',kind:'unknown',type,reason:'Synthetic missing input.'};proposalText=JSON.stringify(p);}
  if(mode==='x')proposalText='{}';
  const facets=Object.fromEntries(FACETS.map(k=>[k,null]));
  if(context)facets.method={statement:'Context only, not an input.',references:[{kind:'binding',id:context+'_low'}]};
  candidates.push({id,meaning:'Synthetic topology comparison '+id,facets});proposals.push({id,proposalText});
 }
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals}),annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 return {targets,version:await sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)})};
}
const results=[];
for(const c of data.cases){
 const {targets,version}=await build(c),e=await exportStructuralExposure(version.versionText,version.digest),r=e.result;assert.ok(e.portable,c.id);
 const observed={components:norm(r.cohorts.map(g=>g.sourceIds)),cuts:norm(r.cut.sets.map(ids)),status:r.cut.status};
 assert.deepEqual(observed,{components:c.expected.components.slice().sort(),cuts:c.expected.cuts.slice().sort(),status:c.expected.status},c.id);
 assert.equal(r.cut.minimumCohorts,c.expected.cuts.length?c.expected.cuts[0].length:null,c.id);
 for(const [i,t] of targets.entries()){
  const {pair,mode,context}=parseTarget(t),a=r.candidates[i];assert.equal(a.state,state(mode),c.id);
  if(mode==='s'||mode==='r')assert.deepEqual(a.targetSourceIds,[...new Set([...pair].map(sourceId))].sort(),c.id);
  if(context)assert.deepEqual(a.contextOnlyCohorts,['cohort_'+context],c.id);
  assert.equal(a.ancestryCompleteness,'UNKNOWN');
 }
 assert.equal(r.counts.distinctDecisiveTargets,new Set(targets.filter(t=>['s','r'].includes(parseTarget(t).mode)).map(t=>t.split('@')[0])).size,c.id);
 assert.ok(r.cohorts.every(g=>g.independence==='NOT_ESTABLISHED'));assert.equal(r.decisionAuthority,'NONE');
 results.push({id:c.id,versionDigest:version.digest,observed,report:r,bundleText:e.bundleText,snapshotPin:e.snapshotPin});
}
assert.equal(results.length,30);
console.log(JSON.stringify({profile:'sutra-ancestry-development-results/v1',frozenBlob:'0af4985a8c32eaef7a9073f5033b4d875f1bd774',caseCount:results.length,results}));
