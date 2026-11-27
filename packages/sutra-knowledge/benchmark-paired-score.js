// Bounded synthetic benchmark scoring. No inferred gold labels or missing cases.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
const fail=code=>{throw TypeError('BENCHMARK_'+code);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const labels=['supported','refuted','underdetermined'];
export async function scorePairedBenchmark(goldText,goldPin,resultsText,resultsPin){
 if(await casePin(goldText)!==goldPin||await casePin(resultsText)!==resultsPin)fail('PIN');
 const gold=parseUniqueJson(goldText,{maxChars:262144,maxDepth:5}),r=parseUniqueJson(resultsText,{maxChars:262144,maxDepth:5});
 if(!keys(gold,['version','cases'])||gold.version!==1||!Array.isArray(gold.cases)||!gold.cases.length||gold.cases.length>1000||gold.cases.some(c=>!keys(c,['id','label'])||!id(c.id)||!labels.includes(c.label))||new Set(gold.cases.map(c=>c.id)).size!==gold.cases.length)fail('GOLD');
 if(!keys(r,['version','goldPin','arms'])||r.version!==1||r.goldPin!==goldPin||!Array.isArray(r.arms)||r.arms.length!==2||new Set(r.arms.map(a=>a?.id)).size!==2)fail('RESULTS');
 const truth=new Map(gold.cases.map(c=>[c.id,c.label])),n=truth.size;
 const arms=r.arms.map(a=>{
  if(!keys(a,['id','predictions'])||!id(a.id)||!Array.isArray(a.predictions)||a.predictions.length!==n||new Set(a.predictions.map(p=>p?.id)).size!==n||a.predictions.some(p=>!keys(p,['id','label'])||!truth.has(p.id)||![...labels,'abstain','error'].includes(p.label)))fail('PREDICTIONS');
  const byId=new Map(a.predictions.map(p=>[p.id,p.label])),correct=a.predictions.filter(p=>p.label===truth.get(p.id)).length,abstained=a.predictions.filter(p=>p.label==='abstain').length,errors=a.predictions.filter(p=>p.label==='error').length,answered=n-abstained-errors;
  const unsupportedDecisive=a.predictions.filter(p=>truth.get(p.id)==='underdetermined'&&['supported','refuted'].includes(p.label)).length;
  return {byId,score:{id:a.id,total:n,answered,correct,incorrect:answered-correct,abstained,errors,unsupportedDecisive,coverage:answered/n,accuracyAll:correct/n,accuracyAnswered:answered?correct/answered:null}};
 });
 const paired={bothCorrect:0,firstOnly:0,secondOnly:0,neitherCorrect:0};
 for(const [k,v] of truth){const a=arms[0].byId.get(k)===v,b=arms[1].byId.get(k)===v;paired[a?(b?'bothCorrect':'firstOnly'):(b?'secondOnly':'neitherCorrect')]++;}
 return {version:1,goldPin,resultsPin,arms:arms.map(a=>a.score),paired,qualification:'Descriptive scoring of caller-supplied labels only; no independent annotation, held-out separation, statistical significance or budget match established.',decisionAuthority:'NONE'};
}
