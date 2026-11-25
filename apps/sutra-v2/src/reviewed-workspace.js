import {inspectReviewedTextFile,addReviewedTextFile,reviseReviewedTextFile,MAX_FILE_BYTES} from '../../../packages/sutra-knowledge/reviewed-text-file.js';
import {exportReviewedQuestion} from '../../../packages/sutra-knowledge/reviewed-question.js';
import {evaluateReviewedFisher,FISHER_DESIGN} from '../../../packages/sutra-knowledge/reviewed-fisher.js';
import {evaluateReviewedBinomial,DESIGN_OBLIGATIONS} from '../../../packages/sutra-knowledge/reviewed-binomial.js';
import {evaluateReviewedIntervals} from '../../../packages/sutra-knowledge/reviewed-interval.js';
import {planRobustAcquisition} from '../../../packages/sutra-knowledge/robust-acquisition.js';
import {createInvestigationHistory,openInvestigationHistory} from '../../../packages/sutra-knowledge/investigation-history.js';
import {inspectReviewedTable,addReviewedTable} from '../../../packages/sutra-knowledge/reviewed-table.js';
import {compareSiblingInvestigations} from '../../../packages/sutra-knowledge/sibling-branch-contrast.js';
import {guidedLivingCase} from '../../../packages/sutra-knowledge/examples/guided-living-case.js';
import {auditStructuralExposure} from '../../../packages/sutra-knowledge/structural-exposure.js';
import {evaluateSemanticWorldGrid} from '../../../packages/sutra-knowledge/semantic-world-grid.js';
import {compileReviewedExpression} from '../../../packages/sutra-knowledge/reviewed-expression.js';
import {restoreReviewedSourceDraft,reviseReviewedSourceDraft,withdrawReviewedSourceDraft} from '../../../packages/sutra-knowledge/source-draft-restore.js';
import {planInvestigationClarifications} from '../../../packages/sutra-knowledge/clarification-plan.js';
import {previewClarificationAnswers} from '../../../packages/sutra-knowledge/clarification-preview.js';
import {auditRevisionReuse} from '../../../packages/sutra-knowledge/revision-reuse-audit.js';
import {exportInvestigationRoundtrip} from '../../../packages/sutra-knowledge/controlled-roundtrip.js';
import {sealReviewedDraft,draftComparisonProposal} from '../../../packages/sutra-knowledge/reviewed-draft.js';
import {exportReviewedProposal} from '../../../packages/sutra-knowledge/reviewed-claim-compiler.js';
import {reviewedSnapshotDigest,MAX_REVIEWED_SNAPSHOT_BYTES} from '../../../packages/sutra-knowledge/reviewed-snapshot.js';
import {exportReviewedOrderContrast} from '../../../packages/sutra-knowledge/reviewed-order-contrast.js';
import {FACETS} from '../../../packages/sutra-knowledge/semantic-investigation.js';
import {casePin} from '../../../packages/sutra-knowledge/pinned-investigation.js';
import {sealInvestigationVersion,replayInvestigationVersion,compareInvestigationVersions} from '../../../packages/sutra-knowledge/investigation-revision.js';
const by=id=>document.getElementById('review-'+id);
let sources=[],bindings=[],sealed=null,current=null,busy=false,epoch=0,stagedProposals=[],batchCurrent=null;
let roundtripCurrent=null,textFilePreview=null,withdrawalPreview=null;
let semanticCurrent=null,baseline=null,impactCurrent=null,annotations=new Map(),clarificationCurrent=null,previewCurrent=null,reuseCurrent=null,gridCurrent=null,exposureCurrent=null,branchCurrent=null;
let questionCurrent=null,questionExport=null,questionPathPin=null,questionSelections={left:null,right:null};
let tablePreview=null,tableSelections=[],history=null,acquisitionCurrent=null,intervalCurrent=null,binomialCurrent=null,fisherCurrent=null;
const tableFields=['table-text','table-source','table-lineage','table-inspect','table-row','table-column','table-id','table-kind','table-unit','table-scope','table-dim-l','table-dim-m','table-dim-t','table-add','table-stage','table-clear'];
const controls=['question','source-id','lineage','source-text','source-add','source-pick','select-text','binding-id','kind','unit','scope','dim-l','dim-m','dim-t','binding-add','seal','left','right','op','generate','proposal','run','export','export-pin','reset','batch-add','batch-run','batch-export','batch-clear','candidate-id','source-revise-pick','source-revise-text','source-revise','expression','expression-generate','sample-finance','sample-finance-corrected','sample-engineering','sample-engineering-corrected','sample-statistics','sample-statistics-corrected','sample-two-groups','sample-two-groups-corrected'];
function status(state,message){by('status').dataset.state=state;by('status').textContent=message;}
function control(){
 for(const id of controls)by(id).disabled=busy;
 if(!busy){by('binding-add').disabled=!sources.length;for(const id of ['left','right','op','generate'])by(id).disabled=!sealed||bindings.length<2;by('proposal').disabled=!sealed;by('run').disabled=!sealed||!by('proposal').value;by('export').disabled=!current;by('export-pin').disabled=!current;by('batch-add').disabled=!sealed||!by('proposal').value||stagedProposals.length>=8;by('batch-run').disabled=!sealed||stagedProposals.length<2;by('batch-clear').disabled=!stagedProposals.length;by('batch-export').disabled=!batchCurrent;by('candidate-id').disabled=!sealed;by('expression').disabled=!sealed;by('expression-generate').disabled=!sealed||!by('expression').value.trim();by('source-revise').disabled=!sources.length;by('source-revise-pick').disabled=!sources.length;by('source-revise-text').disabled=!sources.length;}
 semanticControl();tableControl();questionControl();textFileControl();
 by('source-withdraw-preview').disabled=busy||!sources.length;by('source-withdraw-apply').disabled=busy||!withdrawalPreview;
}
function invalidate(message){epoch++;clearWithdrawalPreview();clearTextFilePreview({clearFile:true});clearTablePreview();sealed=null;current=null;clearBatch();by('pin').textContent='No current contract.';by('contract').textContent='';by('expression').value='';by('proposal').value='';by('result').textContent='';by('snapshot-pin').textContent='';status('draft',message);control();}
function draft(s=sources,b=bindings){return JSON.stringify({version:1,question:by('question').value,sources:s,bindings:b});}
function options(element,items){element.replaceChildren();for(const id of items){const o=document.createElement('option');o.value=id;o.textContent=id;element.append(o);}}
function clearWithdrawalPreview(){withdrawalPreview=null;by('source-withdraw-summary').textContent='No withdrawal preview.';}
function clearTextFilePreview({clearFile=false}={}){
 textFilePreview=null;by('text-file-preview').textContent='No local file inspected.';by('text-file-digest').textContent='';
 if(clearFile)by('text-file').value='';
}
function textFileControl(){
 
 const mode=by('text-file-mode');mode.querySelector('option[value="replace"]').disabled=!sources.length;
 if(!sources.length)mode.value='add';
 const replace=mode.value==='replace';
 by('text-file-new-fields').hidden=replace;by('text-file-replace-fields').hidden=!replace;
 for(const id of ['text-file','text-file-mode'])by(id).disabled=busy;
 for(const id of ['text-file-source','text-file-lineage'])by(id).disabled=busy||replace;
 by('text-file-replace-source').disabled=busy||!replace;
 by('text-file-inspect').disabled=busy||!by('text-file').files?.length;
 by('text-file-stage').disabled=busy||!textFilePreview;
 by('text-file-stage').textContent=replace?'Replace inspected source (invalidate its bindings)':'Stage inspected text';
}
for(const id of ['text-file','text-file-mode','text-file-replace-source'])by(id).onchange=()=>{clearTextFilePreview();textFileControl();};
for(const id of ['text-file-source','text-file-lineage'])by(id).oninput=()=>{clearTextFilePreview();textFileControl();};
by('text-file-inspect').onclick=()=>work(async ticket=>{
 clearTextFilePreview();const file=by('text-file').files?.[0];
 if(!file||file.size<1||file.size>MAX_FILE_BYTES)throw Error('TEXT_FILE_SIZE');
 const bytes=new Uint8Array(await file.arrayBuffer()),doc=await inspectReviewedTextFile(bytes);
 if(ticket!==epoch||by('text-file').files?.[0]!==file)return;
 const mode=by('text-file-mode').value;
 const previous=mode==='replace'?sources.find(s=>s.id===by('text-file-replace-source').value):null;
 if(mode==='replace'&&!previous)throw Error('TEXT_FILE_IDENTITY');
 const previousSourceDigest=previous?await casePin(previous.text):null;
 if(ticket!==epoch)return;
 textFilePreview={bytes,doc,mode,previousSourceDigest,sourceId:previous?.id??by('text-file-source').value,lineage:previous?.lineage??by('text-file-lineage').value};
 const invalidated=previous?bindings.filter(b=>b.sourceId===previous.id).map(b=>b.id):[];
 by('text-file-preview').textContent=doc.byteLength+' bytes, '+doc.utf16Length+' UTF-16 units. Exact UTF-8 text; no quantity selected. Local preview only.'+(previous?'\nPrevious source digest: '+previousSourceDigest+'\nReplacement would invalidate: '+(invalidated.join(', ')||'none')+'. Other bindings remain.':'')+'\n'+doc.text;
 by('text-file-digest').textContent=doc.sourceDigest;status('text_file_inspected','Local file inspected without upload. Explicitly stage its exact text and review numeric spans separately.');
});
by('text-file-stage').onclick=()=>work(async ticket=>{
 const preview=textFilePreview;if(!preview)return;
 const r=preview.mode==='replace'?await reviseReviewedTextFile(draft(),preview.bytes,{sourceId:preview.sourceId,previousSourceDigest:preview.previousSourceDigest,sourceDigest:preview.doc.sourceDigest}):await addReviewedTextFile(draft(),preview.bytes,{sourceId:preview.sourceId,lineage:preview.lineage,sourceDigest:preview.doc.sourceDigest});
 if(ticket!==epoch||preview!==textFilePreview)return;
 sources=structuredClone(r.draft.sources);bindings=structuredClone(r.draft.bindings);
 clearTextFilePreview({clearFile:true});for(const id of ['text-file-source','text-file-lineage'])by(id).value='';
 invalidate(preview.mode==='replace'?'Exact source replaced. Reselect invalidated bindings: '+(r.invalidatedBindingIds.join(', ')||'none')+'. Retained bindings: '+(r.retainedBindingIds.join(', ')||'none')+'.':'Exact local file staged; zero automatically admitted quantities. Select and declare relevant numeric tokens.');refresh();by('source-pick').value=r.sourceId;by('select-text').value=sources.find(s=>s.id===r.sourceId).text;
});
function clearQuestionPreview(){questionCurrent=null;questionExport=null;by('question-path-result').textContent='';by('question-path-snapshot-pin').textContent='';by('question-path-plan-pin').textContent='';by('question-path-disclosure').textContent='No mapping export available.';}
function questionControl(){
 const pin=sealed?.pin??null;
 if(pin!==questionPathPin){
  questionPathPin=pin;questionSelections={left:null,right:null};clearQuestionPreview();
  by('question-path-text').value=sealed?JSON.parse(sealed.contractText).question.text:'';
  for(const side of ['left','right']){
   by('question-path-'+side+'-span').textContent='No selection.';
   options(by('question-path-'+side+'-binding'),sealed?bindings.map(b=>b.id):[]);
   by('question-path-'+side+'-binding').selectedIndex=-1;
  }
 }
 const mapped=side=>by('question-path-'+side+'-binding').selectedOptions.length;
 for(const id of ['question-path-text','question-path-left','question-path-right','question-path-left-binding','question-path-right-binding'])by(id).disabled=busy||!sealed;
 by('question-path-run').disabled=busy||!sealed||!questionSelections.left||!questionSelections.right||!mapped('left')||!mapped('right');
 by('question-path-stage').disabled=busy||!sealed||!questionCurrent||questionCurrent.contractDigest!==pin;
 for(const id of ['question-path-export','question-path-export-pin'])by(id).disabled=busy||!questionExport;
}
for(const side of ['left','right']){
 by('question-path-'+side).onclick=()=>{
  if(busy||!sealed)return;
  const el=by('question-path-text'),start=el.selectionStart,end=el.selectionEnd;
  questionSelections[side]=end>start?{start,end}:null;
  by('question-path-'+side+'-span').textContent=end>start?JSON.stringify(el.value.slice(start,end)):'No selection.';
  clearQuestionPreview();control();
 };
 by('question-path-'+side+'-binding').onchange=()=>{clearQuestionPreview();control();};
}
by('question-path-run').onclick=()=>work(async ticket=>{
 if(!sealed||!questionSelections.left||!questionSelections.right)return;
 clearQuestionPreview();
 const operand=side=>({...questionSelections[side],bindingIds:Array.from(by('question-path-'+side+'-binding').selectedOptions,o=>o.value)});
 const plan=JSON.stringify({version:1,contractDigest:sealed.pin,left:operand('left'),right:operand('right')});
 const exported=await exportReviewedQuestion(sealed.contractText,sealed.pin,plan,await casePin(plan)),result=exported.result;
 if(ticket!==epoch||result.contractDigest!==sealed?.pin)return;
 questionCurrent=result;
 const sourceInventory=JSON.parse(sealed.contractText).sources.map(s=>s.id+' ('+new TextEncoder().encode(s.text).length+' source bytes)');
 by('question-path-disclosure').textContent=exported.byteLength+' report bytes; includes original question, full reviewed source text from '+(sourceInventory.join(', ')||'no sources')+', all mappings and conditional results. '+(exported.portable?'Local download only; review before sharing.':'Exceeds the portable limit; no download.');
 if(exported.portable){questionExport={bytes:new TextEncoder().encode(exported.bundleText),digest:exported.snapshotPin};by('question-path-snapshot-pin').textContent=exported.snapshotPin;by('question-path-plan-pin').textContent=result.planDigest;}
 by('question-path-result').textContent=['Exact relation: '+result.relation.span.quote+' → '+result.relation.operator,...result.candidates.map(c=>c.meaning+' · '+c.conditionalState),result.qualification].join('\n');
 status('question_ready','Local grammar compiled. Review all supplied mappings and conditional outcomes before explicitly staging.');
});
by('question-path-export').onclick=()=>{if(!busy&&questionExport)download(questionExport.bytes,'sutra-reviewed-question.json','application/json');};
by('question-path-export-pin').onclick=()=>{if(!busy&&questionExport)download(questionExport.digest+'\n','sutra-reviewed-question.sha256','text/plain');};
by('question-path-stage').onclick=()=>{
 const r=questionCurrent;
 if(busy||!sealed||!r||r.contractDigest!==sealed.pin)return;
 epoch++;stagedProposals=structuredClone(r.proposals);batchCurrent=null;current=null;invalidateSemantic();
 annotations=new Map(r.candidates.map(c=>[c.id,{meaning:c.meaning,binding:c.leftBinding,facets:Object.fromEntries(Object.entries(c.facets).filter(([k,v])=>k!=='definition'&&v).map(([k,v])=>[k,{statement:v.statement,binding:v.references.find(x=>x.kind==='binding')?.id??''}])),generatedFacets:structuredClone(c.facets)}]));
 by('proposal').value=r.proposals[0].proposalText;by('result').textContent='';by('snapshot-pin').textContent='';by('batch-result').textContent='';
 clearQuestionPreview();renderBatch();control();
 status('question_staged',r.proposals.length===1?'One untrusted proposal staged. Evaluate it individually; no artificial consensus.':'All declared alternatives staged with exact question claims. Review meanings before sealing an investigation.');
};
function clearTablePreview(){
 tablePreview=null;tableSelections=[];by('table-row').replaceChildren();by('table-column').replaceChildren();by('table-cell').textContent='';by('table-list').textContent='';by('table-status').textContent='Inspect exact pasted text before selecting cells.';
}
function tableControl(){
 for(const id of tableFields)by(id).disabled=busy;
 if(!busy){
  by('table-inspect').disabled=!by('table-text').value.trim();
  for(const id of ['table-row','table-column','table-add'])by(id).disabled=!tablePreview;
  by('table-stage').disabled=!tablePreview||!tableSelections.length;
  by('table-clear').disabled=!tableSelections.length;
 }
}
function tableCell(){
 if(!tablePreview)return;
 const row=Number(by('table-row').value),column=Number(by('table-column').value),c=tablePreview.table.rows[row-1]?.[column];
 by('table-cell').textContent=c?'Row '+row+' · '+tablePreview.table.headers[column]+' · exact token '+JSON.stringify(c.text):'No cell selected.';
}
function tableList(){
 by('table-list').textContent=tableSelections.map(s=>s.id+' · row '+s.row+' / '+tablePreview.table.headers[s.column]+' · '+JSON.stringify(tablePreview.table.rows[s.row-1][s.column].text)+' · '+s.type.kind+' / '+s.type.unit+' · '+s.type.scope).join('\n');
}
for(const id of ['table-text','table-source','table-lineage'])by(id).oninput=()=>{clearTablePreview();tableControl();};
by('table-inspect').onclick=()=>work(async ticket=>{
 const text=by('table-text').value,table=inspectReviewedTable(text),digest=await casePin(text);
 if(ticket!==epoch)return;clearTablePreview();tablePreview={table,digest,text};
 for(let r=1;r<=table.rowCount;r++){const o=document.createElement('option');o.value=String(r);o.textContent=r+' · '+table.rows[r-1][0].text.slice(0,100);by('table-row').append(o);}
 table.headers.forEach((h,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=h;by('table-column').append(o);});
 by('table-column').selectedIndex=1;
 by('table-status').textContent=table.rowCount+' data rows × '+table.columnCount+' columns. Nothing admitted yet.';
 tableCell();status('table_inspected','Table inspected; explicitly select exact cells and declare their types.');
});
by('table-row').onchange=tableCell;by('table-column').onchange=tableCell;
by('table-add').onclick=()=>work(async ticket=>{
 const p=tablePreview;if(!p)return;
 const dim=['table-dim-l','table-dim-m','table-dim-t'].map(id=>{const x=by(id).value;if(!/^(0|-?[1-9][0-9]?)$/.test(x))throw Error('DRAFT_DIMENSION');return Number(x);});
 const next=[...tableSelections,{id:by('table-id').value,row:Number(by('table-row').value),column:Number(by('table-column').value),type:{kind:by('table-kind').value,unit:by('table-unit').value,scope:by('table-scope').value,dimension:dim}}];
 const selectionText=JSON.stringify({version:1,sourceDigest:p.digest,sourceId:by('table-source').value,lineage:by('table-lineage').value,cells:next});
 // Preview admission against existing draft before adding to the queue. Commit is separate.
 await addReviewedTable(draft(),p.text,selectionText,await casePin(selectionText));
 if(ticket!==epoch||p!==tablePreview)return;tableSelections=next;by('table-id').value='';tableList();status('table_selected','Selected cell passed numeric admission. Stage the reviewed table to apply all selections.');
});
by('table-clear').onclick=()=>{if(busy)return;tableSelections=[];tableList();tableControl();};
by('table-stage').onclick=()=>work(async ticket=>{
 const p=tablePreview;if(!p||!tableSelections.length)return;
 const selectionText=JSON.stringify({version:1,sourceDigest:p.digest,sourceId:by('table-source').value,lineage:by('table-lineage').value,cells:tableSelections});
 const r=await addReviewedTable(draft(),p.text,selectionText,await casePin(selectionText));
 if(ticket!==epoch||p!==tablePreview)return;
 sources=structuredClone(r.draft.sources);bindings=structuredClone(r.draft.bindings);
 invalidate('Reviewed table staged atomically. Seal the draft and compile an expression.');
 refresh();by('source-pick').value=r.draft.sources.at(-1).id;by('select-text').value=p.text;
 for(const id of ['table-text','table-source','table-lineage','table-id'])by(id).value='';
 status('table_staged','Exact table text and '+r.selectedCells.length+' reviewed numeric selections staged. No formula or meaning inferred.');
});
function refresh(){
 const selected=by('text-file-replace-source').value;options(by('text-file-replace-source'),sources.map(s=>s.id));if(sources.some(s=>s.id===selected))by('text-file-replace-source').value=selected;textFileControl();
 options(by('source-revise-pick'),sources.map(s=>s.id));by('source-revise-text').value=sources[0]?.text??'';
 options(by('source-pick'),sources.map(s=>s.id));by('select-text').value=sources[0]?.text??'';
 options(by('left'),bindings.map(b=>b.id));options(by('right'),bindings.map(b=>b.id));if(bindings.length>1)by('right').selectedIndex=1;
 by('staged').textContent=sources.length+' staged source(s) · '+bindings.length+' reviewed binding(s)';
 by('binding-list').replaceChildren();
 for(const b of bindings){const s=sources.find(s=>s.id===b.sourceId),p=document.createElement('p');p.textContent=b.id+' = '+s.text.slice(b.start,b.end)+' · '+b.type.kind+' / '+b.type.unit+' · scope '+b.type.scope+' · L/M/T '+b.type.dimension.join(', ');by('binding-list').append(p);}
}
async function work(fn){
 if(busy)return;busy=true;const ticket=epoch;control();
 try{await fn(ticket);}catch(e){if(ticket===epoch)status('refused','REFUSED: '+(typeof e?.message==='string'&&/^(DRAFT|COMPILER|SEMANTIC|REVISION|CASE|RESTORE|CLARIFICATION|EXPRESSION|WORLD_GRID|COUNTERFACTUAL|BRANCH|TABLE|HISTORY|ACQUISITION|INTERVAL|BINOMIAL|FISHER|QUESTION|TEXT_FILE)_[A-Z0-9_]{1,64}$/.test(e.message)?e.message:'invalid input or resource limit')+'.');}
 finally{busy=false;control();}
}
async function loadGuidedCase(domain,corrected,ticket){
 const c=await guidedLivingCase(domain,corrected);if(ticket!==epoch)return;
 const d=structuredClone(c.draft);sources=d.sources;bindings=d.bindings;by('question').value=d.question;
 invalidate('Synthetic example loaded; selections are predefined, not independently reviewed.');refresh();
 sealed={contractText:c.contractText,pin:c.pin};stagedProposals=structuredClone(c.proposals);
 annotations=new Map(c.candidates.map(a=>[a.id,{meaning:a.meaning,binding:a.binding,facets:{}}]));
 by('pin').textContent=c.pin;by('contract').textContent=c.contractText;
 by('sample-description').textContent=c.title+' · '+(corrected?c.change:'Baseline version. Retain it before loading the corrected example.')+' '+c.qualification;
 renderBatch();status('sample_ready','Synthetic example staged and sealed. Evaluate meanings to inspect conditional results.');
}
for(const domain of ['finance','engineering','statistics','two-groups'])for(const corrected of [false,true])by('sample-'+domain+(corrected?'-corrected':'')).onclick=()=>work(ticket=>loadGuidedCase(domain,corrected,ticket));
by('question').addEventListener('input',()=>invalidate('Question changed. Re-seal before evaluating a proposal.'));
by('source-add').onclick=()=>work(async ticket=>{
 const next=[...sources,{id:by('source-id').value,lineage:by('lineage').value,text:by('source-text').value}];
 await sealReviewedDraft(draft(next));if(ticket!==epoch)return;sources=next;
 invalidate('Source staged with exact textarea text; no source truth established.');refresh();by('source-pick').value=next.at(-1).id;by('select-text').value=next.at(-1).text;
 for(const id of ['source-id','lineage','source-text'])by(id).value='';
});
by('source-revise-pick').onchange=()=>{clearWithdrawalPreview();by('source-revise-text').value=sources.find(s=>s.id===by('source-revise-pick').value)?.text??'';control();};
by('source-withdraw-preview').onclick=()=>work(async ticket=>{
 clearWithdrawalPreview();
 const source=sources.find(s=>s.id===by('source-revise-pick').value);
 if(!source)throw Error('RESTORE_WITHDRAW_SOURCE_PIN');
 const wire=draft(),pin=await casePin(source.text),r=await withdrawReviewedSourceDraft(wire,source.id,pin);
 if(ticket!==epoch||wire!==draft()||source.id!==by('source-revise-pick').value)return;
 withdrawalPreview={wire,sourceId:source.id,pin};
 by('source-withdraw-summary').textContent='Withdraw '+source.id+' ('+pin+'). Invalidated bindings: '+(r.invalidatedBindingIds.join(', ')||'none')+'. Retained sources: '+(r.retainedSourceIds.join(', ')||'none')+'. Retained bindings: '+(r.retainedBindingIds.join(', ')||'none')+'. No change applied yet.';
 status('withdrawal_preview','Review the consequences, then explicitly confirm withdrawal.');
});
by('source-withdraw-apply').onclick=()=>work(async ticket=>{
 const p=withdrawalPreview;if(!p||p.wire!==draft()||p.sourceId!==by('source-revise-pick').value){clearWithdrawalPreview();throw Error('RESTORE_WITHDRAW_SOURCE_PIN');}
 const r=await withdrawReviewedSourceDraft(p.wire,p.sourceId,p.pin);
 if(ticket!==epoch||p!==withdrawalPreview||p.wire!==draft())return;
 sources=structuredClone(r.draft.sources);bindings=structuredClone(r.draft.bindings);
 invalidate('Source '+r.sourceId+' withdrawn from current draft. Invalidated bindings: '+(r.invalidatedBindingIds.join(', ')||'none')+'. Retained bindings: '+(r.retainedBindingIds.join(', ')||'none')+'. Historical versions unchanged.');refresh();
});
by('source-revise').onclick=()=>work(async ticket=>{
 const r=await reviseReviewedSourceDraft(draft(),by('source-revise-pick').value,by('source-revise-text').value);if(ticket!==epoch)return;
 sources=structuredClone(r.draft.sources);bindings=structuredClone(r.draft.bindings);
 invalidate('Source corrected. Reselect invalidated bindings: '+(r.invalidatedBindingIds.join(', ')||'none')+'. Retained bindings: '+(r.retainedBindingIds.join(', ')||'none')+'.');
 refresh();by('source-pick').value=r.sourceId;by('select-text').value=sources.find(s=>s.id===r.sourceId).text;
});
by('source-pick').onchange=()=>{by('select-text').value=sources.find(s=>s.id===by('source-pick').value)?.text??'';};
by('binding-add').onclick=()=>{
 const input=by('select-text'),start=input.selectionStart,end=input.selectionEnd,sourceId=by('source-pick').value;
 return work(async ticket=>{
  const dim=['dim-l','dim-m','dim-t'].map(id=>{const x=by(id).value;if(!/^(0|-?[1-9][0-9]?)$/.test(x))throw Error('DRAFT_DIMENSION');return Number(x);});
  const next=[...bindings,{id:by('binding-id').value,sourceId,start,end,type:{kind:by('kind').value,unit:by('unit').value,scope:by('scope').value,dimension:dim}}];
  await sealReviewedDraft(draft(sources,next));if(ticket!==epoch)return;bindings=next;
  invalidate('Exact selection and declared type reviewed. Seal when ready.');refresh();by('source-pick').value=sourceId;by('select-text').value=sources.find(s=>s.id===sourceId).text;by('binding-id').value='';
 });
};
by('seal').onclick=()=>work(async ticket=>{
 const result=await sealReviewedDraft(draft());if(ticket!==epoch)return;
 sealed=result;current=null;clearBatch();by('proposal').value='';by('result').textContent='';by('snapshot-pin').textContent='';by('pin').textContent=result.pin;by('contract').textContent=result.contractText;status('sealed','Reviewed contract sealed. Copy the pin independently if retaining evidence. No proposal evaluated.');
});
by('expression').oninput=()=>control();
by('expression-generate').onclick=()=>work(async ticket=>{
 if(!sealed)return;
 const result=await compileReviewedExpression(sealed.contractText,sealed.pin,by('expression').value);if(ticket!==epoch)return;
 current=null;by('result').textContent='';by('snapshot-pin').textContent='';by('proposal').value=result.proposalText;
 status('proposal','Local expression compiled to an untrusted proposal. Conditional precheck: '+result.target.status+'. Review the formula before staging or exporting.');
});
by('generate').onclick=()=>work(async ticket=>{
 if(!sealed)return;const p=await draftComparisonProposal(sealed.contractText,sealed.pin,by('left').value,by('right').value,by('op').value);if(ticket!==epoch)return;
 current=null;by('result').textContent='';by('snapshot-pin').textContent='';by('proposal').value=p;status('proposal','User-selected comparison drafted. The proposal is still untrusted and may not answer the question.');
});
by('proposal').addEventListener('input',()=>{epoch++;current=null;by('result').textContent='';by('snapshot-pin').textContent='';status('proposal','Proposal edited. Run again before exporting.');control();});
by('run').onclick=()=>work(async ticket=>{
 if(!sealed)return;current=null;by('result').textContent='';by('snapshot-pin').textContent='';control();
 const bundle=await exportReviewedProposal(sealed.contractText,sealed.pin,by('proposal').value);if(ticket!==epoch)return;
 const bytes=new TextEncoder().encode(JSON.stringify(bundle));
 const r=bundle.result;by('result').textContent=r.target.status.replaceAll('_',' ')+' · relevance UNVERIFIED · method UNVERIFIED\n'+r.nodes.map(n=>n.id+' · '+(n.receipt?.outcome.value??n.receipt?.outcome.status??n.status)).join('\n');
 if(bytes.length>MAX_REVIEWED_SNAPSHOT_BYTES){status('ready_unportable','Conditional computation available; portable report exceeds the 256 KiB profile. No export.');return;}
 const pin=await reviewedSnapshotDigest(bytes);if(ticket!==epoch)return;
 current={bytes,pin};by('snapshot-pin').textContent=pin;status('ready','Conditional computation available. Export contains the exact pasted source text; review before sharing. Retain both pins separately.');
});
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
by('export').onclick=()=>{if(current&&!busy)download(current.bytes,'sutra-reviewed-workspace.json','application/json');};
by('export-pin').onclick=()=>{if(current&&!busy)download(current.pin+'\n','sutra-reviewed-workspace.sha256','text/plain');};
by('reset').onclick=()=>{if(busy)return;sources=[];bindings=[];for(const id of ['question','source-id','lineage','source-text','binding-id','kind','unit','scope'])by(id).value='';for(const id of ['dim-l','dim-m','dim-t'])by(id).value='0';invalidate('Draft cleared from this workspace. Previously downloaded files are unaffected.');refresh();};
function nextCandidateId(){let i=1;while(stagedProposals.some(p=>p.id==='proposal_'+i))i++;return 'proposal_'+i;}
function renderBatch(){
 by('candidate-id').value=nextCandidateId();by('correspondence').checked=false;
 by('batch-count').textContent=stagedProposals.length+' / 8 staged proposals';
 by('batch-list').replaceChildren();
 for(const p of stagedProposals){const row=document.createElement('p');row.textContent=p.id+' · '+new TextEncoder().encode(p.proposalText).length+' bytes (untrusted)';by('batch-list').append(row);}
 renderSemanticRows();
}
function clearBatch(){stagedProposals=[];batchCurrent=null;annotations=new Map();invalidateSemantic();by('batch-result').textContent='';renderBatch();}
by('batch-add').onclick=()=>{
 if(busy||!sealed||!by('proposal').value||stagedProposals.length>=8)return;
 const id=by('candidate-id').value;
 if(!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id)||stagedProposals.some(p=>p.id===id)){status('refused','REFUSED: invalid or duplicate candidate identifier.');return;}
 const p={id,proposalText:by('proposal').value};
 const candidate=[...stagedProposals,p],batchText=JSON.stringify({version:1,contractDigest:sealed.pin,proposals:candidate});
 if(p.proposalText.length>65536||batchText.length>262144){status('refused','REFUSED: staged batch exceeds bounded input profile.');return;}
 stagedProposals=candidate;batchCurrent=null;invalidateSemantic();by('batch-result').textContent='';renderBatch();control();status('staged','Exact untrusted proposal staged; later edits do not change this saved copy.');
};
by('batch-clear').onclick=()=>{if(busy)return;clearBatch();control();status('sealed','Staged proposals cleared. Reviewed contract retained.');};
by('batch-run').onclick=()=>work(async ticket=>{
 if(!sealed||stagedProposals.length<2)return;
 batchCurrent=null;by('batch-result').textContent='';control();
 const text=JSON.stringify({version:1,contractDigest:sealed.pin,proposals:stagedProposals});
 const bundle=await exportReviewedOrderContrast(sealed.contractText,sealed.pin,text);if(ticket!==epoch)return;
 const bytes=new TextEncoder().encode(JSON.stringify(bundle));if(bytes.length>1048576)throw Error('DRAFT_BATCH_EXPORT_LIMIT');
 const c=bundle.contrast.result;
 by('batch-result').textContent=c.counts.admitted+' admitted, '+c.counts.refused+' refused · '+c.counts.distinctTypedStructures+' typed structures · NO DECISION AUTHORITY\n'+c.entries.map(e=>e.id+' · '+(e.computation?.status??e.reason)).join('\n')+'\n\n'+bundle.orderRelations.map(r=>r.left+' / '+r.right+' · '+(r.relation??r.status)+(r.orientation?' · '+r.orientation:'')+(r.uncovered?.length?' · both false possible: '+r.uncovered.join(', '):'')).join('\n');
 batchCurrent=bytes;status('batch_ready','Conditional order relations computed. Unaligned expressions remain unclassified; semantic relevance and source truth are not established.');
});
by('batch-export').onclick=()=>{if(batchCurrent&&!busy)download(batchCurrent,'sutra-reviewed-order-contrast.json','application/json');};
function clearAcquisition(){acquisitionCurrent=null;by('acquisition-result').textContent='';for(const id of ['acquisition-snapshot-pin','acquisition-version-pin','acquisition-grid-pin','acquisition-policy-pin'])by(id).textContent='';}
function clearGrid(){clearAcquisition();gridCurrent=null;by('world-result').textContent='';by('world-plan-pin').textContent='';by('world-snapshot-pin').textContent='';}
function clearBranch(){branchCurrent=null;by('branch-result').textContent='';}
function invalidateSemantic(){
 clearBranch();clearIntervals();clearBinomial();clearFisher();
 exposureCurrent=null;by('exposure-result').textContent='';clearGrid();
 clarificationCurrent=null;previewCurrent=null;reuseCurrent=null;by('clarification-result').textContent='';by('clarification-options').replaceChildren();by('clarification-preview').textContent='';by('reuse-result').textContent='';
 semanticCurrent=null;impactCurrent=null;clearRoundtrip();by('semantic-pin').textContent='No version evaluated.';by('semantic-result').textContent='';by('impact-result').textContent='';
}
function semanticControl(){
 for(const e of by('semantic-list').querySelectorAll('input,select'))e.disabled=busy;
 const ready=!!sealed&&stagedProposals.length>=2&&stagedProposals.every(p=>annotations.get(p.id)?.meaning.trim());
 by('correspondence').disabled=busy||!baseline;
 by('semantic-run').disabled=busy||!ready||!!baseline&&!by('correspondence').checked;
 for(const id of ['semantic-export','semantic-export-pin','semantic-retain','roundtrip-run','clarification-run'])by(id).disabled=busy||!semanticCurrent;
 for(const id of ['roundtrip-export','roundtrip-export-pin'])by(id).disabled=busy||!roundtripCurrent;
 by('baseline-file').disabled=busy;by('baseline-pin').disabled=busy;by('baseline-import').disabled=busy;
 by('baseline-clear').disabled=busy||!baseline;by('baseline-restore').disabled=busy||!baseline;by('impact-export').disabled=busy||!impactCurrent;
 by('exposure-run').disabled=busy||!semanticCurrent;by('exposure-export').disabled=busy||!exposureCurrent;
 by('interval-run').disabled=busy||!semanticCurrent;by('interval-export').disabled=busy||!intervalCurrent;by('interval-export-pin').disabled=busy||!intervalCurrent;
 for(const e of by('interval-fields').querySelectorAll('input,select'))e.disabled=busy||!semanticCurrent;
 by('binomial-run').disabled=busy||!semanticCurrent||bindings.filter(b=>b.type.kind==='count').length<2;by('binomial-export').disabled=busy||!binomialCurrent;by('binomial-export-pin').disabled=busy||!binomialCurrent;
 for(const el of by('binomial-fields').querySelectorAll('input,select'))el.disabled=busy||!semanticCurrent;
 by('fisher-run').disabled=busy||!semanticCurrent||bindings.filter(b=>b.type.kind==='count').length<4;by('fisher-export').disabled=busy||!fisherCurrent;by('fisher-export-pin').disabled=busy||!fisherCurrent;
 for(const el of by('fisher-fields').querySelectorAll('input,select'))el.disabled=busy||!semanticCurrent;
 by('world-run').disabled=busy||!semanticCurrent;by('world-export').disabled=busy||!gridCurrent;by('world-export-pin').disabled=busy||!gridCurrent;
 for(const e of by('world-fields').querySelectorAll('input,select'))e.disabled=busy||!semanticCurrent;
 for(const id of ['acquisition-mistake','acquisition-abstain','acquisition-source-cost','acquisition-read-cost','acquisition-exposure','acquisition-budget','acquisition-failure','acquisition-run'])by(id).disabled=busy||!gridCurrent;
 by('acquisition-export').disabled=busy||!acquisitionCurrent;by('acquisition-export-pin').disabled=busy||!acquisitionCurrent;
 by('branch-file').disabled=busy;by('branch-pin').disabled=busy;by('branch-run').disabled=busy||!baseline||!semanticCurrent||!impactCurrent||!by('branch-file').files?.length||!by('branch-pin').value.trim();by('branch-export').disabled=busy||!branchCurrent;
 by('reuse-run').disabled=busy||!impactCurrent;by('reuse-export').disabled=busy||!reuseCurrent;
 by('clarification-answer-run').disabled=busy||!clarificationCurrent||!clarificationCurrent.plan.questions.length;
 by('clarification-export').disabled=busy||!previewCurrent;
 for(const e of by('clarification-options').querySelectorAll('select'))e.disabled=busy;
 historyControl();renderStudio();
}
function studioNavigate(target){
 if(!target)return;
 for(let p=target.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
 target.focus({preventScroll:true});target.scrollIntoView({block:'center'});
}
by('open').onclick=e=>{e.preventDefault();const workspace=document.getElementById('reviewed-workspace');workspace.open=true;studioNavigate(workspace.querySelector('summary'));};
by('studio-next').onclick=()=>{if(!busy)studioNavigate(by(by('studio-next').dataset.target));};
function renderStudio(){
 const investigation=semanticCurrent?.report.investigation;
 by('studio-question').textContent=by('question').value.trim()||'No question entered.';
 by('studio-sources').textContent=String(sources.length);
 by('studio-bindings').textContent=String(bindings.length);
 by('studio-proposals').textContent=String(stagedProposals.length);
 const state=investigation?.triage.state??'NO_CURRENT_RESULT';
 by('studio-state').textContent=state.replaceAll('_',' ');
 by('studio-state').dataset.state=state;
 const cards=by('studio-cards');cards.replaceChildren();
 for(const c of investigation?.candidates??[]){
  const card=document.createElement('article'),title=document.createElement('h4'),meaning=document.createElement('p'),outcome=document.createElement('strong'),qual=document.createElement('small');
  card.className='studio-card';card.dataset.candidate=c.id;title.textContent=c.id;meaning.textContent=c.meaning;
  const status=c.computation?.status??'REFUSED';outcome.textContent=status.replaceAll('_',' ');outcome.dataset.outcome=status;
  qual.textContent='Meaning unverified · '+c.questionCoverage.replaceAll('_',' ').toLowerCase();
  card.append(title,meaning,outcome,qual);cards.append(card);
 }
 by('studio-impact').textContent=impactCurrent?impactCurrent.candidates.filter(c=>c.outcome==='CONDITIONAL_RESULT_REVERSED').length+' reversed · '+impactCurrent.candidates.filter(c=>c.outcome==='CONDITIONAL_RESULT_SURVIVES').length+' survived · '+impactCurrent.nextReview.length+' require review.':'No current revision comparison.';
 by('studio-baseline').textContent=baseline?'Baseline retained: '+baseline.digest.slice(7,19)+'… (conditional version)':'No baseline retained.';
 let target,label,help;
 if(investigation){
  if(state==='DIVERGENT_CONDITIONAL_OUTCOMES'){target='clarification-run';label='Inspect distinctions';help='The supplied candidate computations differ. Review the material distinctions before selecting a meaning.';}
  else if(state==='AGREEMENT_ON_SUPPLIED_CONDITIONAL_OUTCOMES'){target='interval-run';label='Inspect uncertainty';help='Agreement on these candidates is not proof. Test declared ranges and then export the exact version.';}
  else{target='roundtrip-run';label='Inspect unresolved results';help='Review missing inputs, refused proposals and the exact candidate meaning declarations.';}
 }else if(!by('question').value.trim()){target='question';label='Enter question';help='Start with the original question, or load a synthetic example below.';}
 else if(!sources.length){target='source-id';label='Stage source text';help='Supply exact text and its declared lineage.';}
 else if(bindings.length<2){target='select-text';label='Review numeric selections';help='Select quantities in their source text and declare unit, scope and dimension.';}
 else if(!sealed){target='seal';label='Review and seal draft';help='Seal the selected text and type declarations before creating proposals.';}
 else if(stagedProposals.length<2){target='left';label='Create candidate comparisons';help='Stage at least two proposed interpretations.';}
 else if(stagedProposals.some(p=>!annotations.get(p.id)?.meaning.trim())){target='meaning-'+stagedProposals.find(p=>!annotations.get(p.id)?.meaning.trim()).id;label='Declare candidate meaning';help='Describe what each candidate is intended to mean; this is not automatic entailment.';}
 else if(baseline&&!by('correspondence').checked){target='correspondence';label='Review correspondence';help='Confirm candidate identifiers correspond across versions before computing revision impact.';}
 else{target='semantic-run';label='Inspect evaluation controls';help='Evaluate all staged meanings under the sealed contract.';}
 const next=by('studio-next');next.dataset.target=target;next.textContent=label;next.disabled=busy;by('studio-help').textContent=help;
}
function renderSemanticRows(){
 const list=by('semantic-list');list.replaceChildren();
 for(const p of stagedProposals){
  const a=annotations.get(p.id)??{meaning:'',binding:'',facets:{}};annotations.set(p.id,a);
  const label=document.createElement('label'),input=document.createElement('input');
  input.id='review-meaning-'+p.id;input.maxLength=2048;input.autocomplete='off';input.value=a.meaning;
  label.htmlFor=input.id;label.textContent=p.id+' — proposed meaning';
  const bindingLabel=document.createElement('label'),select=document.createElement('select');
  select.id='review-meaning-link-'+p.id;bindingLabel.htmlFor=select.id;bindingLabel.textContent='Optional reviewed quantity reference';
  const empty=document.createElement('option');empty.value='';empty.textContent='No reference declared';select.append(empty);
  for(const b of bindings){const option=document.createElement('option');option.value=b.id;option.textContent=b.id;select.append(option);}
  select.value=a.binding;
  const inherited=document.createElement('small');const inheritedText=()=>{inherited.textContent=a.generatedFacets?.definition?'Generated links: '+a.generatedFacets.definition.references.map(r=>r.kind+':'+r.id).join(', ')+' (retained until edited).':'';};inheritedText();
  const change=()=>{epoch++;if(a.generatedFacets)delete a.generatedFacets.definition;inheritedText();a.meaning=input.value;a.binding=select.value;annotations.set(p.id,a);invalidateSemantic();semanticControl();};
  input.addEventListener('input',change);select.addEventListener('change',change);
  const row=document.createElement('div');row.append(label,input,bindingLabel,select,inherited);
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Review additional qualifiers (optional)';details.append(summary);
  for(const facet of FACETS.filter(k=>k!=='definition')){
   const field=document.createElement('div');field.className='pinned-fields';
   const label=document.createElement('label'),input=document.createElement('input'),refLabel=document.createElement('label'),ref=document.createElement('select');
   input.id='review-facet-'+p.id+'-'+facet;input.maxLength=1024;input.autocomplete='off';label.htmlFor=input.id;label.textContent=facet;
   ref.id=input.id+'-binding';refLabel.htmlFor=ref.id;refLabel.textContent='Optional quantity reference';
   const empty=document.createElement('option');empty.value='';empty.textContent='No reference declared';ref.append(empty);
   for(const binding of bindings){const o=document.createElement('option');o.value=binding.id;o.textContent=binding.id;ref.append(o);}
   const stored=a.facets[facet]??{statement:'',binding:''};input.value=stored.statement;ref.value=stored.binding;
   const inherited=document.createElement('small');const inheritedText=()=>{inherited.textContent=a.generatedFacets?.[facet]?'Generated links: '+a.generatedFacets[facet].references.map(r=>r.kind+':'+r.id).join(', ')+' (retained until edited).':'';};inheritedText();
   const changed=()=>{epoch++;if(a.generatedFacets)delete a.generatedFacets[facet];inheritedText();a.facets[facet]={statement:input.value,binding:ref.value};annotations.set(p.id,a);invalidateSemantic();semanticControl();};
   input.addEventListener('input',changed);ref.addEventListener('change',changed);field.append(label,input,refLabel,ref,inherited);details.append(field);
  }
  row.append(details);list.append(row);
 }
}
function semanticText(version){
 const i=version.report.investigation;
 return [i.triage.state.replaceAll('_',' '),'Original question: '+i.originalQuestion.text,...i.candidates.map(c=>c.id+' — '+c.meaning+' · '+(c.computation?.status??c.reason)+' · '+c.questionCoverage+' · meaning UNVERIFIED · method UNRESOLVED'),'No source truth, relevance or decision authority established.'].join('\n');
}
function impactText(r){
 return ['Source changes: '+(r.sourceChanges.map(s=>s.id+' '+s.change).join(', ')||'none'),'Question changed: '+(r.questionChanged?'yes':'no'),
  ...r.candidates.map(c=>c.id+' — '+c.outcome.replaceAll('_',' ')+' · dependency affected '+(c.dependencyAffected?'yes':'no')+' · review '+(c.reviewRequired?'required':'no new scoped dependency issue')),
  'New divergence: '+(r.triage.newDivergence?'yes':'no'),'Missing/unresolved: '+(r.missing.map(c=>c.id+' '+c.reason).join(', ')||'none'),'Full replay of both versions; no empirical or semantic assurance.'].join('\n');
}
function baselineState(){by('correspondence').checked=false;by('baseline-state').textContent=baseline?'Retained baseline '+baseline.digest+' · '+baseline.report.investigation.originalQuestion.text:'No baseline retained.';by('baseline-candidates').textContent=baseline?baseline.report.investigation.candidates.map(c=>c.id+' · '+c.meaning).join('\n'):'';}
by('correspondence').onchange=()=>semanticControl();
by('semantic-run').onclick=()=>work(async ticket=>{
 if(!sealed||stagedProposals.length<2||baseline&&!by('correspondence').checked)return;
 invalidateSemantic();semanticControl();
 const batchText=JSON.stringify({version:1,contractDigest:sealed.pin,proposals:stagedProposals});
 const candidates=stagedProposals.map(p=>{
  const a=annotations.get(p.id);if(!a?.meaning.trim())throw Error('SEMANTIC_MEANING_REQUIRED');
  const facets=Object.fromEntries(FACETS.map(k=>[k,null]));
  facets.definition=a.generatedFacets?.definition??{statement:a.meaning,references:a.binding?[{kind:'binding',id:a.binding}]:[]};
  for(const k of FACETS.filter(k=>k!=='definition')){const f=a.facets[k];if(a.generatedFacets?.[k])facets[k]=a.generatedFacets[k];else if(f?.statement.trim())facets[k]={statement:f.statement,references:f.binding?[{kind:'binding',id:f.binding}]:[]};else if(f?.binding)throw Error('SEMANTIC_FACET_STATEMENT_REQUIRED');}
  return {id:p.id,meaning:a.meaning,facets};
 });
 const annotationText=JSON.stringify({version:1,contractDigest:sealed.pin,batchDigest:await casePin(batchText),candidates});
 const prior=baseline;
 const version=await sealInvestigationVersion({previousDigest:prior?.digest??null,contractText:sealed.contractText,contractPin:sealed.pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
 if(ticket!==epoch)return;
 const impact=prior?await compareInvestigationVersions(prior.versionText,prior.digest,version.versionText,version.digest):null;
 if(ticket!==epoch)return;
 semanticCurrent=version;impactCurrent=impact;renderWorldAxes();
 by('semantic-pin').textContent=version.digest;by('semantic-result').textContent=semanticText(version);
 if(impact)by('impact-result').textContent=impactText(impact);
 status('semantic_ready',impact?'Version replayed and compared with retained baseline. Conditional outcomes and unresolved meaning remain separate.':'Version sealed. Retain its digest separately; no interpretation or source truth established.');
});
function clearRoundtrip(){roundtripCurrent=null;by('roundtrip-result').textContent='';by('roundtrip-snapshot-pin').textContent='';by('roundtrip-version-pin').textContent='';by('roundtrip-disclosure').textContent='No reconstruction export available.';}
by('roundtrip-export').onclick=()=>{if(!busy&&roundtripCurrent)download(roundtripCurrent.bytes,'sutra-controlled-roundtrip.json','application/json');};
by('roundtrip-export-pin').onclick=()=>{if(!busy&&roundtripCurrent)download(roundtripCurrent.digest+'\n','sutra-controlled-roundtrip.sha256','text/plain');};
by('roundtrip-run').onclick=()=>work(async ticket=>{
 if(!semanticCurrent)return;
 const current=semanticCurrent;clearRoundtrip();
 const exported=await exportInvestigationRoundtrip(current.versionText,current.digest),report=exported.result;
 if(ticket!==epoch||current!==semanticCurrent)return;
 if(exported.portable){roundtripCurrent={bytes:new TextEncoder().encode(exported.bundleText),digest:exported.snapshotPin};by('roundtrip-snapshot-pin').textContent=exported.snapshotPin;by('roundtrip-version-pin').textContent=current.digest;}
 by('roundtrip-disclosure').textContent=exported.byteLength+' report bytes; includes exact version, full reviewed source text, all candidate declarations and reconstructed instructions. '+(exported.portable?'Local download only; review before sharing.':'Exceeds 256 KiB portable limit; no download.');
 by('roundtrip-result').textContent=[
 'Original question: '+report.originalQuestion.text,
 ...report.candidates.flatMap(c=>[c.id+' · '+c.proposedMeaning,
 c.questionSelection?'Selected: '+c.questionSelection.selected+' · Unselected prefix: '+JSON.stringify(c.questionSelection.unselectedPrefix)+' · Unselected suffix: '+JSON.stringify(c.questionSelection.unselectedSuffix):'No admitted question span.',
 ...(c.computation?.steps.map(s=>s.statement+' · '+(s.outcome?.value??s.outcome?.status??s.status))??['No admitted computation.']),
 'Unspecified qualifiers: '+(c.review.unspecifiedFacets.join(', ')||'none'),
 'Unsupported declarations: '+(c.review.unsupportedFacets.join(', ')||'none'),
 ...c.qualifiers.filter(q=>q.status!=='UNSPECIFIED').map(q=>q.facet+': '+q.statement+' · '+q.status),
 'Meaning, entailment and method UNVERIFIED.']),
 ...report.differences.map(d=>d.left+' / '+d.right+' · qualifier differences: '+(d.declaredQualifierDifferences.join(', ')||'none')+' · instructions differ: '+(d.instructionStructureDiffers?'yes':'no')+' · semantic equivalence NOT ESTABLISHED'),
 report.qualification].join('\n');
 status('roundtrip_ready','Exact pinned instructions reconstructed. Review question coverage and qualifiers; no semantic equivalence or decision authority established.');
});
function clearIntervals(){
 intervalCurrent=null;by('interval-result').textContent='';for(const id of ['interval-snapshot-pin','interval-version-pin','interval-plan-pin'])by(id).textContent='';
}
function renderIntervalFields(){
 const panel=by('interval-fields');panel.replaceChildren();
 for(let i=1;i<=4;i++){
  const row=document.createElement('div');row.className='pinned-fields';
  const label=document.createElement('label'),select=document.createElement('select');select.id='review-interval-axis-'+i;label.htmlFor=select.id;label.textContent='Range '+i+' binding (optional)';
  const empty=document.createElement('option');empty.value='';empty.textContent='Not used';select.append(empty);
  for(const b of bindings){const s=sources.find(s=>s.id===b.sourceId),o=document.createElement('option');o.value=b.id;o.textContent=b.id+' · '+s.text.slice(b.start,b.end);select.append(o);}
  const change=()=>{clearIntervals();semanticControl();};select.onchange=change;row.append(label,select);
  for(const bound of ['lower','upper']){
   const l=document.createElement('label'),input=document.createElement('input');input.id='review-interval-'+bound+'-'+i;input.maxLength=100;input.placeholder='e.g. 3/2';input.autocomplete='off';l.htmlFor=input.id;l.textContent=bound+' inclusive rational bound';input.oninput=change;row.append(l,input);
  }
  panel.append(row);
 }
}
function renderWorldAxes(){
 renderIntervalFields();renderBinomialFields();renderFisherFields();
 const panel=by('world-fields');panel.replaceChildren();
 for(let i=1;i<=4;i++){
  const row=document.createElement('div');row.className='pinned-fields';
  const label=document.createElement('label'),select=document.createElement('select'),valueLabel=document.createElement('label'),input=document.createElement('input');
  select.id='review-world-axis-'+i;label.htmlFor=select.id;label.textContent='Axis '+i+' binding (optional)';
  const empty=document.createElement('option');empty.value='';empty.textContent='Not used';select.append(empty);
  for(const b of bindings){const s=sources.find(s=>s.id===b.sourceId),o=document.createElement('option');o.value=b.id;o.textContent=b.id+' · '+s.text.slice(b.start,b.end);select.append(o);}
  input.id='review-world-values-'+i;input.maxLength=400;input.placeholder='e.g. 2/1, 4/1';input.autocomplete='off';valueLabel.htmlFor=input.id;valueLabel.textContent='Two to four exact rational values, comma-separated';
  const change=()=>{clearGrid();semanticControl();};select.onchange=change;input.oninput=change;row.append(label,select,valueLabel,input);panel.append(row);
 }
}
function clearBinomial(){
 binomialCurrent=null;by('binomial-result').textContent='';for(const id of ['binomial-snapshot-pin','binomial-version-pin','binomial-plan-pin'])by(id).textContent='';
}
function renderBinomialFields(){
 const counts=bindings.filter(b=>b.type.kind==='count');
 for(const role of ['success','trial']){
  const select=by('binomial-'+role);select.replaceChildren();
  const empty=document.createElement('option');empty.value='';empty.textContent='Select reviewed count';select.append(empty);
  for(const b of counts){const s=sources.find(s=>s.id===b.sourceId),o=document.createElement('option');o.value=b.id;o.textContent=b.id+' · '+s.text.slice(b.start,b.end);select.append(o);}
 }
 by('binomial-null').value='1/2';by('binomial-alpha').value='1/20';by('binomial-family').value='1';by('binomial-alternative').value='greater';
 for(const k of DESIGN_OBLIGATIONS)by('binomial-design-'+k).checked=false;
}
for(const el of by('binomial-fields').querySelectorAll('input,select'))el.addEventListener('input',()=>{clearBinomial();semanticControl();});
by('binomial-run').onclick=()=>work(async ticket=>{
 const c=semanticCurrent;if(!c)return;clearBinomial();semanticControl();
 const design=Object.fromEntries(DESIGN_OBLIGATIONS.map(k=>[k,by('binomial-design-'+k).checked?'DECLARED_NOT_VERIFIED':'UNRESOLVED']));
 const planText=JSON.stringify({version:1,versionDigest:c.digest,successBinding:by('binomial-success').value,trialBinding:by('binomial-trial').value,nullProbability:by('binomial-null').value.trim(),alternative:by('binomial-alternative').value,familyAlpha:by('binomial-alpha').value.trim(),familySize:Number(by('binomial-family').value),design}),planDigest=await casePin(planText);
 const result=await evaluateReviewedBinomial(c.versionText,c.digest,planText,planDigest),text=JSON.stringify({versionText:c.versionText,versionDigest:c.digest,planText,planDigest,result}),snapshot=await casePin(text);
 if(ticket!==epoch||c!==semanticCurrent)return;binomialCurrent={text,snapshot};
 by('binomial-snapshot-pin').textContent=snapshot;by('binomial-version-pin').textContent=c.digest;by('binomial-plan-pin').textContent=planDigest;
 by('binomial-result').textContent=['Observed: '+result.counts.successes+'/'+result.counts.trials,'Exact inclusive one-sided tail: '+result.exactOneSidedTail,'Per-test alpha: '+result.perTestAlpha,result.mathematicalThreshold.replaceAll('_',' '),result.interpretation.replaceAll('_',' '),'Unresolved design: '+(result.unresolvedDesign.join(', ')||'None declared unresolved; not independently verified'),result.qualification].join('\n');
 status('binomial_ready','Exact conditional binomial tail computed. Sampling design and decision authority are not established.');
});
by('binomial-export').onclick=()=>{if(binomialCurrent&&!busy)download(binomialCurrent.text,'sutra-reviewed-binomial.json','application/json');};
by('binomial-export-pin').onclick=()=>{if(binomialCurrent&&!busy)download(binomialCurrent.snapshot+'\n','sutra-reviewed-binomial.sha256','text/plain');};
function clearFisher(){
 fisherCurrent=null;by('fisher-result').textContent='';for(const id of ['fisher-snapshot-pin','fisher-version-pin','fisher-plan-pin'])by(id).textContent='';
}
function renderFisherFields(){
 const counts=bindings.filter(b=>b.type.kind==='count');
 for(const role of ['as','an','bs','bn']){
  const select=by('fisher-'+role);select.replaceChildren();
  const empty=document.createElement('option');empty.value='';empty.textContent='Select reviewed count';select.append(empty);
  for(const b of counts){const s=sources.find(s=>s.id===b.sourceId),o=document.createElement('option');o.value=b.id;o.textContent=b.id+' · '+s.text.slice(b.start,b.end)+' · '+b.type.scope;select.append(o);}
 }
 by('fisher-alpha').value='1/20';by('fisher-family').value='1';by('fisher-alternative').value='two-sided-probability-order';
 for(const k of FISHER_DESIGN)by('fisher-design-'+k).checked=false;
}
for(const el of by('fisher-fields').querySelectorAll('input,select'))el.addEventListener('input',()=>{clearFisher();semanticControl();});
by('fisher-run').onclick=()=>work(async ticket=>{
 const c=semanticCurrent;if(!c)return;clearFisher();semanticControl();
 const design=Object.fromEntries(FISHER_DESIGN.map(k=>[k,by('fisher-design-'+k).checked?'DECLARED_NOT_VERIFIED':'UNRESOLVED']));
 const planText=JSON.stringify({version:1,versionDigest:c.digest,groupA:{successBinding:by('fisher-as').value,trialBinding:by('fisher-an').value},groupB:{successBinding:by('fisher-bs').value,trialBinding:by('fisher-bn').value},alternative:by('fisher-alternative').value,familyAlpha:by('fisher-alpha').value.trim(),familySize:Number(by('fisher-family').value),design}),planDigest=await casePin(planText);
 const result=await evaluateReviewedFisher(c.versionText,c.digest,planText,planDigest),text=JSON.stringify({versionText:c.versionText,versionDigest:c.digest,planText,planDigest,result});
 if(ticket!==epoch||c!==semanticCurrent)return;
 by('fisher-result').textContent=['Group A: '+result.groupA.successes+'/'+result.groupA.trials,'Group B: '+result.groupB.successes+'/'+result.groupB.trials,'Observed proportion difference A minus B: '+result.observedDifferenceAminusB,'Exact conditional tail: '+result.exactConditionalTail,'Per-test alpha: '+result.perTestAlpha,result.mathematicalThreshold.replaceAll('_',' '),result.interpretation.replaceAll('_',' '),'Unresolved design: '+(result.unresolvedDesign.join(', ')||'None declared unresolved; not independently verified'),result.qualification].join('\n');
 if(new TextEncoder().encode(text).length>262144){status('fisher_unportable','Exact conditional arithmetic available; report exceeds portable profile limit. No export.');return;}
 const snapshot=await casePin(text);if(ticket!==epoch||c!==semanticCurrent)return;
 fisherCurrent={text,snapshot};by('fisher-snapshot-pin').textContent=snapshot;by('fisher-version-pin').textContent=c.digest;by('fisher-plan-pin').textContent=planDigest;
 status('fisher_ready','Exact conditional comparison computed. Distinct declared groups are not proof of independence, and no causal or decision authority is established.');
});
by('fisher-export').onclick=()=>{if(fisherCurrent&&!busy)download(fisherCurrent.text,'sutra-reviewed-fisher.json','application/json');};
by('fisher-export-pin').onclick=()=>{if(fisherCurrent&&!busy)download(fisherCurrent.snapshot+'\n','sutra-reviewed-fisher.sha256','text/plain');};
by('interval-run').onclick=()=>work(async ticket=>{
 const c=semanticCurrent;if(!c)return;clearIntervals();semanticControl();
 const ranges=[],normal=s=>/^-?(?:0|[1-9][0-9]{0,47})$/.test(s)?s+'/1':s;
 for(let i=1;i<=4;i++){
  const bindingId=by('interval-axis-'+i).value,lower=by('interval-lower-'+i).value.trim(),upper=by('interval-upper-'+i).value.trim();
  if(!bindingId&&!lower&&!upper)continue;ranges.push({bindingId,lower:normal(lower),upper:normal(upper)});
 }
 const planText=JSON.stringify({version:1,versionDigest:c.digest,ranges}),planDigest=await casePin(planText);
 const result=await evaluateReviewedIntervals(c.versionText,c.digest,planText,planDigest);
 const text=JSON.stringify({versionText:c.versionText,versionDigest:c.digest,planText,planDigest,result}),snapshot=await casePin(text);
 if(ticket!==epoch||c!==semanticCurrent)return;intervalCurrent={text,snapshot};
 by('interval-snapshot-pin').textContent=snapshot;by('interval-version-pin').textContent=c.digest;by('interval-plan-pin').textContent=planDigest;
 by('interval-result').textContent=[...result.ranges.map(r=>r.bindingId+' ∈ ['+r.lower+', '+r.upper+']'),
 ...result.candidates.flatMap(c=>[c.id+' · '+c.status.replaceAll('_',' '),...c.nodes.map(n=>n.id+' · '+(n.bounds?'['+n.bounds.lower+', '+n.bounds.upper+']':n.status)+(n.reason?' · '+n.reason:''))]),result.qualification].join('\n');
 status('interval_ready','Exact conservative bounds computed; an unresolved enclosure is not proof of an actual reversal or statistical confidence.');
});
by('interval-export').onclick=()=>{if(intervalCurrent&&!busy)download(intervalCurrent.text,'sutra-reviewed-interval.json','application/json');};
by('interval-export-pin').onclick=()=>{if(intervalCurrent&&!busy)download(intervalCurrent.snapshot+'\n','sutra-reviewed-interval.sha256','text/plain');};
by('world-run').onclick=()=>work(async ticket=>{
 const c=semanticCurrent;if(!c)return;clearGrid();semanticControl();
 const axes=[];
 for(let i=1;i<=4;i++){
  const bindingId=by('world-axis-'+i).value,raw=by('world-values-'+i).value.trim();
  if(!bindingId&&!raw)continue;
  const values=raw.split(',').map(s=>s.trim()).map(s=>/^-?(?:0|[1-9][0-9]{0,47})$/.test(s)?s+'/1':s);
  axes.push({bindingId,values});
 }
 const planText=JSON.stringify({version:1,versionDigest:c.digest,axes,maxAssignments:16}),planDigest=await casePin(planText);
 const result=await evaluateSemanticWorldGrid(c.versionText,c.digest,planText,planDigest);
 const text=JSON.stringify({versionText:c.versionText,versionDigest:c.digest,planText,planDigest,result}),snapshot=await casePin(text);
 if(ticket!==epoch||c!==semanticCurrent)return;
 gridCurrent={text,snapshot};by('world-plan-pin').textContent=planDigest;by('world-snapshot-pin').textContent=snapshot;
 by('world-result').textContent=[result.coverage.evaluatedAssignments+' / '+result.coverage.totalAssignments+' assignments evaluated'+(result.coverage.truncated?' (truncated)':''),result.coverage.executedCells+' candidate cells actually evaluated',
 ...result.candidates.map(r=>r.id+' · '+r.status.replaceAll('_',' ')),
 ...result.worlds.map(w=>w.id+' · '+w.assignment.map(a=>a.bindingId+'='+a.value).join(', ')+' · '+w.rows.map(r=>r.id+': '+r.state).join('; ')),
 ...result.interactionWitnesses.map(w=>'Joint-change witness '+w.worldId+' · '+w.left+' / '+w.right+' · '+w.changedBindings.join(', ')),
 result.qualification].join('\n');
 status('world_ready','Finite synthetic worlds evaluated; original version unchanged. Retain the version, plan and snapshot digests separately for independent replay.');
});
by('world-export').onclick=()=>{if(gridCurrent&&!busy)download(gridCurrent.text,'sutra-semantic-world-grid.json','application/json');};
by('world-export-pin').onclick=()=>{if(gridCurrent&&!busy)download(gridCurrent.snapshot+'\n','sutra-semantic-world-grid.sha256','text/plain');};
const acquisitionInputs=['acquisition-mistake','acquisition-abstain','acquisition-source-cost','acquisition-read-cost','acquisition-exposure','acquisition-budget','acquisition-failure'];
for(const id of acquisitionInputs)by(id).oninput=()=>{clearAcquisition();semanticControl();};
by('acquisition-run').onclick=()=>work(async ticket=>{
 const g=gridCurrent,c=semanticCurrent;if(!g||!c)return;
 clearAcquisition();semanticControl();
 const data=JSON.parse(g.text);
 const amount=id=>{const s=by(id).value;if(!/^(0|[1-9][0-9]{0,6})$/.test(s)||Number(s)>1000000)throw Error('ACQUISITION_AMOUNT');return Number(s);};
 const mistake=amount('acquisition-mistake'),abstain=amount('acquisition-abstain'),sourceCost=amount('acquisition-source-cost'),readCost=amount('acquisition-read-cost'),exposure=amount('acquisition-exposure'),budget=amount('acquisition-budget');
 const failure=by('acquisition-failure').checked;
 const contract=JSON.parse(JSON.parse(c.versionText).contractText),bindings=new Map(contract.bindings.map(b=>[b.id,b]));
 const axes=data.result.axes,sourceIds=[...new Set(axes.map(a=>bindings.get(a.bindingId).span.sourceId))];
 const policy={version:1,versionDigest:c.digest,gridDigest:data.planDigest,costUnit:'declared_loss_units',exposureUnit:'abstract_exposure_units',exposureBudget:budget,
  sourceCosts:sourceIds.map(id=>({id,costUpper:sourceCost})),initiallyAcquired:[],
  decisions:[{id:'choose_true',loss:{constraint_satisfied:0,constraint_refuted:mistake}},{id:'choose_false',loss:{constraint_satisfied:mistake,constraint_refuted:0}},{id:'abstain',loss:{constraint_satisfied:abstain,constraint_refuted:abstain}}],
  actions:axes.map((a,i)=>({id:'observe_'+(i+1),sourceId:bindings.get(a.bindingId).span.sourceId,bindingId:a.bindingId,readCostUpper:readCost,exposure,
   outcomes:a.values.map((value,j)=>({value,labels:failure?['value_'+(j+1),'failed']:['value_'+(j+1)]}))}))};
 const policyText=JSON.stringify(policy),policyDigest=await casePin(policyText);
 const result=await planRobustAcquisition(c.versionText,c.digest,data.planText,data.planDigest,policyText,policyDigest);
 const text=JSON.stringify({versionText:c.versionText,versionDigest:c.digest,gridText:data.planText,gridDigest:data.planDigest,policyText,policyDigest,result});
 const snapshot=await casePin(text);if(ticket!==epoch||g!==gridCurrent||c!==semanticCurrent)return;
 acquisitionCurrent={text,snapshot};by('acquisition-snapshot-pin').textContent=snapshot;by('acquisition-version-pin').textContent=c.digest;by('acquisition-grid-pin').textContent=data.planDigest;by('acquisition-policy-pin').textContent=policyDigest;
 const render=(p,depth=0)=>{const prefix='  '.repeat(depth);return p.kind==='stop'?[prefix+'Stop: '+p.decision+' · worst loss '+p.worstObjective]:[prefix+'Observe '+p.actionId+' from '+p.sourceId+' · worst objective '+p.worstObjective,...p.branches.flatMap(b=>[prefix+'  '+b.outcome+':',...render(b.next,depth+2)])];};
 by('acquisition-result').textContent=[result.status.replaceAll('_',' '),...(result.plan?['Without observation: '+result.noObservation.worstObjective,'With best declared policy: '+result.plan.worstObjective,'Worst-case improvement: '+result.worstCaseImprovement,'Perfect-information lower bound: '+result.perfectInformationLowerBound,...render(result.plan)]:[]),result.qualification,'Snapshot digest: '+snapshot].join('\n');
 status('acquisition_ready','Hypothetical finite acquisition policy computed; no observation, payment, disclosure or action performed.');
});
by('acquisition-export').onclick=()=>{if(acquisitionCurrent&&!busy)download(acquisitionCurrent.text,'sutra-robust-acquisition.json','application/json');};
by('acquisition-export-pin').onclick=()=>{if(acquisitionCurrent&&!busy)download(acquisitionCurrent.snapshot+'\n','sutra-robust-acquisition.sha256','text/plain');};
by('exposure-run').onclick=()=>work(async ticket=>{
 const c=semanticCurrent;if(!c)return;exposureCurrent=null;by('exposure-result').textContent='';
 const r=await auditStructuralExposure(c.versionText,c.digest);if(ticket!==epoch||c!==semanticCurrent)return;
 exposureCurrent={versionText:c.versionText,versionDigest:c.digest,result:r};
 by('exposure-result').textContent=[r.counts.sourceArtifacts+' source artifacts · '+r.counts.conservativeCohorts+' conservative cohorts · independence NOT ESTABLISHED',
 r.cut.minimumCohorts===null?r.cut.status.replaceAll('_',' '):'Minimum declared input-touch cut: '+r.cut.minimumCohorts+' cohort(s)',
 ...r.cohorts.map(g=>g.id+' · '+g.sourceIds.join(', ')+' · affected targets '+(g.affectedTargetClasses.join(', ')||'none')),
 ...r.cut.sets.map(s=>'Cut: '+s.join(', ')),
 ...r.candidates.map(a=>a.id+' · '+a.state+' · target cohorts '+(a.targetCohorts.join(', ')||'none')),r.qualification].join('\n');
 status('exposure_ready','Structural dependency exposure computed; independence and actual failure are not established.');
});
by('exposure-export').onclick=()=>{if(exposureCurrent&&!busy)download(JSON.stringify(exposureCurrent),'sutra-structural-exposure.json','application/json');};
by('clarification-run').onclick=()=>work(async ticket=>{
 const current=semanticCurrent;if(!current)return;
 clarificationCurrent=null;previewCurrent=null;by('clarification-result').textContent='';by('clarification-options').replaceChildren();by('clarification-preview').textContent='';semanticControl();
 const plan=await planInvestigationClarifications(current.versionText,current.digest,{maxQuestions:3,maxScenarios:8});
 const digest=await casePin(JSON.stringify(plan));if(ticket!==epoch||current!==semanticCurrent)return;
 clarificationCurrent={plan,digest};
 by('clarification-result').textContent=[
 plan.counts.coveredPairs+' of '+plan.counts.materialPairs+' material pairs covered by '+plan.counts.questions+' declared clarification questions.',
 'Uncovered pairs: '+plan.uncoveredMaterialPairs.map(p=>p.left+' / '+p.right).join(', '),
 'Unresolved candidates: '+(plan.unresolved.map(c=>c.candidateIds.join(', ')+' · '+c.state).join('; ')||'none'),
 'Synthetic probes: '+plan.witnessSearch.evaluated+' / '+plan.witnessSearch.possible+(plan.witnessSearch.truncated?' (truncated)':''),
 ...plan.witnessSearch.witnesses.map(w=>w.left+' / '+w.right+' differ under '+w.replacements.map(r=>r.bindingId+' = '+r.value).join(', ')),
 'No witness does not prove equivalence. No candidate is selected or approved.'].join('\n');
 for(const q of plan.questions){
  const label=document.createElement('label'),select=document.createElement('select');select.id='review-clarification-'+q.facet;label.htmlFor=select.id;label.textContent=q.question;
  const empty=document.createElement('option');empty.value='';empty.textContent='Leave unanswered';select.append(empty);
  q.answers.forEach((a,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=a.statement+' ('+a.alternatives.flatMap(x=>x.candidateIds).join(', ')+')';select.append(o);});
  select.onchange=()=>{previewCurrent=null;by('clarification-preview').textContent='';semanticControl();};
  const row=document.createElement('div');row.className='pinned-fields';row.append(label,select);by('clarification-options').append(row);
 }
 status('clarification_ready','Material clarification plan ready. Answers only preview declared compatibility; the pinned investigation remains unchanged.');
});
by('clarification-answer-run').onclick=()=>work(async ticket=>{
 const current=semanticCurrent,c=clarificationCurrent;if(!current||!c)return;
 previewCurrent=null;by('clarification-preview').textContent='';
 const answers=c.plan.questions.flatMap(q=>{const v=by('clarification-'+q.facet).value;return v===''?[]:[{facet:q.facet,statement:q.answers[Number(v)].statement}];});
 const responseText=JSON.stringify({version:1,versionDigest:current.digest,planDigest:c.digest,budget:c.plan.budget,answers}),responsePin=await casePin(responseText);
 const preview=await previewClarificationAnswers(current.versionText,current.digest,responseText,responsePin);
 if(ticket!==epoch||current!==semanticCurrent||c!==clarificationCurrent)return;
 previewCurrent={versionText:current.versionText,versionDigest:current.digest,responseText,responsePin,preview};
 by('clarification-preview').textContent=[preview.status.replaceAll('_',' '),...preview.candidates.map(x=>x.id+' · '+x.compatibility.replaceAll('_',' ')+' · '+x.conditionalState),'Original version unchanged. No decision authority.'].join('\n');
 status('clarification_preview','Answer compatibility preview ready; all candidates remain in the pinned version.');
});
by('clarification-export').onclick=()=>{if(previewCurrent&&!busy)download(JSON.stringify(previewCurrent),'sutra-clarification-preview.json','application/json');};
by('reuse-run').onclick=()=>work(async ticket=>{
 const a=baseline,b=semanticCurrent;if(!a||!b||!impactCurrent)return;
 reuseCurrent=null;by('reuse-result').textContent='';
 const audit=await auditRevisionReuse(a.versionText,a.digest,b.versionText,b.digest);
 if(ticket!==epoch||a!==baseline||b!==semanticCurrent)return;
 reuseCurrent={beforeVersion:a.versionText,beforeDigest:a.digest,afterVersion:b.versionText,afterDigest:b.digest,audit};
 by('reuse-result').textContent=[audit.counts.reused+' reused · '+audit.counts.executed+' executed · '+audit.counts.removed+' removed',...audit.rows.map(r=>r.id+' · '+r.reused.length+' reused · '+r.executed.length+' executed · fresh replay matches'),audit.qualification].join('\n');
 status('reuse_ready','Diagnostic reuse audit matched fresh computation. Both complete versions were replayed; no speedup claim.');
});
by('reuse-export').onclick=()=>{if(reuseCurrent&&!busy)download(JSON.stringify(reuseCurrent),'sutra-revision-reuse-audit.json','application/json');};
by('semantic-export').onclick=()=>{if(semanticCurrent&&!busy)download(semanticCurrent.versionText,'sutra-investigation-version.json','application/json');};
by('semantic-export-pin').onclick=()=>{if(semanticCurrent&&!busy)download(semanticCurrent.digest+'\n','sutra-investigation-version.sha256','text/plain');};
by('semantic-retain').onclick=()=>{if(!semanticCurrent||busy)return;clearBranch();baseline=semanticCurrent;impactCurrent=null;reuseCurrent=null;by('reuse-result').textContent='';by('impact-result').textContent='';baselineState();semanticControl();status('semantic_ready','Current version retained as baseline in this tab. Export the exact version and digest to keep it across sessions.');};
by('baseline-clear').onclick=()=>{if(busy)return;clearBranch();baseline=null;impactCurrent=null;reuseCurrent=null;by('reuse-result').textContent='';by('impact-result').textContent='';baselineState();semanticControl();};
by('baseline-restore').onclick=()=>work(async ticket=>{
 const a=baseline;if(!a)return;
 const r=await restoreReviewedSourceDraft(a.versionText,a.digest);if(ticket!==epoch||a!==baseline)return;
 const d=structuredClone(r.draft);sources=d.sources;bindings=d.bindings;by('question').value=d.question;
 for(const id of ['source-id','lineage','source-text','binding-id','kind','unit','scope'])by(id).value='';
 for(const id of ['dim-l','dim-m','dim-t'])by(id).value='0';
 invalidate('Historical source selections restored. Candidate programs remain in the pinned baseline; explicitly stage corresponding candidates after sealing.');refresh();
 status('restored','Restored '+sources.length+' source(s) and '+bindings.length+' reviewed selection(s). No candidate copied or approved.');
});
by('baseline-import').onclick=()=>{
 const file=by('baseline-file').files?.[0],digest=by('baseline-pin').value.trim();
 return work(async ticket=>{
  if(!file||!file.size||file.size>262144)throw Error('REVISION_FILE_SIZE');
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes.length!==file.size||bytes.length>262144)throw Error('REVISION_FILE_SIZE');
  const versionText=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
  const report=await replayInvestigationVersion(versionText,digest);if(ticket!==epoch)return;
  baseline={versionText,digest,report};invalidateSemantic();baselineState();
  by('baseline-file').value='';by('baseline-pin').value='';
  status('baseline_ready','Exact saved baseline replayed from separately pinned bytes. Stage a corrected version to compare.');
 });
};
for(const id of ['branch-file','branch-pin'])by(id).addEventListener('input',()=>{clearBranch();semanticControl();});
by('branch-file').addEventListener('change',()=>{clearBranch();semanticControl();});
by('branch-run').onclick=()=>work(async ticket=>{
 const base=baseline,left=semanticCurrent,file=by('branch-file').files?.[0],rightDigest=by('branch-pin').value.trim();
 if(!base||!left||!impactCurrent||!file)return;
 clearBranch();semanticControl();
 if(!file.size||file.size>262144)throw Error('REVISION_FILE_SIZE');
 const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length!==file.size||bytes.length>262144)throw Error('REVISION_FILE_SIZE');
 const rightText=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
 const result=await compareSiblingInvestigations(base.versionText,base.digest,left.versionText,left.digest,rightText,rightDigest);
 if(ticket!==epoch||base!==baseline||left!==semanticCurrent)return;
 branchCurrent={baseVersion:base.versionText,baseDigest:base.digest,leftVersion:left.versionText,leftDigest:left.digest,rightVersion:rightText,rightDigest,result};
 by('branch-result').textContent=[result.status.replaceAll('_',' '),result.conflicts.length+' conflicting changed object(s)',
 ...result.changes.map(r=>r.kind+' / '+r.id+' · '+r.classification.replaceAll('_',' ')+' · current '+r.leftOperation+' · imported '+r.rightOperation),
 ...result.outcomes.map(r=>r.id+' · baseline '+r.base+' · current '+r.left+' · imported '+r.right),
 result.qualification].join('\n');
 status('branch_ready','Both branches replayed from their exact common parent. Nothing merged or selected.');
});
by('branch-export').onclick=()=>{if(branchCurrent&&!busy)download(JSON.stringify(branchCurrent),'sutra-sibling-contrast.json','application/json');};
function historyControl(){
 const s=history?.snapshot(),branch=s?.view.branches.find(b=>b.name===by('history-branch').value);
 by('history-create').disabled=busy||!!history||!semanticCurrent||semanticCurrent.report.previousDigest!==null;
 by('history-append').disabled=busy||!branch||!semanticCurrent||semanticCurrent.report.previousDigest!==branch.head||s.view.versions.some(v=>v.digest===semanticCurrent.digest);
 for(const id of ['history-branch','history-version','history-fork-name','history-fork','history-restore','history-export','history-export-pin','history-clear'])by(id).disabled=busy||!history;
 for(const id of ['history-file','history-pin','history-import'])by(id).disabled=busy||!!history;
 if(!busy&&!history)by('history-import').disabled=!by('history-file').files?.length||!by('history-pin').value.trim();
}
function renderHistory(){
 const branch=by('history-branch'),version=by('history-version'),oldBranch=branch.value,oldVersion=version.value;
 branch.replaceChildren();version.replaceChildren();
 const s=history?.snapshot();
 by('history-digest').textContent=s?.digest??'No history retained.';
 if(!s){by('history-result').textContent='';historyControl();return;}
 for(const b of s.view.branches){const o=document.createElement('option');o.value=b.name;o.textContent=b.name+' · '+b.head.slice(7,19);branch.append(o);}
 for(const v of s.view.versions){const o=document.createElement('option');o.value=v.digest;o.textContent=v.digest.slice(7,19)+' · '+v.triage.replaceAll('_',' ');version.append(o);}
 if(s.view.branches.some(b=>b.name===oldBranch))branch.value=oldBranch;
 else if(s.view.branches.some(b=>b.name==='main'))branch.value='main';
 if(s.view.versions.some(v=>v.digest===oldVersion))version.value=oldVersion;
 by('history-result').textContent=[s.view.versions.length+' exact version(s) · '+s.view.branches.length+' branch(es)',...s.view.branches.map(b=>b.name+' → '+b.head),
 ...s.view.versions.map(v=>v.digest.slice(7,19)+' · parent '+(v.parent?.slice(7,19)??'root')+' · '+v.triage.replaceAll('_',' ')),s.view.qualification].join('\n');
 historyControl();
}
by('history-branch').onchange=historyControl;
for(const id of ['history-file','history-pin'])by(id).addEventListener('input',historyControl);
by('history-file').addEventListener('change',historyControl);
by('history-create').onclick=()=>work(async ticket=>{
 const v=semanticCurrent;if(history||!v)return;
 const h=await createInvestigationHistory(v.versionText,v.digest);
 if(ticket!==epoch||v!==semanticCurrent)return;history=h;renderHistory();status('history_ready','Root version retained in an in-memory history. Export exact bytes and a separate digest.');
});
by('history-append').onclick=()=>work(async ticket=>{
 const h=history,v=semanticCurrent,s=h?.snapshot(),branch=by('history-branch').value,head=s?.view.branches.find(b=>b.name===branch)?.head;
 if(!h||!v||!head)return;
 await h.append({expectedHistoryPin:s.digest,branch,expectedHead:head,versionText:v.versionText,versionPin:v.digest});
 if(ticket!==epoch||h!==history)return;renderHistory();status('history_ready','Current child appended to the explicitly selected branch. Prior versions remain intact.');
});
by('history-fork').onclick=()=>work(async ticket=>{
 const h=history,s=h?.snapshot();if(!h)return;
 const branch=by('history-fork-name').value;
 await h.fork({expectedHistoryPin:s.digest,branch,fromDigest:by('history-version').value});
 if(ticket!==epoch||h!==history)return;renderHistory();by('history-branch').value=branch;by('history-fork-name').value='';status('history_ready','New branch retained from the selected historical version. No version changed.');
});
by('history-restore').onclick=()=>{
 if(busy||!history)return;
 baseline=history.restore(by('history-version').value);invalidateSemantic();baselineState();control();
 status('baseline_ready','Historical version restored as comparison baseline. Current draft text is unchanged; use the separate source restore action if desired.');
};
by('history-export').onclick=()=>{if(history&&!busy)download(history.snapshot().historyText,'sutra-investigation-history.json','application/json');};
by('history-export-pin').onclick=()=>{if(history&&!busy)download(history.snapshot().digest+'\n','sutra-investigation-history.sha256','text/plain');};
by('history-clear').onclick=()=>{if(!busy){history=null;renderHistory();status('history_cleared','In-memory history forgotten. Downloaded files, current draft and retained baseline are unchanged.');}};
by('history-import').onclick=()=>work(async ticket=>{
 if(history)return;
 const file=by('history-file').files?.[0],digest=by('history-pin').value.trim();
 if(!file||!file.size||file.size>262144)throw Error('HISTORY_FILE_SIZE');
 const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length!==file.size||bytes.length>262144)throw Error('HISTORY_FILE_SIZE');
 const h=await openInvestigationHistory(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes),digest);
 if(ticket!==epoch)return;history=h;by('history-file').value='';by('history-pin').value='';renderHistory();status('history_ready','All exact versions and branch heads replayed from the saved history. No draft or baseline changed.');
});
by('impact-export').onclick=()=>{if(impactCurrent&&semanticCurrent&&baseline&&!busy)download(JSON.stringify({beforeVersion:baseline.versionText,beforeDigest:baseline.digest,afterVersion:semanticCurrent.versionText,afterDigest:semanticCurrent.digest,impact:impactCurrent}),'sutra-investigation-impact.json','application/json');};
renderBatch();refresh();baselineState();control();
