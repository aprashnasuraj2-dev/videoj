// Orbital/Agent Studio semantic intake: local deterministic analysis over a real reviewed contract.
import {sealReviewedDraft} from '../../../packages/sutra-knowledge/reviewed-draft.js';
import {casePin} from '../../../packages/sutra-knowledge/pinned-investigation.js';
import {previewSemanticQuestion,compileSemanticCandidate} from '../../../packages/sutra-knowledge/semantic-question-engine.js';

const host=document.getElementById('agent-studio');
if(host){
 const section=document.createElement('section');section.id='semantic-intake';section.className='studio-round';section.setAttribute('aria-labelledby','semantic-intake-title');
 const title=document.createElement('h3');title.id='semantic-intake-title';title.textContent='Semantic intake · deterministic local';
 const explain=document.createElement('p');explain.textContent='Turn a bounded question into reviewable computational candidates before model orchestration. Alias mappings in this station are declared synthetic fixtures, not inferred truth.';
 const label=document.createElement('label');label.htmlFor='semantic-intake-question';label.textContent='Question';
 const question=document.createElement('textarea');question.id='semantic-intake-question';question.rows=2;question.maxLength=2048;question.value='Is the percentage change in revenue from 2024 to 2025 greater than limit?';
 const controls=document.createElement('div');controls.className='controls';
 const sample=document.createElement('button');sample.type='button';sample.id='semantic-intake-sample';sample.textContent='Load finance fixture';
 const analyze=document.createElement('button');analyze.type='button';analyze.id='semantic-intake-analyze';analyze.textContent='Analyze meaning';
 const compile=document.createElement('button');compile.type='button';compile.id='semantic-intake-compile';compile.textContent='Run first kernel-ready candidate';compile.disabled=true;
 controls.append(sample,analyze,compile);
 const status=document.createElement('p');status.id='semantic-intake-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.dataset.state='idle';status.textContent='No semantic analysis yet.';
 const detail=document.createElement('pre');detail.id='semantic-intake-detail';detail.textContent='No candidates.';
 const ambiguity=document.createElement('p');ambiguity.id='semantic-intake-ambiguity';ambiguity.className='hint';ambiguity.textContent='Twenty ambiguity families are checked; diagnostics never approve meaning.';
 section.append(title,explain,label,question,controls,status,ambiguity,detail);host.append(section);
 let current=null,busy=false,epoch=0;
 const ratio={kind:'ratio',unit:'one',scope:'same_company',dimension:[0,0,0]},money={kind:'currency_amount',unit:'USD',scope:'same_company',dimension:[0,0,0]};
 const rows=[['r24','100',['revenue 2024'],money],['r25','120',['revenue 2025'],money],['limit','3/20',['limit'],ratio]];
 function setBusy(v){busy=v;sample.disabled=v;analyze.disabled=v;compile.disabled=v||!current?.preview?.candidates.some(x=>x.status==='KERNEL_READY');}
 async function input(){
  let text='',bindings=[];for(const [id,value,,type] of rows){if(text)text+='; ';const start=text.length;text+=value;bindings.push({id,sourceId:'semantic_fixture',start,end:text.length,type});}
  const sealed=await sealReviewedDraft(JSON.stringify({version:1,question:question.value,sources:[{id:'semantic_fixture',text,lineage:'synthetic'}],bindings}));
  const aliases=rows.flatMap(([id,,names])=>names.map(alias=>({alias,bindingIds:[id]}))),catalogText=JSON.stringify({version:1,contractDigest:sealed.pin,aliases});
  return {contractText:sealed.contractText,contractPin:sealed.pin,catalogText,catalogPin:await casePin(catalogText)};
 }
 function render(preview){
  const review=preview.ambiguities.filter(x=>x.state==='REVIEW_REQUIRED'||x.state==='EXPLICIT_OR_REVIEW').length;
  status.dataset.state=preview.state==='UNREVIEWED_CANDIDATES'?'ready':preview.state==='SEMANTIC_REVIEW'?'review':'refused';status.textContent=preview.state.replaceAll('_',' ')+' · '+preview.candidates.length+' candidates · semantic review required.';
  ambiguity.textContent=review+' / '+preview.ambiguities.length+' ambiguity families require review or explicit confirmation. No authority granted.';
  detail.textContent=preview.candidates.map(x=>x.id+' · '+x.mode+' · '+x.status+(x.expression?'\n  '+x.expression:'\n  '+x.reason)).join('\n')||(preview.state==='SEMANTIC_REVIEW'?'Review-only language: structural and contextual obligations are visible, but no executable arithmetic candidate was invented.':'No executable candidate; unsupported or unresolved language remains visible.');
 }
 async function runAnalysis(){
  const ticket=++epoch;current=null;setBusy(true);status.dataset.state='busy';status.textContent='Analyzing locally…';
  try{const config=await input(),preview=await previewSemanticQuestion(config);if(ticket!==epoch)return;current={config,preview};render(preview);}
  catch{if(ticket===epoch){status.dataset.state='refused';status.textContent='Semantic analysis refused. No candidate is current.';detail.textContent='No candidates.';}}
  finally{if(ticket===epoch)setBusy(false);}
 }
 sample.onclick=()=>{epoch++;question.value='Is the percentage change in revenue from 2024 to 2025 greater than limit?';current=null;compile.disabled=true;status.dataset.state='idle';status.textContent='Finance fixture ready. Analyze locally.';detail.textContent='No candidates.';};
 question.addEventListener('input',()=>{epoch++;current=null;setBusy(false);compile.disabled=true;status.dataset.state='idle';status.textContent='Question changed. Analyze again.';});
 analyze.onclick=runAnalysis;
 compile.onclick=async()=>{
  if(busy||!current)return;const snapshot=current,candidate=snapshot.preview.candidates.find(x=>x.status==='KERNEL_READY');if(!candidate)return;
  setBusy(true);status.dataset.state='busy';status.textContent='Running reviewed compiler locally…';
  try{const result=await compileSemanticCandidate(snapshot.config,candidate.id,snapshot.preview.previewPin);if(current!==snapshot)return;status.dataset.state='compiled';status.textContent='Kernel result '+result.compiled.target.status+' · conditional computation only; meaning, evidence truth and decision authority remain unverified.';detail.textContent=candidate.expression+'\n'+result.compiled.target.status;}
  catch{if(current===snapshot){status.dataset.state='refused';status.textContent='Reviewed compiler refused the candidate.';}}
  finally{if(current===snapshot)setBusy(false);}
 };
}
