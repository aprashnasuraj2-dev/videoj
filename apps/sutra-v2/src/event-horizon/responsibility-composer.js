import {newAgent,admitDesign} from './network-designer.js';

export const RESPONSIBILITY_LIMITS=Object.freeze({duties:10,label:120,instructions:600,modelCalls:8});
const identifier=/^[A-Za-z][A-Za-z0-9_]{0,49}$/;
const forbidden=new Set(['constructor','prototype','__proto__']);
const fail=code=>{throw Error(code);};
function freeze(value){
 if(value&&typeof value==='object'){
  for(const child of Object.values(value))freeze(child);
  Object.freeze(value);
 }
 return value;
}
function checkedText(value,max){
 if(typeof value!=='string'||!value.trim()||value.length>max||/[\ud800-\udfff]/u.test(value))fail('RESPONSIBILITY_TEXT');
 return value.trim();
}
export function admitResponsibilities(rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>RESPONSIBILITY_LIMITS.duties)fail('RESPONSIBILITY_COUNT');
 const ids=new Set();
 return freeze(rows.map(r=>{
  if(!r||Object.keys(r).length!==3||!['id','label','instructions'].every(k=>Object.hasOwn(r,k))||typeof r.id!=='string'||!identifier.test(r.id)||forbidden.has(r.id)||ids.has(r.id))fail('RESPONSIBILITY_ID');
  ids.add(r.id);
  return {id:r.id,label:checkedText(r.label,RESPONSIBILITY_LIMITS.label),instructions:checkedText(r.instructions,RESPONSIBILITY_LIMITS.instructions)};
 }));
}
function partition(rows,count){
 // Preserve the order explicitly declared by the user; balanced contiguous
 // responsibility groups are a transparent baseline, not an optimality claim.
 const groups=[];
 for(let i=0;i<count;i++){
  const first=Math.floor(i*rows.length/count),end=Math.floor((i+1)*rows.length/count);
  groups.push(rows.slice(first,end));
 }
 return groups;
}
function compileAlternative(rows,count,maxModelCalls){
 const groups=partition(rows,count);
 const assignments=groups.map((group,i)=>({
  definition:group[0].id,
  duties:group.map(r=>r.id),
  entry:i===0
 }));
 const tools=groups.map((group,i)=>{
  const own=group.map(r=>'Responsibility '+r.id+' ('+r.label+'): '+r.instructions).join('\n');
  const integration=i===0&&count>1?
   '\nWhen necessary delegate to the declared specialist definitions. If a required responsibility remains uncovered, say so rather than inventing completion. Integrate actual returned candidate material and retain disagreements.':
   '\nPerform the responsibilities assigned to this definition within the declared request.';
  return newAgent(group[0].id,{
   description:group.map(r=>r.label).join(' / '),
   instructions:'Produce candidate reasoning only. State assumptions, uncertainty and missing evidence. No external retrieval, private context, write actions or factual verification are available.\n'+own+integration,
   steps:i===0?Math.min(8,count):1
  });
 });
 tools[0].tools=tools.slice(1).map(a=>a.name);
 const definition=admitDesign({metadata:{description:'User-declared responsibility composition. Candidate reasoning only; no external capabilities.'},max_steps:8,tools}).definition;
 // With the currently pinned serial runtime, visiting every leaf once
 // requires a child request plus another entry request per delegation.
 // This is a lower bound, not a prediction or promised completion.
 const minimumCalls=2*count-1;
 const fullVisitFeasible=minimumCalls<=maxModelCalls&&count<=8;
 return freeze({
  id:'roles_'+count,definition,assignments,
  definitionCount:count,responsibilityCount:rows.length,
  minFullVisitModelCalls:minimumCalls,maxModelCalls,
  fullVisitFeasible,
  minimumUncoveredDefinitions:Math.max(0,count-Math.floor((maxModelCalls+1)/2)),
  qualification:fullVisitFeasible?
   'The minimum full-visit call count fits the chosen cap. Actual model tool decisions and completeness are not guaranteed.':
   'The current serial call cap or entry step limit cannot visit every definition once. This graph is valid for editing/export, but full activation is not feasible within this budget.'
 });
}
export function composeResponsibilities(rows,{maxModelCalls=4}={}){
 const duties=admitResponsibilities(rows);
 if(!Number.isInteger(maxModelCalls)||maxModelCalls<1||maxModelCalls>RESPONSIBILITY_LIMITS.modelCalls)fail('RESPONSIBILITY_BUDGET');
 return freeze({
  duties,maxModelCalls,
  alternatives:Array.from({length:duties.length},(_,i)=>compileAlternative(duties,i+1,maxModelCalls)),
  qualification:'A structural assignment of explicitly declared duties. No model has been called; separation into definitions does not establish expertise, independence or successful execution.'
 });
}
