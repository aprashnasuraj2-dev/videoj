import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {performance} from 'node:perf_hooks';
import {analyzeSemanticContext} from '../semantic-context-analyzer.js';
import {fitAmbiguityClassifier,rawAmbiguityScore,calibrateAmbiguity,probability,chooseAmbiguityPolicies,scoreAmbiguity,groupedBootstrap} from '../semantic-calibration.js';
const folder=new URL('./',import.meta.url),jsonl=f=>readFileSync(new URL(f,folder),'utf8').trimEnd().split('\n').map(JSON.parse),sha=x=>createHash('sha256').update(x).digest('hex');
const split=JSON.parse(readFileSync(process.argv[2],'utf8')),assignments=new Map(split.assignments.map(x=>[x.id,x]));
if(split.crossFoldExactOrStructuralKeyOverlap!==0||sha(JSON.stringify(split.assignments))!==split.assignmentSha256)throw Error('SPLIT');
const corpora={AmbiEnt:jsonl('ambient-human-full-v1.jsonl').flatMap(r=>['premise','hypothesis'].map(side=>({id:'ambient:'+r.id+':'+side,parent:'ambient:'+r.id,question:r[side],gold:r[side+'_ambiguous']}))),TempAmbiQA:JSON.parse(readFileSync(new URL('tempambiqa-human-full-v1.json',folder),'utf8')).map((r,i)=>({id:'temporal:'+i,parent:'temporal:'+i,question:r.question,gold:r.is_ambiguous}))};
const out={schema:'sutra-semantic-calibration-pilot/v1',splitDigest:split.assignmentSha256,corpora:{},qualification:'Public human labels, prior public dataset exposure. Exact/structural grouped robustness split only, not contamination-proof. Classification of ambiguity labels, not quality of generated interpretations. Train and calibrate separately per corpus. Test fold is never used for weights or thresholds. No model adopted or decision authority.'};
for(const [name,rs] of Object.entries(corpora)){
 const rows=rs.map(r=>({...r,...(()=>{const a=assignments.get(r.parent);if(!a)throw Error('MISSING_SPLIT');return {fold:a.fold,group:a.group};})()}));
 const train=rows.filter(r=>r.fold==='train'),dev=rows.filter(r=>r.fold==='dev'),test=rows.filter(r=>r.fold==='test');
 const foldGroups=[train,dev,test].map(xs=>new Set(xs.map(x=>x.group)));for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)if([...foldGroups[i]].some(g=>foldGroups[j].has(g)))throw Error('GROUP_LEAK');
 const baserows=test.map(r=>{const a=analyzeSemanticContext({question:r.question}),cue=name==='TempAmbiQA'?a.diagnostics.some(x=>x.family==='reporting_period'&&x.state==='REVIEW_REQUIRED'):a.diagnostics.some(x=>x.family!=='units'&&['REVIEW_REQUIRED','EXPLICIT_OR_REVIEW'].includes(x.state));return {...r,p:cue?1:0};});
 const models={};for(const context of [false,true]){
  const start=performance.now(),model=fitAmbiguityClassifier(train,{context}),trainMs=performance.now()-start,devRaw=dev.map(r=>({...r,logit:rawAmbiguityScore(model,r.question)})),calibration=calibrateAmbiguity(devRaw),dp=devRaw.map(r=>({...r,p:probability(r.logit,calibration)})),policies=chooseAmbiguityPolicies(dp);
  const before=performance.now(),testPred=test.map(r=>({...r,p:probability(rawAmbiguityScore(model,r.question),calibration)})),inferenceMs=performance.now()-before;
  const results={};for(const [k,v] of Object.entries(policies)){if(!v?.policy)continue;results[k]={policy:v.policy,dev:v.score,test:scoreAmbiguity(testPred,v.policy),grouped95:groupedBootstrap(testPred,v.policy)};}
  models[context?'hybrid_features':'lexical']={trainMs,inferenceMs,calibration,weightsSha256:sha(JSON.stringify(model.weights)),training:{epochs:model.epochs,learningRate:model.learningRate,l2:model.l2},results,testPredictions:testPred.map(({id,group,gold,p,question})=>({id,group,gold,p,questionHash:sha(question)}))};
 }
 out.corpora[name]={counts:{train:train.length,dev:dev.length,test:test.length,excludedDevelopment:rows.filter(r=>r.fold==='development').length},groups:foldGroups.map(x=>x.size),baseline:scoreAmbiguity(baserows,{low:.5,high:.5}),models};
}
writeFileSync(process.argv[3],JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(Object.fromEntries(Object.entries(out.corpora).map(([k,v])=>[k,{counts:v.counts,groups:v.groups,baseline:v.baseline,models:Object.fromEntries(Object.entries(v.models).map(([n,m])=>[n,{trainMs:m.trainMs,inferenceMs:m.inferenceMs,results:m.results}]))}])),null,2));
