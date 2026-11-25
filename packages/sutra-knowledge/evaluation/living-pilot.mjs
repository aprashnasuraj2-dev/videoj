// Frozen development pilot; not a live LLM or independent expert benchmark.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft,selectedSpan} from '../reviewed-draft.js';
import {compileReviewedProposal} from '../reviewed-claim-compiler.js';
import {FACETS,evaluateSemanticInvestigation} from '../semantic-investigation.js';
const yes='CONDITIONALLY_SATISFIED',no='CONDITIONALLY_REFUTED',decisive=s=>s===yes||s===no;
const conditional=states=>states.length&&states.every(x=>decisive(x)&&x===states[0])?states[0]:null;
function wireProposal(c,pin,question){
 const leaf=(id,bindingId)=>c.unknown?.bindingId===bindingId?{id,kind:'unknown',type:c.unknown.type,reason:'Field absent from reviewed case.'}:{id,kind:'input',bindingId};
 const nodes=[leaf('left_value',c.left),leaf('right_value',c.right),{id:'target',kind:'constraint',op:c.op,args:['left_value','right_value']}];
 if(c.fabricated)nodes[0].value='999';
 return JSON.stringify({version:1,contractDigest:pin,questionSpan:selectedSpan('question',question,0,question.length),claims:[],nodes,targetId:'target'});
}
export async function runLivingPilot(data){
 if(data.schemaVersion!==1||data.split!=='development_synthetic'||!Array.isArray(data.cases)||data.cases.length!==16)throw Error('PILOT_SPEC');
 const rows=[],ids=new Set();
 for(const c of data.cases){
  if(ids.has(c.id))throw Error('PILOT_DUPLICATE');ids.add(c.id);
  const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question:c.question,sources:c.sources,bindings:c.bindings}));
  const proposals=c.candidates.map(a=>({id:a.id,proposalText:wireProposal(a,pin,c.question)}));
  const batchText=JSON.stringify({version:1,contractDigest:pin,proposals});
  const candidates=c.candidates.map(a=>({id:a.id,meaning:a.meaning,facets:Object.fromEntries(FACETS.map(k=>[k,null]))}));
  const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
  // Baselines receive exactly the same reviewed data and candidate programs.
  const baseline=[];
  for(const p of proposals){try{baseline.push((await compileReviewedProposal(contractText,pin,p.proposalText)).target.status);}catch{baseline.push('REFUSED');}}
  const result=await evaluateSemanticInvestigation(contractText,pin,batchText,annotationText,await casePin(annotationText));
  const by=new Map(result.candidates.map(x=>[x.id,x.computation?.status??'REFUSED']));
  const actual=c.candidates.map(a=>by.get(a.id)),expected=c.candidates.map(a=>a.expected);
  const outcome=conditional(expected);
  const outputs={first_candidate:decisive(baseline[0])?baseline[0]:null,enumerate_all:conditional(baseline),sutra:result.triage.state==='AGREEMENT_ON_SUPPLIED_CONDITIONAL_OUTCOMES'?conditional(actual):null};
  rows.push({id:c.id,domain:c.domain,expectedTriage:c.expected,actualTriage:result.triage.state,expectedStates:expected,actualStates:actual,correct:result.triage.state===c.expected&&JSON.stringify(expected)===JSON.stringify(actual),expectedConditional:outcome,outputs,semanticAuthority:result.verification.semanticInterpretation});
 }
 const methods={};
 for(const method of ['first_candidate','enumerate_all','sutra']){
  const answered=rows.filter(x=>x.outputs[method]!==null),correct=answered.filter(x=>x.outputs[method]===x.expectedConditional),unsupported=answered.filter(x=>x.expectedConditional===null);
  methods[method]={cases:rows.length,answered:answered.length,coverage:answered.length/rows.length,correctAnswered:correct.length,accuracyAmongAnswered:answered.length?correct.length/answered.length:null,unsupportedDecisive:unsupported.length,missedInvariant:rows.filter(x=>x.expectedConditional!==null&&x.outputs[method]===null).length};
 }
 return {dataset:data.dataset,split:data.split,annotation:data.annotation,caseCount:rows.length,exactCasesCorrect:rows.filter(x=>x.correct).length,methods,rows,
  qualification:'Conditional decisions only over supplied programs. First-candidate is a weak ablation; enumerate-all uses the same exact compiler and is a strong simple triage comparator, not a live LLM. No semantic/empirical authority, statistical generalization, external human review or superiority claim.'};
}
if(import.meta.url===(process.argv[1]?pathToFileURL(process.argv[1]).href:'')){
 const data=JSON.parse(await readFile(new URL('./living-pilot-v1.json',import.meta.url),'utf8'));
 const r=await runLivingPilot(data);console.log(JSON.stringify(r,null,2));if(r.exactCasesCorrect!==r.caseCount)process.exitCode=1;
}
