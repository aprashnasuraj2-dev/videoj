// Semantic review burden, unresolved rate and residual error; no probability or truth-confidence claims.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {classifySemanticOperation} from '../semantic-operation-classifier.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {casePin} from '../pinned-investigation.js';
import {previewSemanticQuestion} from '../semantic-question-engine.js';

const heldout=JSON.parse(readFileSync(new URL('./finqa-public-test-heldout.json',import.meta.url)));
const ambient=readFileSync(new URL('./ambient-human-categories-v1.jsonl',import.meta.url),'utf8').split(/\n/).filter(Boolean).map(JSON.parse);
const linguists=readFileSync(new URL('./ambient-linguist-annotations-v1.jsonl',import.meta.url),'utf8').split(/\n/).filter(Boolean).map(JSON.parse);
const syntheticManifest=JSON.parse(readFileSync(new URL('./semantic-model-authored-manifest-v1.json',import.meta.url)));
const money={kind:'currency_amount',unit:'USD',scope:'same_company',dimension:[0,0,0]},ratio={kind:'ratio',unit:'one',scope:'same_company',dimension:[0,0,0]};
function gold(c){const q=c.question.toLowerCase(),ops=(c.program.match(/\b(add|subtract|multiply|divide)\(/g)||[]).map(x=>x.slice(0,-1));if(/\b(average|mean)\b/.test(q))return 'MEAN';if(ops.includes('subtract')&&ops.includes('divide')&&/\b(percent|percentage|growth)\b/.test(q))return 'RELATIVE_CHANGE';if(ops.every(x=>x==='add'))return 'SUM';if(ops.length===1&&ops[0]==='subtract')return 'DIFFERENCE';if(ops.includes('divide'))return 'RATIO';return 'UNSUPPORTED';}
async function preview(question){
 const rows=[['prior','100',['prior','revenue 2024'],money],['now','120',['now','revenue 2025'],money],['limit','3/20',['limit'],ratio],['a','10',['a'],money],['b','20',['b'],money],['wa','1',['wa'],ratio],['wb','3',['wb'],ratio]];
 let text='',bindings=[];for(const [id,value,,type] of rows){if(text)text+='; ';const start=text.length;text+=value;bindings.push({id,sourceId:'review_burden_fixture',start,end:text.length,type});}
 const sealed=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'review_burden_fixture',text,lineage:'synthetic'}],bindings}));
 const aliases=rows.flatMap(([id,,xs])=>xs.map(alias=>({alias,bindingIds:[id]}))),catalogText=JSON.stringify({version:1,contractDigest:sealed.pin,aliases});
 return previewSemanticQuestion({contractText:sealed.contractText,contractPin:sealed.pin,catalogText,catalogPin:await casePin(catalogText)});
}
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const median=xs=>{const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
export async function runSemanticReviewMeasurement(){
 const held=heldout.cases.map(c=>({id:c.id,prediction:classifySemanticOperation(c.question).family,gold:gold(c)}));
 const resolved=held.filter(x=>x.prediction!=='UNSUPPORTED'),correct=held.filter(x=>x.prediction===x.gold),errors=resolved.filter(x=>x.prediction!==x.gold);
 const supported=[
  'Is now greater than prior?','Is now not greater than prior?','Is the change from prior to now greater than limit?','Is the signed difference from prior to now greater than limit?',
  'Is the signed relative change from prior to now greater than limit?','Is the ratio of now to prior greater than limit?','Is the percentage point change from prior to now greater than limit?',
  'Is revenue in 2025 greater than revenue in 2024?','Is the percentage change in revenue from 2024 to 2025 greater than limit?','Is the weighted average of a with weight wa and b with weight wb greater than limit?',
  'Is the sum of a and b greater than limit?','Is the average of a and b greater than limit?','Did pricing cause churn?','Is now greater than prior because pricing caused it?'
 ];
 const previews=[];for(const q of supported)previews.push(await preview(q));
 const burden=previews.map((p,i)=>({question:supported[i],state:p.state,candidates:p.candidates.length,reviewFlags:p.ambiguities.filter(a=>a.state==='REVIEW_REQUIRED'||a.state==='EXPLICIT_OR_REVIEW').length,unresolved:p.state!=='UNREVIEWED_CANDIDATES'}));
 const flags=burden.map(x=>x.reviewFlags),candidates=burden.map(x=>x.candidates),categoryCounts={};
 for(const x of ambient)categoryCounts[x.category]=(categoryCounts[x.category]||0)+1;
 const multi=linguists.filter(x=>(x.annotations?.length??0)>1),exactAgreement=multi.filter(x=>new Set(x.annotations).size===1),multilabel=linguists.filter(x=>(x.annotations??[]).some(v=>typeof v==='string'&&v.includes('|')));
 return {
  version:'sutra-semantic-review-measurement/v1',
  heldOutOperationFamily:{cases:held.length,resolved:resolved.length,unresolved:held.length-resolved.length,unresolvedRate:(held.length-resolved.length)/held.length,correct:correct.length,
   residualErrorsAmongResolved:errors.length,residualErrorRateAmongResolved:errors.length/resolved.length,overallMismatchOrUnresolved:held.length-correct.length,overallMismatchOrUnresolvedRate:(held.length-correct.length)/held.length,
   boundary:'Frozen FinQA question-only operation-family classification. It is not full program induction or semantic truth.'},
  structuralReviewBurden:{cases:burden.length,meanReviewFlags:mean(flags),medianReviewFlags:median(flags),maxReviewFlags:Math.max(...flags),meanCandidateCount:mean(candidates),
   unresolvedOrUnsupported:burden.filter(x=>x.unresolved).length,rows:burden,boundary:'Machine-measured review workload proxy: ambiguity flags, candidate counts and unresolved states. It is not human elapsed review time.'},
  externalHumanAmbiguity:{cases:ambient.length,categoryCounts,linguistAgreement:{records:linguists.length,totalAnnotations:linguists.reduce((n,x)=>n+(x.annotations?.length??0),0),multiAnnotated:multi.length,exactStringAgreement:exactAgreement.length,exactStringAgreementRate:exactAgreement.length/multi.length,multilabelRecords:multilabel.length},boundary:'External AmbiEnt human annotations; exact-string agreement is descriptive annotation evidence, not SUTRA correctness or truth probability.'},
  modelAuthoredCoverage:{cases:syntheticManifest.counts.cases,families:syntheticManifest.counts.families,domains:syntheticManifest.counts.domains,humanAnnotation:false,hiddenTrainingExampleClaim:false},
  humanElapsedReviewTime:'NOT_MEASURED',truthProbability:'NOT_COMPUTED',decisionAuthority:'NONE'
 };
}
if(fileURLToPath(import.meta.url)===path.resolve(process.argv[1]??''))console.log(JSON.stringify(await runSemanticReviewMeasurement(),null,2));
