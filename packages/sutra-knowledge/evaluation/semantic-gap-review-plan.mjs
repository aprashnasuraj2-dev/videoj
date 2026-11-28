import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import path from 'node:path';import {buildExternalHumanEvidenceMatrix} from './external-human-evidence-matrix.mjs';
const root=new URL('./',import.meta.url),manifest=JSON.parse(readFileSync(new URL('semantic-model-authored-manifest-v1.json',root),'utf8'));
const rows=manifest.shards.flatMap(s=>readFileSync(new URL(s.path,root),'utf8').trim().split('\n').map(JSON.parse));
const sha=s=>createHash('sha256').update(s).digest('hex');
const nWorst=(margin,z=1.96)=>Math.ceil((z*z*.25)/(margin*margin));
function selection(perFamily){
 const gaps=new Set(buildExternalHumanEvidenceMatrix().gaps),by=new Map();
 for(const r of rows)if(gaps.has(r.family)){if(!by.has(r.family))by.set(r.family,[]);by.get(r.family).push(r);}
 const selected=[];
 for(const family of [...gaps].sort()){const xs=by.get(family)??[];if(xs.length<perFamily)throw Error('GAP_REVIEW_INSUFFICIENT_'+family);xs.sort((a,b)=>sha('sutra-gap-review-v1\0'+a.id).localeCompare(sha('sutra-gap-review-v1\0'+b.id)));selected.push(...xs.slice(0,perFamily));}
 return selected;
}
export function buildGapReviewPacket({margin=.15}={}){
 const perFamily=nWorst(margin),selected=selection(perFamily),cases=selected.map(r=>({caseToken:sha('sutra-gap-human-review-v1\0'+r.id+'\0'+r.question).slice(0,24),question:r.question,context:'Question-only ambiguity review; no external evidence supplied.'})).sort((a,b)=>a.caseToken.localeCompare(b.caseToken));
 if(new Set(cases.map(x=>x.caseToken)).size!==cases.length)throw Error('GAP_REVIEW_TOKEN_COLLISION');
 return {version:'sutra-gap-blind-human-review/v1',selection:{confidence:0.95,margin,worstCaseProportion:.5,formula:'ceil(z^2 * 0.25 / margin^2)',perFamily,families:buildExternalHumanEvidenceMatrix().gaps.length,cases:cases.length,labelUsedForSelection:false},cases};
}
export function buildGapReviewPlan(){
 const gaps=buildExternalHumanEvidenceMatrix().gaps,pilot=nWorst(.15),release=nWorst(.10),reviewers=2;
 const hours=(n,s)=>n*reviewers*s/3600,scenarios=[20,45,90].map(secondsPerCase=>({secondsPerCase,pilotHours:hours(pilot*gaps.length,secondsPerCase),releaseHours:hours(release*gaps.length,secondsPerCase)}));
 return {version:'sutra-gap-human-review-plan/v1',directHumanEvidenceGaps:gaps,gapFamilies:gaps.length,reviewers,pilot:{margin:.15,confidence:.95,casesPerFamily:pilot,cases:pilot*gaps.length,judgments:pilot*gaps.length*reviewers},release:{margin:.10,confidence:.95,casesPerFamily:release,cases:release*gaps.length,judgments:release*gaps.length*reviewers},timeScenarios:scenarios,adjudicationHours:'NOT_INCLUDED',actualElapsedHumanTime:'NOT_MEASURED',boundary:'Sample-size calculation is worst-case binomial precision planning, not a guarantee of semantic validity. Human reviewers and adjudication are still required; model-authored source labels remain hidden and cannot substitute for review.'};
}
if(fileURLToPath(import.meta.url)===path.resolve(process.argv[1]??'')){const arg=process.argv[2];if(arg==='--packet'){const out=process.argv[3];if(!out)throw Error('OUTPUT_REQUIRED');const packet=buildGapReviewPacket();writeFileSync(out,JSON.stringify(packet,null,2)+'\n');console.log(JSON.stringify({path:out,sha256:sha(readFileSync(out)),cases:packet.cases.length},null,2));}else console.log(JSON.stringify(buildGapReviewPlan(),null,2));}
