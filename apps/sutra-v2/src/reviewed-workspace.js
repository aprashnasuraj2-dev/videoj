import {renderInvestigationRoundtrip} from '../../../packages/sutra-knowledge/controlled-roundtrip.js';
import {sealReviewedDraft,draftComparisonProposal} from '../../../packages/sutra-knowledge/reviewed-draft.js';
import {exportReviewedProposal} from '../../../packages/sutra-knowledge/reviewed-claim-compiler.js';
import {reviewedSnapshotDigest,MAX_REVIEWED_SNAPSHOT_BYTES} from '../../../packages/sutra-knowledge/reviewed-snapshot.js';
import {exportReviewedOrderContrast} from '../../../packages/sutra-knowledge/reviewed-order-contrast.js';
import {FACETS} from '../../../packages/sutra-knowledge/semantic-investigation.js';
import {casePin} from '../../../packages/sutra-knowledge/pinned-investigation.js';
import {sealInvestigationVersion,replayInvestigationVersion,compareInvestigationVersions} from '../../../packages/sutra-knowledge/investigation-revision.js';
const by=id=>document.getElementById('review-'+id);
let sources=[],bindings=[],sealed=null,current=null,busy=false,epoch=0,stagedProposals=[],batchCurrent=null;
let semanticCurrent=null,baseline=null,impactCurrent=null,annotations=new Map();
const controls=['question','source-id','lineage','source-text','source-add','source-pick','select-text','binding-id','kind','unit','scope','dim-l','dim-m','dim-t','binding-add','seal','left','right','op','generate','proposal','run','export','export-pin','reset','batch-add','batch-run','batch-export','batch-clear'];
function status(state,message){by('status').dataset.state=state;by('status').textContent=message;}
function control(){
 for(const id of controls)by(id).disabled=busy;
 if(!busy){by('binding-add').disabled=!sources.length;for(const id of ['left','right','op','generate'])by(id).disabled=!sealed||bindings.length<2;by('proposal').disabled=!sealed;by('run').disabled=!sealed||!by('proposal').value;by('export').disabled=!current;by('export-pin').disabled=!current;by('batch-add').disabled=!sealed||!by('proposal').value||stagedProposals.length>=8;by('batch-run').disabled=!sealed||stagedProposals.length<2;by('batch-clear').disabled=!stagedProposals.length;by('batch-export').disabled=!batchCurrent;}
 semanticControl();
}
function invalidate(message){epoch++;sealed=null;current=null;clearBatch();by('pin').textContent='No current contract.';by('contract').textContent='';by('proposal').value='';by('result').textContent='';by('snapshot-pin').textContent='';status('draft',message);control();}
function draft(s=sources,b=bindings){return JSON.stringify({version:1,question:by('question').value,sources:s,bindings:b});}
function options(element,items){element.replaceChildren();for(const id of items){const o=document.createElement('option');o.value=id;o.textContent=id;element.append(o);}}
function refresh(){
 options(by('source-pick'),sources.map(s=>s.id));by('select-text').value=sources[0]?.text??'';
 options(by('left'),bindings.map(b=>b.id));options(by('right'),bindings.map(b=>b.id));if(bindings.length>1)by('right').selectedIndex=1;
 by('staged').textContent=sources.length+' staged source(s) · '+bindings.length+' reviewed binding(s)';
 by('binding-list').replaceChildren();
 for(const b of bindings){const s=sources.find(s=>s.id===b.sourceId),p=document.createElement('p');p.textContent=b.id+' = '+s.text.slice(b.start,b.end)+' · '+b.type.kind+' / '+b.type.unit+' · scope '+b.type.scope+' · L/M/T '+b.type.dimension.join(', ');by('binding-list').append(p);}
}
async function work(fn){
 if(busy)return;busy=true;const ticket=epoch;control();
 try{await fn(ticket);}catch(e){if(ticket===epoch)status('refused','REFUSED: '+(typeof e?.message==='string'&&/^(DRAFT|COMPILER|SEMANTIC|REVISION|CASE)_[A-Z_]+$/.test(e.message)?e.message:'invalid input or resource limit')+'.');}
 finally{busy=false;control();}
}
by('question').addEventListener('input',()=>invalidate('Question changed. Re-seal before evaluating a proposal.'));
by('source-add').onclick=()=>work(async ticket=>{
 const next=[...sources,{id:by('source-id').value,lineage:by('lineage').value,text:by('source-text').value}];
 await sealReviewedDraft(draft(next));if(ticket!==epoch)return;sources=next;
 invalidate('Source staged with exact textarea text; no source truth established.');refresh();by('source-pick').value=next.at(-1).id;by('select-text').value=next.at(-1).text;
 for(const id of ['source-id','lineage','source-text'])by(id).value='';
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
function renderBatch(){
 by('batch-count').textContent=stagedProposals.length+' / 8 staged proposals';
 by('batch-list').replaceChildren();
 for(const p of stagedProposals){const row=document.createElement('p');row.textContent=p.id+' · '+new TextEncoder().encode(p.proposalText).length+' bytes (untrusted)';by('batch-list').append(row);}
 renderSemanticRows();
}
function clearBatch(){stagedProposals=[];batchCurrent=null;annotations=new Map();invalidateSemantic();by('batch-result').textContent='';renderBatch();}
by('batch-add').onclick=()=>{
 if(busy||!sealed||!by('proposal').value||stagedProposals.length>=8)return;
 const p={id:'proposal_'+(stagedProposals.length+1),proposalText:by('proposal').value};
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
function invalidateSemantic(){
 semanticCurrent=null;impactCurrent=null;by('roundtrip-result').textContent='';by('semantic-pin').textContent='No version evaluated.';by('semantic-result').textContent='';by('impact-result').textContent='';
}
function semanticControl(){
 for(const e of by('semantic-list').querySelectorAll('input,select'))e.disabled=busy;
 const ready=!!sealed&&stagedProposals.length>=2&&stagedProposals.every(p=>annotations.get(p.id)?.meaning.trim());
 by('semantic-run').disabled=busy||!ready;
 for(const id of ['semantic-export','semantic-export-pin','semantic-retain','roundtrip-run'])by(id).disabled=busy||!semanticCurrent;
 by('baseline-file').disabled=busy;by('baseline-pin').disabled=busy;by('baseline-import').disabled=busy;
 by('baseline-clear').disabled=busy||!baseline;by('impact-export').disabled=busy||!impactCurrent;
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
  const change=()=>{epoch++;a.meaning=input.value;a.binding=select.value;annotations.set(p.id,a);invalidateSemantic();semanticControl();};
  input.addEventListener('input',change);select.addEventListener('change',change);
  const row=document.createElement('div');row.append(label,input,bindingLabel,select);
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Review additional qualifiers (optional)';details.append(summary);
  for(const facet of FACETS.filter(k=>k!=='definition')){
   const field=document.createElement('div');field.className='pinned-fields';
   const label=document.createElement('label'),input=document.createElement('input'),refLabel=document.createElement('label'),ref=document.createElement('select');
   input.id='review-facet-'+p.id+'-'+facet;input.maxLength=1024;input.autocomplete='off';label.htmlFor=input.id;label.textContent=facet;
   ref.id=input.id+'-binding';refLabel.htmlFor=ref.id;refLabel.textContent='Optional quantity reference';
   const empty=document.createElement('option');empty.value='';empty.textContent='No reference declared';ref.append(empty);
   for(const binding of bindings){const o=document.createElement('option');o.value=binding.id;o.textContent=binding.id;ref.append(o);}
   const stored=a.facets[facet]??{statement:'',binding:''};input.value=stored.statement;ref.value=stored.binding;
   const changed=()=>{epoch++;a.facets[facet]={statement:input.value,binding:ref.value};annotations.set(p.id,a);invalidateSemantic();semanticControl();};
   input.addEventListener('input',changed);ref.addEventListener('change',changed);field.append(label,input,refLabel,ref);details.append(field);
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
function baselineState(){by('baseline-state').textContent=baseline?'Retained baseline '+baseline.digest+' · '+baseline.report.investigation.originalQuestion.text:'No baseline retained.';}
by('semantic-run').onclick=()=>work(async ticket=>{
 if(!sealed||stagedProposals.length<2)return;
 invalidateSemantic();semanticControl();
 const batchText=JSON.stringify({version:1,contractDigest:sealed.pin,proposals:stagedProposals});
 const candidates=stagedProposals.map(p=>{
  const a=annotations.get(p.id);if(!a?.meaning.trim())throw Error('SEMANTIC_MEANING_REQUIRED');
  const facets=Object.fromEntries(FACETS.map(k=>[k,null]));
  facets.definition={statement:a.meaning,references:a.binding?[{kind:'binding',id:a.binding}]:[]};
  for(const k of FACETS.filter(k=>k!=='definition')){const f=a.facets[k];if(f?.statement.trim())facets[k]={statement:f.statement,references:f.binding?[{kind:'binding',id:f.binding}]:[]};else if(f?.binding)throw Error('SEMANTIC_FACET_STATEMENT_REQUIRED');}
  return {id:p.id,meaning:a.meaning,facets};
 });
 const annotationText=JSON.stringify({version:1,contractDigest:sealed.pin,batchDigest:await casePin(batchText),candidates});
 const prior=baseline;
 const version=await sealInvestigationVersion({previousDigest:prior?.digest??null,contractText:sealed.contractText,contractPin:sealed.pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
 if(ticket!==epoch)return;
 const impact=prior?await compareInvestigationVersions(prior.versionText,prior.digest,version.versionText,version.digest):null;
 if(ticket!==epoch)return;
 semanticCurrent=version;impactCurrent=impact;
 by('semantic-pin').textContent=version.digest;by('semantic-result').textContent=semanticText(version);
 if(impact)by('impact-result').textContent=impactText(impact);
 status('semantic_ready',impact?'Version replayed and compared with retained baseline. Conditional outcomes and unresolved meaning remain separate.':'Version sealed. Retain its digest separately; no interpretation or source truth established.');
});
by('roundtrip-run').onclick=()=>work(async ticket=>{
 if(!semanticCurrent)return;
 const current=semanticCurrent;by('roundtrip-result').textContent='';
 const report=await renderInvestigationRoundtrip(current.versionText,current.digest);
 if(ticket!==epoch||current!==semanticCurrent)return;
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
by('semantic-export').onclick=()=>{if(semanticCurrent&&!busy)download(semanticCurrent.versionText,'sutra-investigation-version.json','application/json');};
by('semantic-export-pin').onclick=()=>{if(semanticCurrent&&!busy)download(semanticCurrent.digest+'\n','sutra-investigation-version.sha256','text/plain');};
by('semantic-retain').onclick=()=>{if(!semanticCurrent||busy)return;baseline=semanticCurrent;impactCurrent=null;by('impact-result').textContent='';baselineState();semanticControl();status('semantic_ready','Current version retained as baseline in this tab. Export the exact version and digest to keep it across sessions.');};
by('baseline-clear').onclick=()=>{if(busy)return;baseline=null;impactCurrent=null;by('impact-result').textContent='';baselineState();semanticControl();};
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
by('impact-export').onclick=()=>{if(impactCurrent&&semanticCurrent&&baseline&&!busy)download(JSON.stringify({beforeVersion:baseline.versionText,beforeDigest:baseline.digest,afterVersion:semanticCurrent.versionText,afterDigest:semanticCurrent.digest,impact:impactCurrent}),'sutra-investigation-impact.json','application/json');};
renderBatch();refresh();baselineState();control();
