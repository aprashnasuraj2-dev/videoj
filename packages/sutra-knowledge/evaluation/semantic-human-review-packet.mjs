// Produce separate blind annotation and later prediction-review packets.
// Existing external labels and model-authored targets are never included in blind packets.
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {casePin} from '../pinned-investigation.js';
const folder=new URL('./',import.meta.url),read=f=>readFileSync(new URL(f,folder),'utf8'),jsonl=f=>read(f).trimEnd().split('\n').map(JSON.parse),sha=s=>createHash('sha256').update(s).digest('hex');
const split=JSON.parse(readFileSync(process.argv[2],'utf8')),cal=JSON.parse(readFileSync(process.argv[3],'utf8')),out=process.argv[4]??'sutra-human-review';
if(sha(JSON.stringify(split.assignments))!==split.assignmentSha256||cal.splitDigest!==split.assignmentSha256)throw Error('SPLIT');
const map=new Map(split.assignments.map(x=>[x.id,x])),sample=[];
const corpora={AmbiEnt:jsonl('ambient-human-full-v1.jsonl').flatMap(r=>['premise','hypothesis'].map(side=>({id:'ambient:'+r.id+':'+side,parent:'ambient:'+r.id,question:r[side],context:'',referenceLabel:r[side+'_ambiguous'],referenceReadings:[...new Set(r.disambiguations.map(x=>x[side]))]}))),TempAmbiQA:JSON.parse(read('tempambiqa-human-full-v1.json')).map((r,i)=>({id:'temporal:'+i,parent:'temporal:'+i,question:r.question,context:'',referenceLabel:r.is_ambiguous,referenceReadings:[]}))};
for(const [corpus,n] of [['AmbiEnt',150],['TempAmbiQA',350]]){
 const used=new Set();for(const r of corpora[corpus].filter(r=>map.get(r.parent)?.fold==='test').sort((a,b)=>sha('review-packet-v1:'+a.id).localeCompare(sha('review-packet-v1:'+b.id)))){const group=map.get(r.parent).group;if(used.has(group))continue;used.add(group);sample.push({...r,corpus,group,cohort:'external_public'});if(used.size===n)break;}if(used.size!==n)throw Error('REVIEW_SAMPLE');
}
const manifest=JSON.parse(read('semantic-model-authored-manifest-v1.json')),syn=manifest.shards.flatMap(s=>jsonl(s.path)),families=[...new Set(syn.map(x=>x.family))];
for(const family of families){const seen=new Set();for(const r of syn.filter(x=>x.family===family).sort((a,b)=>sha('review-family-v1:'+a.id).localeCompare(sha('review-family-v1:'+b.id)))){const group=map.get(r.id)?.group??r.id;if(seen.has(group))continue;seen.add(group);sample.push({id:'challenge:'+r.id,question:r.question,context:'',corpus:'SUTRA-synthetic',group,cohort:'model_authored_challenge',referenceLabel:null,referenceReadings:[],targetFamily:family});if(seen.size===5)break;}if(seen.size!==5)throw Error('FAMILY_SAMPLE');}
const blinded=[],later=[],reference=[];for(const [index,r] of sample.sort((a,b)=>sha('blind-order:'+a.id).localeCompare(sha('blind-order:'+b.id))).entries()){
 // Hide original corpus id and group in the blind packet; retain opaque linkage.
 const id='review_'+String(index+1).padStart(4,'0'),scenario='scenario_'+sha(r.group).slice(0,24),c={id,scenario,question:r.question,context:r.context,cohort:r.cohort},caseText=JSON.stringify(c),casePinValue=await casePin(caseText);
 blinded.push({caseText,casePin:casePinValue});
 const m=cal.corpora[r.corpus]?.models.hybrid_features,p=m?.testPredictions.find(x=>x.id===r.id),policy=m?.results.bestF1.policy;
 if(p){const predictionText=JSON.stringify({id,casePin:casePinValue,prediction:p.p>=policy.high?'AMBIGUOUS':'UNAMBIGUOUS',readings:[],method:'diagnostic ambiguity classifier only; no generated interpretation'});later.push({id,casePin:casePinValue,predictionText,predictionPin:await casePin(predictionText),score:p.p,meaningResolution:'NOT_EVALUABLE_FROM_CLASSIFIER_ONLY'});}
 reference.push({id,sourceId:r.id,corpus:r.corpus,scenario,referenceLabel:r.referenceLabel,referenceReadings:r.referenceReadings,targetFamily:r.targetFamily??null,cohort:r.cohort});
}
const save=(suffix,data)=>writeFileSync(out+'-'+suffix+'.json',JSON.stringify(data,null,2)+'\n');
save('blind',{schema:'sutra-blind-human-review/v1',status:'AWAITING_REAL_REVIEWERS',cases:blinded,instructions:'Review individually before seeing predictions, other reviewer responses, or reference labels. Record plausible readings, primary ambiguity family or unsure, rationale and actual elapsed time. Two distinct reviewers sign exact records. Do not score truth or fabricate missing context.'});
save('predictions-restricted',{schema:'sutra-prediction-review/v1',status:'REVEAL_ONLY_AFTER_BLIND_RECEIPTS_LOCKED',cases:later,qualification:'Classifier predictions are not generated semantic meanings. Do not treat correct classification as resolution.'});
save('reference-restricted',{schema:'sutra-human-reference/v1',status:'ADJUDICATOR_ONLY_AFTER_BLIND_LOCK',cases:reference});
save('manifest',{schema:'sutra-human-review-manifest/v1',externalCases:500,challengeCases:100,total:blinded.length,requiredBlindReviews:blinded.length*2,actualHumanReviews:0,actualAdjudications:0,sourceSplitDigest:split.assignmentSha256,qualification:'Public external labels and synthetic-origin challenge cohort remain separate. Public dataset exposure is not independent new scenarios. No human evidence or approval created by this script.'});
console.log(JSON.stringify({cases:blinded.length,external:500,challenge:100,actualHumanReviews:0,actualAdjudications:0}));
