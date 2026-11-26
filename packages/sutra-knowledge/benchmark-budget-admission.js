// Strict descriptive admission for two paired arms with common per-case caps.
// Usage is supplied by caller, not authenticated billing or experimental provenance.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {scorePairedBenchmark} from './benchmark-paired-score.js';
const fail=x=>{throw TypeError('BENCHMARK_BUDGET_'+x);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const fields=['calls','inputBytes','outputTokens'];
const integer=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max&&!Object.is(x,-0);
export async function admitPairedBenchmarkBudget({goldText,goldPin,resultsText,resultsPin,protocolText,protocolPin,usageText,usagePin}={}){
 if(await casePin(protocolText)!==protocolPin||await casePin(usageText)!==usagePin)fail('PIN');
 const p=parseUniqueJson(protocolText,{maxChars:32768,maxDepth:5}),u=parseUniqueJson(usageText,{maxChars:262144,maxDepth:6});
 if(!keys(p,['version','goldPin','split','caps'])||p.version!==1||p.goldPin!==goldPin||!['synthetic','development','held_out'].includes(p.split)||!keys(p.caps,fields)||fields.some(k=>!integer(p.caps[k],10000000)))fail('PROTOCOL');
 if(!keys(u,['version','protocolPin','resultsPin','arms'])||u.version!==1||u.protocolPin!==protocolPin||u.resultsPin!==resultsPin||!Array.isArray(u.arms)||u.arms.length!==2)fail('USAGE');
 const score=await scorePairedBenchmark(goldText,goldPin,resultsText,resultsPin),gold=parseUniqueJson(goldText,{maxChars:262144,maxDepth:5}),ids=new Set(gold.cases.map(c=>c.id));
 const byArm=new Map(score.arms.map(a=>[a.id,a])),seen=new Set(),totals=[];
 for(const a of u.arms){
  if(!keys(a,['id','cases'])||!byArm.has(a.id)||seen.has(a.id)||!Array.isArray(a.cases)||a.cases.length!==ids.size)fail('ARM');
  seen.add(a.id);const caseIds=new Set(),sum={calls:0,inputBytes:0,outputTokens:0};
  for(const c of a.cases){if(!keys(c,['id',...fields])||!ids.has(c.id)||caseIds.has(c.id)||fields.some(k=>!integer(c[k],p.caps[k])))fail('CASE');caseIds.add(c.id);for(const k of fields)sum[k]+=c[k];}
  totals.push({id:a.id,...sum});
 }
 return {version:1,protocolPin,usagePin,goldPin,resultsPin,declaredSplit:p.split,commonCaps:p.caps,totals,score,decisionAuthority:'NONE',qualification:'All declared per-case usage fits the same pinned caps. No claim of actual metering, pre-experiment freeze time, independent gold labels, held-out isolation or statistical superiority.'};
}
