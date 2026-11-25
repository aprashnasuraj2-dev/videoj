// Development-only controlled comparator. Both paths retain the exact local parent.
// The fresh path uses the ordinary compiler once per current version, not a
// redundant full replay of parent plus current. Timing excludes fixture construction,
// parent warm-up and parity assertions. The benchmark does not establish product speed.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft,selectedSpan} from '../reviewed-draft.js';
import {FACETS} from '../semantic-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {createInvestigationReplaySession,createFreshInvestigationReplaySession,sealInvestigationVersion,compareInvestigationVersions} from '../investigation-revision.js';
const comparable=x=>{const {recomputation,qualification,...rest}=x;return rest;};
const median=a=>{const s=[...a].sort((x,y)=>x-y),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;};
const p90=a=>[...a].sort((x,y)=>x-y)[Math.ceil(a.length*.9)-1];
async function wide(previousDigest=null,mode='initial'){
 const question='Do declared synthetic channel totals exceed the specified threshold?';
 const type={kind:'capacity',unit:'Mbps',scope:'synthetic_same_condition',dimension:[0,0,0]};
 const bindings=[],sources=[];
 for(const group of ['east','west']){
  const fields=Array.from({length:16},(_,i)=>100+i+(mode==='correction'&&group==='west'&&i===0?100:0));
  fields.push(1750);
  let text='';
  for(let i=0;i<fields.length;i++){
   text+='field_'+i+' = ';const start=text.length,t=String(fields[i]);text+=t;
   bindings.push({id:group+'_'+i,sourceId:group,start,end:text.length,type});text+='; ';
  }
  if(mode==='lineage'&&group==='west')text+='Same readings, revised source note.';
  sources.push({id:group,lineage:group+'_root',text});
 }
 sources.push({id:'context',lineage:'context_root',text:mode==='irrelevant'?'Context revised.':'Context original.'});
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources,bindings}));
 const proposals=[],candidates=[];
 for(const group of ['east','west'])for(const op of ['gt','ge','lt','le']){
  const id=group+'_'+op;
  const nodes=Array.from({length:17},(_,i)=>({id:'input_'+i,kind:'input',bindingId:group+'_'+i}));
  // Balanced tree: 16 input leaves + threshold, 15 additions and 1 constraint.
  let level=nodes.slice(0,16).map(n=>n.id),seq=0;
  while(level.length>1){const next=[];for(let i=0;i<level.length;i+=2){const nid='sum_'+seq++;nodes.push({id:nid,kind:'derive',op:'add',args:[level[i],level[i+1]]});next.push(nid);}level=next;}
  nodes.push({id:'target',kind:'constraint',op,args:[level[0],'input_16']});
  const proposalText=JSON.stringify({version:1,contractDigest:pin,questionSpan:selectedSpan('question',question,0,question.length),claims:[],nodes,targetId:'target'});
  proposals.push({id,proposalText});candidates.push({id,meaning:'Synthetic declared '+id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))});
 }
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals});
 const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 return sealInvestigationVersion({previousDigest,contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
}
const cases=[];
for(const domain of ['finance','engineering']){
 const a=await livingFixture(domain);
 cases.push({name:domain+'_correction',a,b:await livingFixture(domain,{previousDigest:a.digest,revised:true}),expected:[3,3]});
 cases.push({name:domain+'_withdrawal',a,b:await livingFixture(domain,{previousDigest:a.digest,withdraw:true}),expected:[0,3]});
}
const a=await wide();
for(const [mode,expected] of [['correction',[132,132]],['lineage',[132,132]],['irrelevant',[0,264]]])cases.push({name:'wide_'+mode,a,b:await wide(a.digest,mode),expected});
const rows=[],repetitions=7;
for(const {name,a,b,expected} of cases){
 const reused=createInvestigationReplaySession(),fresh=createFreshInvestigationReplaySession();
 await reused.replay(a.versionText,a.digest);await fresh.replay(a.versionText,a.digest);
 const independent=await compareInvestigationVersions(a.versionText,a.digest,b.versionText,b.digest);
 const reuseTimes=[],freshTimes=[];let counts;
 // Untimed warm-up for each strategy; alternate measurement order to reduce bias.
 for(let i=-1;i<repetitions;i++){
  const r=reused.fork(),f=fresh.fork();let x,y,rm,fm;
  async function runReuse(){const t=performance.now();x=await r.replay(b.versionText,b.digest);rm=performance.now()-t;}
  async function runFresh(){const t=performance.now();y=await f.replay(b.versionText,b.digest);fm=performance.now()-t;}
  if(i%2===0){await runReuse();await runFresh();}else{await runFresh();await runReuse();}
  assert.deepEqual(x.report,y.report);assert.deepEqual(comparable(x.impact),comparable(y.impact));assert.deepEqual(comparable(x.impact),comparable(independent));
  counts=x.stats.totals;assert.deepEqual([counts.executed,counts.reusedOutcomes],expected);
  if(i>=0){reuseTimes.push(rm);freshTimes.push(fm);}
 }
 rows.push({case:name,arithmeticFresh:counts.executed+counts.reusedOutcomes,...counts,sessionMedianMs:median(reuseTimes),freshMedianMs:median(freshTimes),sessionP90Ms:p90(reuseTimes),freshP90Ms:p90(freshTimes)});
}
console.log(JSON.stringify({profile:'revision-session-controlled-pilot/v2',node:process.version,repetitions,rows,qualification:'Synthetic development cases; one process, paired alternating order, untimed anchor and warm-up. Fresh strategy retains exact parent and evaluates current once. All reports and substantive impacts matched. Arithmetic counts include input nodes; timing is descriptive and may favor either strategy, not a product speed claim.'},null,2));
