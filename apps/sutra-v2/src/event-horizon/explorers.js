import {quantityUnits,convertQuantity} from './local-computation.js';
import {knowledgeProjection,knowledgeRelations,declaredLineageGroups} from './knowledge-model.js';
const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const human=s=>String(s??'Unknown').replaceAll('_',' ').toLowerCase();
function button(text,fn){const b=E('button',text);b.type='button';b.addEventListener('click',fn);return b;}
function field(name,control){const l=E('label',name,'eh-field');l.append(control);return l;}
function pairs(data){const dl=E('dl',undefined,'eh-details');for(const [k,v] of data)if(v!==null&&v!==undefined&&v!=='')dl.append(E('dt',k),E('dd',String(v)));return dl;}
function options(select,values){select.replaceChildren();for(const value of values){const o=E('option',value);o.value=value;select.append(o);}}
export function mountComputationView(root,{onStart,onEnd}){
 const section=E('section',undefined,'eh-compute');section.id='eh-compute';
 section.append(E('p','DETERMINISTIC / ZERO AI AGENTS','eh-kicker'),E('h2','Direct computation'),E('p','Exact quantity conversion through the existing kernel. No language model, network or agent is required. Quantity kind remains explicit.','eh-copy'));
 const kind=E('select'),value=E('input'),from=E('select'),to=E('select');
 options(kind,Object.keys(quantityUnits));value.type='text';value.inputMode='decimal';value.maxLength=50;value.value='1000';
 options(from,quantityUnits.length);options(to,quantityUnits.length);from.value='mm';to.value='m';
 const fields=E('div',undefined,'eh-compute-fields');fields.append(field('Quantity kind',kind),field('Exact value (integer, decimal or fraction)',value),field('From unit',from),field('To unit',to));
 const result=E('div',undefined,'eh-compute-result'),status=E('p','Ready for local computation.','eh-state');status.setAttribute('role','status');status.id='eh-compute-status';
 let current=null,busy=false;
 const run=button('Compute locally',async()=>{
  if(busy)return;
  const input={kind:kind.value,value:value.value.trim(),from:from.value,to:to.value};
  busy=true;current=null;output();status.textContent='Evaluating exact local graph…';sync();
  const operation=onStart('Exact '+input.kind+' conversion');
  try{current=await convertQuantity(input);output();status.textContent='Computed and replayed locally. Zero model or peer calls.';onEnd(operation,'completed');}
  catch{status.textContent='Input or local evaluation refused. No result claimed.';onEnd(operation,'refused');}
  finally{busy=false;sync();}
 });run.id='eh-compute-run';
 const download=button('Download exact graph and report',()=>{
  if(!current||busy)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify({graphText:current.graphText,reportText:current.reportText},null,2)],{type:'application/json'}));
  const a=E('a');a.href=url;a.download='sutra-local-conversion-proof.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });download.id='eh-compute-export';
 const controls=E('div',undefined,'eh-actions');controls.append(run,download);section.append(fields,controls,status,result);root.append(section);
 function sync(){for(const c of [kind,value,from,to,run])c.disabled=busy;download.disabled=busy||!current;}
 function output(){
  result.replaceChildren();if(!current)return;
  const display=E('strong',current.value+' '+current.unit,'eh-compute-value');display.id='eh-compute-value';
  const details=E('details',undefined,'eh-timeline');details.append(E('summary','Exact conditional computation receipt'),E('pre',JSON.stringify(current.receipt,null,2),'eh-quote'));
  result.append(display,E('p',current.qualification,'eh-copy'),E('small','Graph digest: '+current.digest,'eh-copy'),details);
 }
 function invalidate(){if(busy)return;current=null;output();status.textContent='Inputs changed. Compute a new result.';sync();}
 kind.addEventListener('change',()=>{options(from,quantityUnits[kind.value]);options(to,quantityUnits[kind.value]);invalidate();});
 for(const c of [from,to])c.addEventListener('change',invalidate);value.addEventListener('input',invalidate);
 sync();return section;
}
export function mountKnowledgeView(root,{openTool}){
 const section=E('section',undefined,'eh-knowledge');section.id='eh-knowledge';
 section.append(E('p','EVIDENCE / MEANING / DEPENDENCIES','eh-kicker'),E('h2','Knowledge under inspection'),E('p','Trace a conclusion to exact recorded evidence. Changes remain in the reviewed workspace until explicitly applied.','eh-copy'));
 const band=E('div',undefined,'eh-knowledge-band'),question=E('strong'),version=E('small'),triage=E('p',undefined,'eh-state');band.append(question,triage,version);
 const actions=E('div',undefined,'eh-actions');actions.append(button('Open reviewed investigation',()=>openTool('review-question')),button('Inspect revision tools',()=>openTool('review-transaction-panel')),button('Open proof export',()=>openTool('review-semantic-export')));
 const grid=E('div',undefined,'eh-knowledge-grid'),columns=E('div',undefined,'eh-knowledge-columns'),inspector=E('aside',undefined,'eh-right');inspector.setAttribute('aria-label','Evidence inspector');grid.append(columns,inspector);
 const lineages=E('details',undefined,'eh-timeline'),lineageList=E('div');lineages.append(E('summary','Declared source lineages'),lineageList);
 const qualification=E('p',undefined,'eh-copy');
 section.append(band,actions,grid,lineages,qualification);root.append(section);
 let current=null,model=null,selected=null,active=false,dirty=true;
 const categories=[['Question and sources',['question','declared_lineage','evidence']],['Reviewed quantities',['reviewed_quantity']],['Interpretations',['candidate_interpretation']]];
 function inspect(){
  inspector.replaceChildren(E('p','SOURCE MICROSCOPE','eh-kicker'));
  const n=model?.nodes.find(n=>n.key===selected);
  if(!n){inspector.append(E('h3','Choose a recorded entity'),E('p','Inspect upstream inputs and downstream dependencies. This does not establish source truth.','eh-copy'));return;}
  inspector.append(E('h3',n.label),E('p',n.description+' · '+human(n.status),'eh-state'));
  if(n.kind==='question')inspector.append(E('p',model.question||'No question selected.'));
  else if(n.source){
   inspector.append(pairs([['Source ID',n.source.id],['Declared lineage',n.source.lineage],['Recorded identity',n.identity],['Independence','Not established']]));
   const quote=E('pre',n.source.text,'eh-quote');quote.tabIndex=0;quote.setAttribute('aria-label','Exact source text');inspector.append(quote);
  }else if(n.binding){
   const b=n.binding;inspector.append(pairs([['Source ID',b.sourceId],['UTF-16 start',b.start],['UTF-16 end',b.end],['Declared kind',b.type?.kind],['Unit',b.type?.unit],['Scope',b.type?.scope],['Dimension',b.type?.dimension?.join(', ')]]));
   inspector.append(b.quote!==null?E('pre',b.quote,'eh-quote'):E('p','Exact source text unavailable.','eh-copy'));
  }else if(n.candidate){
   inspector.append(E('p',n.candidate.meaning),pairs([['Conditional outcome',human(n.candidate.status)],['Admission',human(n.candidate.admission)],['Question coverage',human(n.candidate.coverage)],['Meaning status',human(n.candidate.meaningStatus)]]));
  }else inspector.append(E('p','Recorded identity: '+String(n.identity??'Unknown'),'eh-copy'));
  const rel=knowledgeRelations(model,n.key);
  inspector.append(E('h4','Dependency trace'),E('p',rel.upstream.size+' upstream · '+rel.downstream.size+' downstream','eh-state'));
  if(!rel.direct.length)inspector.append(E('p','No direct recorded relationship.','eh-copy'));
  for(const r of rel.direct){
   const other=model.nodes.find(x=>x.key===(r.from===n.key?r.to:r.from));if(!other)continue;
   inspector.append(button((r.from===n.key?'Affects ':'Depends on ')+other.label,()=>select(other.key,true)),E('small',human(r.kind)+' · '+human(r.authority),'eh-copy'));
  }
  inspector.append(E('p','Recorded dependency is not proof of truth or independence.','eh-copy'));
 }
 function select(key,focus=false){
  if(!model?.nodes.some(n=>n.key===key))return;selected=key;const rel=knowledgeRelations(model,key);
  for(const b of columns.querySelectorAll('[data-knowledge-key]')){
   const id=b.dataset.knowledgeKey;b.setAttribute('aria-pressed',String(id===key));b.dataset.relation=id===key?'selected':rel.upstream.has(id)?'upstream':rel.downstream.has(id)?'downstream':'unrelated';
   b.querySelector('.eh-rel').textContent=id===key?'Selected':rel.upstream.has(id)?'Input':rel.downstream.has(id)?'Affected':'';
  }
  inspect();if(focus)[...columns.querySelectorAll('[data-knowledge-key]')].find(b=>b.dataset.knowledgeKey===key)?.focus({preventScroll:true});
 }
 function render(){
  if(!active||!dirty)return;dirty=false;model=knowledgeProjection(current);
  if(!model){question.textContent='No reviewed investigation';triage.textContent='Not evaluated';version.textContent='No retained version';columns.replaceChildren();lineageList.replaceChildren();inspect();return;}
  const focused=document.activeElement?.dataset?.knowledgeKey;
  question.textContent=model.question||'No question selected';triage.textContent=model.triage?human(model.triage):'Draft · not evaluated';
  version.textContent='Version '+(model.version??'Not retained')+' · baseline '+(model.baseline??'Not retained');qualification.textContent=model.qualification;
  columns.replaceChildren();const known=new Set();
  function group(name,nodes){
   const col=E('section',undefined,'eh-knowledge-col');col.append(E('h3',name));if(!nodes.length)col.append(E('p','None recorded.','eh-copy'));
   for(const n of nodes){known.add(n.key);const b=button('',()=>select(n.key));b.className='eh-knowledge-node';b.dataset.knowledgeKey=n.key;b.setAttribute('aria-pressed','false');b.append(E('small',n.description),E('strong',n.label),E('span',human(n.status)),E('small','','eh-rel'));col.append(b);}columns.append(col);
  }
  for(const [name,kinds] of categories)group(name,model.nodes.filter(n=>kinds.includes(n.kind)));
  const other=model.nodes.filter(n=>!known.has(n.key));if(other.length)group('Other recorded entities',other);
  lineageList.replaceChildren();const cohorts=declaredLineageGroups(model);
  if(!cohorts.length)lineageList.append(E('p','No declared lineages.','eh-copy'));
  for(const g of cohorts)lineageList.append(E('p',g.lineage+' · '+g.sources.join(', ')+' · independence not established','eh-copy'));
  if(selected&&model.nodes.some(n=>n.key===selected))select(selected);else{selected=null;inspect();}
  if(focused)[...columns.querySelectorAll('[data-knowledge-key]')].find(b=>b.dataset.knowledgeKey===focused)?.focus({preventScroll:true});
 }
 return Object.freeze({section,update(state){current=state;dirty=true;render();},setActive(value){active=!!value;render();}});
}
