import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';import {analyzeSemanticContext} from '../semantic-context-analyzer.js';
const REVIEW=new Set(['REVIEW_REQUIRED','EXPLICIT_OR_REVIEW']);
export function runContextContrastBenchmark(){
 const d=JSON.parse(readFileSync(new URL('./semantic-contrast-v1.json',import.meta.url),'utf8')),rows=[];
 for(const r of d.cases){
  const q=analyzeSemanticContext({question:r.question}),c=analyzeSemanticContext({question:r.question,sources:[{text:r.context}]});
  const a=q.diagnostics.find(x=>x.family===r.family),b=c.diagnostics.find(x=>x.family===r.family);
  rows.push({id:r.id,family:r.family,questionOnly:a.state,withContext:b.state,questionOnlyReview:REVIEW.has(a.state),withContextReview:REVIEW.has(b.state),stateChanged:a.state!==b.state,contextPairs:c.profile.sourceContextPairs,contextFlags:c.profile.sourceContextFlags});
 }
 const questionOnlyTargetReview=rows.filter(x=>x.questionOnlyReview).length,contextTargetReview=rows.filter(x=>x.withContextReview).length;
 return {version:'sutra-context-contrast-benchmark/v1',cases:rows.length,questionOnlyTargetReview,contextTargetReview,contextGain:contextTargetReview-questionOnlyTargetReview,stateChanged:rows.filter(x=>x.stateChanged).length,misses:rows.filter(x=>!x.withContextReview).map(x=>x.id),decisionAuthority:'NONE',boundary:'Model-authored material contrasts used for development. Context gain demonstrates that source text changes review obligations; it is not independent human semantic accuracy.',rows};
}
if(fileURLToPath(import.meta.url)===path.resolve(process.argv[1]??''))console.log(JSON.stringify(runContextContrastBenchmark(),null,2));
