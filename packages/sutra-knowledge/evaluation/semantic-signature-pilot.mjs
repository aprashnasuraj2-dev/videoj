// Matched finite execution-signature experiment. Not a reproduction of a published parser.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {FACETS} from '../semantic-investigation.js';
import {challengeSemanticInterpretations} from '../semantic-counterfactual.js';
const fail=x=>{throw Error('SIGNATURE_PILOT_'+x);};
const decisive=s=>['constraint_satisfied','constraint_refuted'].includes(s);
function vote(rows,deduplicate){
 const unique=deduplicate?[...new Map(rows.map(r=>[r.programDigest,r])).values()]:rows;
 if(!unique.length||unique.some(r=>r.signature.some(s=>!decisive(s))))return [];
 const groups=new Map();
 for(const r of unique){const key=JSON.stringify(r.signature);groups.set(key,(groups.get(key)??0)+1);}
 const winner=[...groups].find(([,count])=>count*2>unique.length);
 return winner?rows.filter(r=>JSON.stringify(r.signature)===winner[0]).map(r=>r.id):[];
}
export async function runSignaturePilot(spec){
 if(spec.schemaVersion!==1||spec.split!=='development_synthetic'||!Array.isArray(spec.cases)||spec.cases.length!==6)fail('SPEC');
 const rows=[],caseIds=new Set();
 for(const c of spec.cases){
  if(caseIds.has(c.id))fail('DUPLICATE');caseIds.add(c.id);
  let source='';const bindings=[];
  for(const [id,value] of Object.entries(c.inputs)){
   source+=id+': ';const start=source.length;source+=value;
   bindings.push({id,sourceId:'record',start,end:source.length,type:{kind:'ratio',unit:'one',scope:'synthetic_same_scale',dimension:[0,0,0]}});source+='; ';
  }
  const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question:c.question,sources:[{id:'record',lineage:'synthetic',text:source}],bindings}));
  const proposals=[],metadata=[];
  for(const p of c.programs){
   const compiled=await compileReviewedExpression(contractText,pin,p.formula);
   for(let i=0;i<p.copies;i++){
    const id=p.id+'_'+i;proposals.push({id,proposalText:compiled.proposalText});
    metadata.push({id,programDigest:compiled.proposalDigest,semanticLabel:p.semanticLabel,expected:p.expected});
   }
  }
  const batchText=JSON.stringify({version:1,contractDigest:pin,proposals}),batchDigest=await casePin(batchText);
  const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest,candidates:metadata.map(m=>({id:m.id,meaning:m.id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))}))});
  const planText=JSON.stringify({version:1,contractDigest:pin,batchDigest,scenarios:c.scenarios.map(s=>({id:s.id,replacements:Object.entries(s.replacements).map(([bindingId,value])=>({bindingId,value}))}))});
  const result=await challengeSemanticInterpretations(contractText,pin,batchText,annotationText,await casePin(annotationText),planText,await casePin(planText));
  const observed=metadata.map(m=>({...m,signature:[result.baseline.find(r=>r.id===m.id).conditionalState,...result.scenarios.map(s=>s.rows.find(r=>r.id===m.id)?.conditionalState??'UNRESOLVED')]}));
  const expectedMatch=observed.every(r=>JSON.stringify(r.signature)===JSON.stringify(r.expected));
  const witnesses=result.scenarios.flatMap(s=>s.witnesses.map(w=>({scenario:s.id,...w})));
  const relevant=witnesses.filter(w=>observed.find(r=>r.id===w.left).semanticLabel!==observed.find(r=>r.id===w.right).semanticLabel);
  const selections={first_candidate:[observed[0].id],raw_signature_majority:vote(observed,false),deduplicated_signature_majority:vote(observed,true),retain_all:observed.map(r=>r.id)};
  const metrics=Object.fromEntries(Object.entries(selections).map(([method,ids])=>{
   const selected=observed.filter(r=>ids.includes(r.id)),right=selected.filter(r=>r.semanticLabel==='RIGHT').length,wrong=selected.filter(r=>r.semanticLabel==='WRONG').length;
   return [method,{selected:ids,right,wrong,abstained:!ids.length,correctLost:ids.length>0&&right===0,wrongOnly:ids.length>0&&right===0&&wrong>0,allCorrect:ids.length>0&&wrong===0}];
  }));
  rows.push({id:c.id,expectedMatch,witnessExpected:c.expectedWitness,witnessFound:relevant.length>0,matchedCandidateEvaluations:observed.length*(c.scenarios.length+1),observed,witnesses,metrics,decisionAuthority:result.decisionAuthority});
 }
 const summary={};for(const method of ['first_candidate','raw_signature_majority','deduplicated_signature_majority','retain_all']){
  const m=rows.map(r=>r.metrics[method]);summary[method]={cases:rows.length,abstained:m.filter(x=>x.abstained).length,correctLost:m.filter(x=>x.correctLost).length,wrongOnly:m.filter(x=>x.wrongOnly).length,allCorrect:m.filter(x=>x.allCorrect).length,retainedWrongCandidates:m.reduce((n,x)=>n+x.wrong,0)};
 }
 return {dataset:spec.dataset,split:spec.split,annotation:spec.annotation,cases:rows.length,exactCasesCorrect:rows.filter(r=>r.expectedMatch&&r.witnessFound===r.witnessExpected).length,matchedCandidateEvaluations:rows.reduce((n,r)=>n+r.matchedCandidateEvaluations,0),distinguishingCases:rows.filter(r=>r.witnessFound).length,summary,rows,qualification:'All execution-signature comparators receive identical programs, reviewed values and explicit scenarios; first-candidate ignores extra computations. Strict-majority baseline is a deliberately limited ablation, not reproduction of a published parser. Retaining all candidates never identifies intended meaning; wrong candidates remain visible, and no witness is not equivalence. Synthetic developer labels only; no empirical superiority or authority.'};
}
if(import.meta.url===(process.argv[1]?pathToFileURL(process.argv[1]).href:'')){
 const spec=JSON.parse(await readFile(new URL('./semantic-signature-pilot-v1.json',import.meta.url),'utf8')),r=await runSignaturePilot(spec);
 console.log(JSON.stringify(r,null,2));if(r.exactCasesCorrect!==r.cases)process.exitCode=1;
}
