import {sealReviewedDraft,draftComparisonProposal} from '../../../packages/sutra-knowledge/reviewed-draft.js';
import {exportReviewedProposal} from '../../../packages/sutra-knowledge/reviewed-claim-compiler.js';
const by=id=>document.getElementById('review-'+id);
let sources=[],bindings=[],sealed=null,current=null,busy=false,epoch=0;
const controls=['question','source-id','lineage','source-text','source-add','source-pick','select-text','binding-id','kind','unit','scope','dim-l','dim-m','dim-t','binding-add','seal','left','right','op','generate','proposal','run','export','reset'];
function status(state,message){by('status').dataset.state=state;by('status').textContent=message;}
function control(){
 for(const id of controls)by(id).disabled=busy;
 if(!busy){by('binding-add').disabled=!sources.length;for(const id of ['left','right','op','generate'])by(id).disabled=!sealed||bindings.length<2;by('proposal').disabled=!sealed;by('run').disabled=!sealed||!by('proposal').value;by('export').disabled=!current;}
}
function invalidate(message){epoch++;sealed=null;current=null;by('pin').textContent='No current contract.';by('contract').textContent='';by('proposal').value='';by('result').textContent='';status('draft',message);control();}
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
 try{await fn(ticket);}catch(e){if(ticket===epoch)status('refused','REFUSED: '+(typeof e?.message==='string'&&/^(DRAFT|COMPILER)_[A-Z_]+$/.test(e.message)?e.message:'invalid input or resource limit')+'.');}
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
 sealed=result;current=null;by('proposal').value='';by('result').textContent='';by('pin').textContent=result.pin;by('contract').textContent=result.contractText;status('sealed','Reviewed contract sealed. Copy the pin independently if retaining evidence. No proposal evaluated.');
});
by('generate').onclick=()=>work(async ticket=>{
 if(!sealed)return;const p=await draftComparisonProposal(sealed.contractText,sealed.pin,by('left').value,by('right').value,by('op').value);if(ticket!==epoch)return;
 current=null;by('result').textContent='';by('proposal').value=p;status('proposal','User-selected comparison drafted. The proposal is still untrusted and may not answer the question.');
});
by('proposal').addEventListener('input',()=>{epoch++;current=null;by('result').textContent='';status('proposal','Proposal edited. Run again before exporting.');control();});
by('run').onclick=()=>work(async ticket=>{
 if(!sealed)return;current=null;by('result').textContent='';control();
 const bundle=await exportReviewedProposal(sealed.contractText,sealed.pin,by('proposal').value);if(ticket!==epoch)return;
 const bytes=new TextEncoder().encode(JSON.stringify(bundle));if(bytes.length>1048576)throw Error('DRAFT_EXPORT_LIMIT');
 const r=bundle.result;by('result').textContent=r.target.status.replaceAll('_',' ')+' · relevance UNVERIFIED · method UNVERIFIED\n'+r.nodes.map(n=>n.id+' · '+(n.receipt?.outcome.value??n.receipt?.outcome.status??n.status)).join('\n');
 current=bytes;status('ready','Conditional computation available. Export contains the exact pasted source text; review before sharing.');
});
by('export').onclick=()=>{if(!current||busy)return;const url=URL.createObjectURL(new Blob([current],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='sutra-reviewed-workspace.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
by('reset').onclick=()=>{if(busy)return;sources=[];bindings=[];for(const id of ['question','source-id','lineage','source-text','binding-id','kind','unit','scope'])by(id).value='';for(const id of ['dim-l','dim-m','dim-t'])by(id).value='0';invalidate('Draft cleared from this workspace. Previously downloaded files are unaffected.');refresh();};
refresh();control();
