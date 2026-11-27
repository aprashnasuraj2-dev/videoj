import {updateOrbit} from './orbit.js';
// Master investigation view. The reviewed workspace owns every mutation and result.
import './master.css';
const el=id=>document.getElementById(id);
const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const human=s=>String(s??'Unknown').replaceAll('_',' ').toLowerCase();
const states={NO_CURRENT_RESULT:'Not evaluated',DIVERGENT_CONDITIONAL_OUTCOMES:'Competing conclusions',AGREEMENT_ON_SUPPLIED_CONDITIONAL_OUTCOMES:'Conditional agreement'};
const names={question:'Question',declared_lineage:'Declared lineage',evidence:'Evidence',reviewed_quantity:'Reviewed quantity',candidate_interpretation:'Interpretation'};
let shell,view='investigation',selection=null,lastKey='',latest;
const targets={
 question:['review-question','Edit question'],evidence:['review-source-id','Add evidence'],quantity:['review-select-text','Review quantities'],
 meanings:['review-semantic-list','Review interpretations'],evaluate:['review-semantic-run','Evaluate meanings'],
 withdraw:['review-source-withdraw-preview','Preview withdrawal'],revision:['review-transaction-panel','Revise evidence'],
 uncertainty:['review-interval-panel','Test uncertainty'],worlds:['review-world-panel','Test hypothetical values'],
 clarification:['review-clarification-panel','What would distinguish interpretations?'],exposure:['review-exposure-panel','Inspect shared dependencies'],
 baseline:['review-semantic-retain','Retain baseline'],history:['review-history-panel','Manage version history'],compare:['review-branch-panel','Compare branches'],
 recovery:['review-recovery-panel','Recover missing inputs'],roundtrip:['review-roundtrip-run','Inspect computation and meaning'],
 export:['review-semantic-export','Export exact version'],pin:['review-semantic-export-pin','Save separate digest'],
 session:['review-session-checkpoint-panel','Save or restore workspace'],operator:['operator-model-console','Model permissions'],
 models:['agent-studio','Model proposals'],samples:['review-sample-panel','Worked examples'],capsule:['debug-capsule-title','Independent verifier and fixture replay'],
 draft:['review-draft-checkpoint-panel','Save draft'],reuse:['review-reuse-panel','Inspect computation reuse']
};
function go(id){const target=el(id);if(!target)return;for(let p=target;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
 const focus=target.tagName==='DETAILS'?target.querySelector('summary'):target;
 if(!focus.matches('a,button,input,textarea,select,summary,[tabindex]'))focus.tabIndex=-1;
 if(focus.disabled){const parent=focus.closest('details');const summary=parent?.querySelector('summary');summary?.focus({preventScroll:true});}
 else focus.focus({preventScroll:true});
 target.scrollIntoView({block:'start'});}
function action(key){const [id,label]=targets[key];const b=make('button',label,'sm-action');b.type='button';b.addEventListener('click',()=>go(id));return b;}
function run(id){const t=el(id);if(t&&!t.disabled)t.click();}
function button(label,fn,cls='sm-action'){const b=make('button',label,cls);b.type='button';b.addEventListener('click',fn);return b;}
function nav(next){view=next;for(const b of shell.querySelectorAll('[data-sm-view]'))b.setAttribute('aria-pressed',String(b.dataset.smView===view));render(true);}
function initialize(){
 shell=make('section',undefined,'sm-shell');shell.id='sutra-master';shell.setAttribute('aria-labelledby','sm-title');
 shell.innerHTML='<div class="sm-top"><div><p class="sm-kicker">SUTRA / INVESTIGATION SYSTEM</p><h1 id="sm-title">Investigate what survives.</h1><p>Trace a conclusion to its evidence. Challenge its assumptions. Preserve what changes.</p></div><span class="sm-local">Local computation · explicit disclosure</span></div><nav class="sm-nav" aria-label="Investigation views"></nav><div class="sm-grid"><aside class="sm-rail" aria-label="Investigation outline"><h2>Investigation</h2><div id="sm-outline"></div><div id="sm-rail-actions"></div></aside><div class="sm-main"><div id="sm-question"></div><div id="sm-work" aria-label="Selected investigation view"></div></div><aside class="sm-inspector" aria-labelledby="sm-inspect-title"><h2 id="sm-inspect-title">Inspector</h2><div id="sm-inspect"></div></aside></div><p id="sm-status" class="sm-status" role="status" aria-live="polite"></p>';
 const main=document.querySelector('main');main.prepend(shell); const legacyTitle=main.querySelector('.intro h1');if(legacyTitle){const heading=make('h2',legacyTitle.textContent);legacyTitle.replaceWith(heading);}
 const workspace=el('reviewed-workspace');shell.after(workspace);
 const legacy=make('h2','Worked laboratories & advanced tools','sm-lab-heading');workspace.after(legacy);
 for(const [id,label] of [['investigation','Investigation'],['evidence','Evidence'],['challenge','Challenge'],['history','History'],['verify','Verify']]){
  const b=button(label,()=>nav(id),'sm-nav-button');b.dataset.smView=id;b.setAttribute('aria-pressed',String(id===view));shell.querySelector('.sm-nav').append(b);
 }
 // A scoped command list is intentionally not a global single-letter shortcut.
 const cmd=button('Go to a tool',()=>{const d=el('sm-commands');d.open=!d.open;if(d.open)d.querySelector('select').focus();},'sm-action');
 const details=make('details');details.id='sm-commands';const summary=make('summary','Workspace tools');details.append(summary);
 const label=make('label','Choose an existing tool');label.htmlFor='sm-command-select';const select=make('select');select.id='sm-command-select';
 for(const [key,[,name]] of Object.entries(targets)){const o=make('option',name);o.value=key;select.append(o);}
 details.append(label,select,button('Open tool',()=>go(targets[select.value][0])));el('sm-rail-actions').append(cmd,details,action('session'),action('operator'));
}
function draftGraph(s){
 const nodes=[{id:'source:question',kind:'question',identity:s.question}],edges=[];
 for(const x of s.sources){const root='lineage:'+x.lineage;if(!nodes.some(n=>n.id===root))nodes.push({id:root,kind:'declared_lineage',identity:x.lineage});nodes.push({id:'source:'+x.id,kind:'evidence',identity:x.id});edges.push({dependent:'source:'+x.id,dependency:root,relation:'declared_ancestry',authority:'HOST_DECLARATION'});}
 for(const b of s.bindings){const x=s.sources.find(x=>x.id===b.sourceId);nodes.push({id:'binding:'+b.id,kind:'reviewed_quantity',identity:(x?.text??s.question).slice(b.start,b.end)});edges.push({dependent:'binding:'+b.id,dependency:'source:'+b.sourceId,relation:'selected_source_span',authority:'DRAFT_DECLARATION'});}
 return {nodes,edges,qualification:'Draft selections and declared ancestry only. Evaluate meanings to obtain compiler-admitted dependencies.'};
}
function graph(){return latest.current?.report.graph??draftGraph(latest);}
function traverse(g,id,reverse){const seen=new Set([id]),queue=[id];while(queue.length){const x=queue.pop();for(const e of g.edges){const from=reverse?e.dependency:e.dependent,to=reverse?e.dependent:e.dependency;if(from===x&&!seen.has(to)){seen.add(to);queue.push(to);}}}seen.delete(id);return seen;}
const shortId=id=>id.slice(id.indexOf(':')+1);
function nodeLabel(n){return n.kind==='question'?'Original question':shortId(n.id);}
function highlight(id){
 selection=id;
 const g=graph(),up=id?traverse(g,id,false):new Set(),down=id?traverse(g,id,true):new Set();
 for(const b of shell.querySelectorAll('[data-sm-node]')){const k=b.dataset.smNode;b.setAttribute('aria-pressed',String(k===id));b.dataset.relation=k===id?'selected':up.has(k)?'upstream':down.has(k)?'downstream':'unrelated';const mark=b.querySelector('small');mark.textContent=k===id?'Selected':up.has(k)?'Dependency':down.has(k)?'Affected':' '; }
 inspect();
}
function inspect(){
 const box=el('sm-inspect');box.replaceChildren();const g=graph(),n=g.nodes.find(n=>n.id===selection);
 if(!n){box.append(make('p','Select a source, quantity or interpretation to trace its upstream dependencies and downstream relationships.'),make('p','A declared lineage is not proof of independent observation. A dependency is not proof of truth.','sm-note'));return;}
 box.append(make('p',names[n.kind]??human(n.kind),'sm-kicker'),make('h3',nodeLabel(n)));
 const source=latest.sources.find(s=>'source:'+s.id===n.id),binding=latest.bindings.find(b=>'binding:'+b.id===n.id),candidate=latest.current?.report.investigation.candidates.find(c=>'candidate:'+c.id===n.id);
 if(source){box.append(make('p','Declared lineage: '+source.lineage),make('pre',source.text,'sm-source-text'));
  if(latest.current)box.append(make('p','Exact source digest: '+n.identity,'sm-note'));
  box.append(button('Inspect source or preview withdrawal',()=>{const pick=el('review-source-revise-pick');if(pick&&!pick.disabled&&Array.from(pick.options).some(o=>o.value===source.id)){pick.value=source.id;pick.dispatchEvent(new Event('change',{bubbles:true}));}go('review-source-revise-panel');}));
 }else if(binding){box.append(make('p','Source: '+binding.sourceId),make('p','Selected token: '+n.identity),make('p','Declared type: '+binding.type.kind+' · '+binding.type.unit+' · '+binding.type.scope));}
 else if(candidate){box.append(make('p',candidate.meaning),make('p','Computation: '+human(candidate.computation?.status??candidate.reason??'REFUSED')),make('p','Meaning unverified · '+human(candidate.questionCoverage),'sm-note'));}
 else if(n.kind==='question')box.append(make('p',latest.question||'No question entered.'));
 else box.append(make('p','Declared identity: '+n.identity));
 const direct=g.edges.filter(e=>e.dependent===n.id||e.dependency===n.id);
 box.append(make('h4','Direct relationships'));
 if(!direct.length)box.append(make('p','No recorded direct relationship.'));
 for(const e of direct){const other=e.dependent===n.id?e.dependency:e.dependent;const item=button((e.dependent===n.id?'Depends on ':'Affects ')+shortId(other),()=>{highlight(other);const match=Array.from(shell.querySelectorAll('[data-sm-node]')).find(b=>b.dataset.smNode===other);if(match)match.focus({preventScroll:true});else{const heading=el('sm-inspect-title');heading.tabIndex=-1;heading.focus({preventScroll:true});}},'sm-edge');box.append(item,make('small',human(e.relation)+' · '+human(e.authority),'sm-note'));}
 box.append(make('p',g.qualification,'sm-note'),button('Clear selection',()=>highlight(null)));
}
function graphView(box){
 const g=graph();box.append(make('h3','Evidence → quantities → interpretations'),make('p',g.qualification,'sm-note'));
 const groups=[['question','declared_lineage','evidence'],['reviewed_quantity'],['candidate_interpretation']];
 const grid=make('div',undefined,'sm-graph');grid.setAttribute('aria-label','Recorded dependency nodes');
 for(let i=0;i<groups.length;i++){const col=make('div',undefined,'sm-graph-col');col.append(make('h4',['Question & evidence','Reviewed quantities','Evaluated interpretations'][i]));
  const nodes=g.nodes.filter(n=>groups[i].includes(n.kind));if(!nodes.length)col.append(make('p','None recorded','sm-note'));
  for(const n of nodes){const b=button('',()=>highlight(n.id),'sm-node');b.dataset.smNode=n.id;b.setAttribute('aria-pressed','false');b.append(make('span',names[n.kind]??human(n.kind),'sm-note'),make('strong',nodeLabel(n)),make('small',' '));if(n.kind==='reviewed_quantity')b.append(make('span',n.identity,'sm-note'));col.append(b);}
  grid.append(col);
 }
 box.append(grid);if(selection&&!g.nodes.some(n=>n.id===selection))selection=null;highlight(selection);
}
function actions(box,...keys){const row=make('div',undefined,'sm-actions');for(const key of keys)row.append(action(key));box.append(row);}
function result(box){
 const s=latest,i=s.current?.report.investigation,triage=i?.triage.state??'NO_CURRENT_RESULT';
 const card=make('section',undefined,'sm-result');card.dataset.state=triage;card.append(make('p','CURRENT CONDITIONAL RESULT','sm-kicker'),make('h2',states[triage]??human(triage)));
 if(s.busy)card.append(make('p','An investigation operation is running. Existing controls enforce the operation boundary.'));
 if(!i)card.append(make('p',s.baseline?'A baseline is retained, but the editable draft has no evaluated current version. Do not use the historical conclusion as current.':'Review source quantities and evaluate competing interpretations to establish a conditional result.'));
 else{for(const c of i.candidates){const row=make('div',undefined,'sm-candidate');row.append(make('strong',c.meaning),make('span',human(c.computation?.status??c.reason??'REFUSED')),make('small','Proposed meaning · '+human(c.questionCoverage)));card.append(row);}
 card.append(make('p',i.qualification,'sm-note'));}
 if(!i&&s.singleResult){card.append(make('h3','Single proposed computation'),make('pre',s.singleResult,'sm-preview'),make('p','This is not an evaluated comparison of competing meanings.','sm-note'));}
 box.append(card);
 const controls=make('div',undefined,'sm-actions');const next=button('Continue: '+el('review-studio-next').textContent,()=>run('review-studio-next'));next.disabled=s.busy;controls.append(next);
 const evaluate=button('Evaluate current candidates',()=>run('review-semantic-run'),'sm-primary');evaluate.disabled=el('review-semantic-run').disabled;controls.append(evaluate);box.append(controls);
 actions(box,'meanings','evaluate');
}
function withdrawal(box){
 const s=latest,area=make('section',undefined,'sm-withdraw');
 area.append(make('h3','Preview an evidence withdrawal'),make('p','Inspect the exact consequence before choosing whether to apply it. Historical versions are retained.','sm-note'));
 if(!s.sources.length){area.append(make('p','Stage a source first.'));box.append(area);return;}
 const label=make('label','Source to challenge');label.htmlFor='sm-withdraw-source';
 const picker=make('select');picker.id='sm-withdraw-source';picker.disabled=s.busy;
 const original=el('review-source-revise-pick');
 for(const source of s.sources){const o=make('option',source.id+' · lineage '+source.lineage);o.value=source.id;picker.append(o);}
 if(s.sources.some(x=>x.id===original.value))picker.value=original.value;
 const selectSource=()=>{if(original.value!==picker.value){original.value=picker.value;original.dispatchEvent(new Event('change',{bubbles:true}));}};
 picker.addEventListener('change',selectSource);area.append(label,picker);
 const draftButton=button('Preview draft withdrawal',()=>{selectSource();run('review-source-withdraw-preview');});draftButton.disabled=s.busy;
 const versionButton=button('Preview versioned withdrawal',()=>{selectSource();run('review-source-withdraw-version-preview');});versionButton.disabled=s.busy||!s.baseline;
 const row=make('div',undefined,'sm-actions');row.append(draftButton,versionButton);area.append(row);
 if(!s.baseline)area.append(make('p','Retain an evaluated baseline to preview candidate-level revision consequences.','sm-note'));
 if(s.withdrawal&&s.withdrawal.sourceId===picker.value){
  const versioned=s.withdrawal.versioned;area.append(make('h4','Read-only preview · '+picker.value),make('pre',el(versioned?'review-source-withdraw-version-result':'review-source-withdraw-summary').textContent,'sm-preview'));
  const apply=button(versioned?'Confirm withdrawal and replay child':'Confirm draft withdrawal',()=>run(versioned?'review-source-withdraw-version-apply':'review-source-withdraw-apply'),'sm-primary');apply.disabled=s.busy;area.append(apply);
 }
 box.append(area);
}
function challenge(box){
 box.append(make('h2','What would change this conclusion?'),make('p','Each action opens the existing controlled operation. Hypothetical results do not change admitted evidence; revisions require explicit confirmation.'));
 withdrawal(box);
 const items=[['withdraw','Withdraw a source','Preview missing inputs and consequences before applying.'],['revision','Correct or replace evidence','Queue exact source revisions against a retained baseline.'],['uncertainty','Change numerical assumptions','Enclose admitted computations over declared ranges.'],['worlds','Test joint assumptions','Evaluate finite hypothetical combinations.'],['clarification','Challenge meaning','Identify distinctions that separate competing interpretations.'],['exposure','Trace dependency overlap','Inspect shared evidence cohorts, not a claim of independence.']];
 for(const [key,title,desc] of items){const row=make('div',undefined,'sm-task');row.append(make('h3',title),make('p',desc),action(key));box.append(row);}
 const impact=el('review-impact-result').textContent.trim();box.append(make('h3','Revision impact'),make('pre',impact||'No current revision comparison. Retain an evaluated baseline, then evaluate a child.','sm-note'));actions(box,'baseline','reuse','recovery');
}
function history(box){
 box.append(make('h2','Knowledge has a history'),make('p',latest.baseline?'A comparison baseline is retained.':'No comparison baseline retained.'));actions(box,'baseline','history','compare','recovery');
 const h=latest.history?.view;if(!h){box.append(make('p','No history retained. Evaluate a root version and start a history explicitly.'));return;}
 for(const v of h.versions){const row=make('div',undefined,'sm-version');const branches=h.branches.filter(b=>b.head===v.digest).map(b=>b.name);row.append(make('strong',human(v.triage)),make('span',v.digest.slice(7,19)+' · parent '+(v.parent?.slice(7,19)??'root')),make('small',(latest.current?.digest===v.digest?'Current evaluated version · ':'Historical version · ')+(branches.join(', ')||'No branch head')));
 row.append(button('Select historical version',()=>{const select=el('review-history-version');if(Array.from(select.options).some(o=>o.value===v.digest)){select.value=v.digest;select.dispatchEvent(new Event('change',{bubbles:true}));go('review-history-version');}}));box.append(row);}
 box.append(make('p',h.qualification,'sm-note'));
}
function verify(box){
 const i=latest.current?.report.investigation;box.append(make('h2','Verification is not truth'),make('p','Each dimension has its own status. No model or matching hash establishes empirical truth.'));
 if(i){for(const [key,value] of Object.entries(i.verification)){const row=make('div',undefined,'sm-verification');row.append(make('strong',key.replace(/([A-Z])/g,' $1')),make('span',human(value)));box.append(row);}
 box.append(make('p','Exact current version digest: '+latest.current.digest,'sm-note'));}
 else box.append(make('p','No evaluated current version. Source authenticity, meaning and applicability are not established.'));
 actions(box,'roundtrip','export','pin','session','capsule');
 box.append(make('p','Exports can include full source text. Retain digests separately. Independent replay has to be performed by a verifier; export alone does not establish it.','sm-note'));
}
function render(force=false){
 if(!latest)return;const s=latest;
 const key=JSON.stringify([view,s.question,s.sources,s.bindings,s.proposalCount,s.busy,s.current?.digest,s.baseline?.digest,s.history?.digest,s.status,s.next,s.singleResult,s.withdrawal,el('review-source-revise-pick').value,el('review-source-withdraw-summary').textContent,el('review-source-withdraw-version-result').textContent,el('review-semantic-run').disabled,el('review-impact-result').textContent]);
 if(!force&&key===lastKey)return;lastKey=key;
 const active=document.activeElement,activeNode=active?.dataset.smNode,activeId=shell.contains(active)?active?.id:null,activeText=shell.contains(active)&&active?.tagName==='BUTTON'?active.textContent:null;
 const q=el('sm-question');q.replaceChildren(make('p','INVESTIGATION QUESTION','sm-kicker'),make('h2',s.question||'What are you trying to determine?'),action('question'));
 const outline=el('sm-outline');outline.replaceChildren();for(const [name,count] of [['Evidence',s.sources.length],['Reviewed quantities',s.bindings.length],['Candidate proposals',s.proposalCount]]){const r=make('div',undefined,'sm-count');r.append(make('span',name),make('strong',String(count)));outline.append(r);}
 outline.append(make('p',s.baseline?'Baseline retained':'No baseline retained','sm-note'));
 const work=el('sm-work');work.replaceChildren();
 if(view==='investigation'){result(work);if(!s.question&&!s.sources.length){const starter=make('section',undefined,'sm-starter');starter.append(make('h3','Start with a worked investigation'),make('p','Synthetic examples load reviewed inputs and competing proposals; you still choose when to evaluate.'));for(const [id,label] of [['finance','Finance'],['engineering','Network engineering'],['statistics','Statistics'],['two-groups','Two-group comparison']]){const b=button(label,()=>run('review-sample-'+id));b.disabled=s.busy;starter.append(b);}work.append(starter);}actions(work,'evidence','quantity');graphView(work);}
 else if(view==='evidence'){work.append(make('h2','Evidence and lineage'));actions(work,'evidence','quantity','withdraw');graphView(work);}
 else if(view==='challenge')challenge(work);
 else if(view==='history')history(work);
 else verify(work);
 if(view!=='evidence'&&view!=='investigation')inspect();
 el('sm-status').textContent=s.status||'No operation performed.';
 if(activeNode){const b=Array.from(shell.querySelectorAll('[data-sm-node]')).find(x=>x.dataset.smNode===activeNode);b?.focus({preventScroll:true});}else if(activeId&&!active.isConnected&&el(activeId)){el(activeId).focus({preventScroll:true});}else if(activeText&&!active.isConnected){const b=Array.from(shell.querySelectorAll('button:not(:disabled)')).find(x=>x.textContent===activeText);if(b)b.focus({preventScroll:true});else{const navButton=shell.querySelector('[data-sm-view][aria-pressed=true]');navButton?.focus({preventScroll:true});}}
}
export function updateMaster(state){latest=state;if(!shell)initialize();render();updateOrbit(state);}
