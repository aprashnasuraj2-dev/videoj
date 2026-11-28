import {createVerifier,replayReport,revisionDependencyClosure} from '../../../../packages/sutra-knowledge/index.js';
import {parseUniqueJson} from '../../../../packages/sutra-consent/strict-json.js';
import {exactMagnitude} from './local-computation.js';

export const PROOF_LIMITS=Object.freeze({nodes:256,graph:65536,report:262144,archive:262144,history:8});
export const arithmetic=Object.freeze(['add','sub','mul','div']);
export const comparisons=Object.freeze(['eq','le','lt','ge','gt']);
const identifier=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const reserved=new Set(['constructor','prototype','__proto__']);
const fail=code=>{throw new Error(code);};
const validId=id=>typeof id==='string'&&identifier.test(id)&&!reserved.has(id);
const frozenCopy=value=>deepFreeze(JSON.parse(JSON.stringify(value)));
function deepFreeze(value){
 if(value&&typeof value==='object'){
  for(const x of Object.values(value))deepFreeze(x);
  Object.freeze(value);
 }
 return value;
}
function exactKeys(value,keys){
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
}
function validDimension(d){
 return Array.isArray(d)&&d.length===3&&d.every(x=>Number.isInteger(x)&&x>=-16&&x<=16&&!Object.is(x,-0));
}
export function graphText(nodes){
 if(!Array.isArray(nodes)||nodes.length<1||nodes.length>PROOF_LIMITS.nodes)fail('GRAPH_NODE_LIMIT');
 const text=JSON.stringify({schemaVersion:1,nodes});
 if(text.length>PROOF_LIMITS.graph)fail('GRAPH_SIZE');
 return text;
}
export function parseGraph(text){
 if(typeof text!=='string'||text.length>PROOF_LIMITS.graph)fail('GRAPH_SIZE');
 const doc=parseUniqueJson(text,{maxChars:PROOF_LIMITS.graph,maxDepth:12});
 if(!exactKeys(doc,['schemaVersion','nodes'])||doc.schemaVersion!==1||!Array.isArray(doc.nodes)||!doc.nodes.length||doc.nodes.length>PROOF_LIMITS.nodes)fail('GRAPH_SHAPE');
 const ids=new Set();
 for(const node of doc.nodes){
  if(!validId(node?.id)||ids.has(node.id))fail('GRAPH_ID');
  ids.add(node.id);
  if(node.kind==='input'){
   if(!exactKeys(node,['id','kind','value','dimension','basis'])||!validDimension(node.dimension)||typeof node.value!=='string'||!/^(-?(?:0|[1-9]\d{0,47}))(?:\/[1-9]\d{0,47})?$/.test(node.value)||node.value.startsWith('-0')||typeof node.basis!=='string'||!node.basis.trim()||node.basis.length>160||/[\u0000-\u001f\u007f]/.test(node.basis)||/[\ud800-\udfff]/u.test(node.basis))fail('INPUT_SHAPE');
  }else if(node.kind==='derive'||node.kind==='constraint'){
   if(!exactKeys(node,['id','kind','op','args'])||!(node.kind==='derive'?arithmetic:comparisons).includes(node.op)||!Array.isArray(node.args)||node.args.length!==2||!node.args.every(validId))fail('OP_SHAPE');
  }else fail('NODE_KIND');
 }
 // The existing canonical admission routine validates dependencies, cycles and depth.
 revisionDependencyClosure(text,text);
 return frozenCopy(doc);
}
export function starterGraph(){
 return frozenCopy([
  {id:'available',kind:'input',value:'120',dimension:[0,0,0],basis:'Declared available capacity'},
  {id:'required',kind:'input',value:'100',dimension:[0,0,0],basis:'Declared required capacity'},
  {id:'margin',kind:'derive',op:'sub',args:['available','required']},
  {id:'sufficient',kind:'constraint',op:'ge',args:['available','required']}
 ]);
}
export function formatDimension(d){
 if(!validDimension(d))return 'Not a quantity';
 if(d.every(n=>!n))return 'Dimensionless';
 return ['m','kg','s'].map((unit,i)=>d[i]===0?'':unit+(d[i]===1?'':'^'+d[i])).filter(Boolean).join(' · ');
}
export function makeInput({id,value,dimension,basis}){
 if(!validId(id)||!validDimension(dimension)||typeof basis!=='string'||!basis.trim()||basis.length>160)fail('INPUT_SHAPE');
 return {id,kind:'input',value:exactMagnitude(value),dimension:[...dimension],basis};
}
export function makeOperation({id,kind,op,left,right}){
 if(!validId(id)||!validId(left)||!validId(right)||!['derive','constraint'].includes(kind)||!(kind==='derive'?arithmetic:comparisons).includes(op))fail('OP_SHAPE');
 return {id,kind,op,args:[left,right]};
}
export function editGraph(nodes,{operation,id,node}){
 const list=JSON.parse(JSON.stringify(nodes));
 const at=list.findIndex(n=>n.id===id);
 if(operation==='append'){
  if(!node||list.some(n=>n.id===node.id))fail('DUPLICATE_ID');
  list.push(node);
 }else if(operation==='replace'){
  if(at<0||!node||node.id!==id)fail('REPLACE_ID');
  list[at]=node;
 }else if(operation==='remove'){
  if(at<0||list.length===1)fail('REMOVE_NODE');
  if(list.some(n=>n.args?.includes(id)))fail('DEPENDENT_NODE');
  list.splice(at,1);
 }else fail('EDIT_OPERATION');
 return parseGraph(graphText(list)).nodes;
}
export function dependencyTrace(nodes,id){
 const byId=new Map(nodes.map(n=>[n.id,n]));
 if(!byId.has(id))return {upstream:[],downstream:[],direct:[]};
 const children=new Map(nodes.map(n=>[n.id,[]]));
 for(const n of nodes)for(const parent of new Set(n.args??[]))children.get(parent)?.push(n.id);
 function walk(start,next){
  const visited=new Set([start]),queue=[start];
  for(let i=0;i<queue.length;i++){
   for(const k of next(queue[i])??[])if(!visited.has(k)){
    visited.add(k);
    queue.push(k);
   }
  }
  return queue.slice(1).sort();
 }
 return {upstream:walk(id,k=>byId.get(k)?.args),downstream:walk(id,k=>children.get(k)),direct:[...new Set(byId.get(id).args??[])]};
}
export function proofProjection(nodes,report){
 const receipts=new Map((report?.receipts??[]).map(r=>[r.id,r]));
 const entities=nodes.map(n=>({
  key:n.id,id:n.id,kind:n.kind==='input'?'evidence':n.kind==='constraint'?'constraint':'task',
  label:n.id,status:receipts.get(n.id)?.outcome?.status??'draft',
  receipt:receipts.get(n.id)??null,definition:n
 }));
 const edges=[];
 for(const n of nodes)for(const dep of new Set(n.args??[]))edges.push({key:dep+'>'+n.id,from:dep,to:n.id,kind:'dependency',authority:'declared proof graph'});
 return {id:report?.graphDigest??'draft',nodes:entities,edges};
}
export function outcomeSummary(report){
 const counts={};
 for(const r of report?.receipts??[]){
  const s=r.outcome.status;
  counts[s]=(counts[s]??0)+1;
 }
 return counts;
}
export function compareProofs(before,after){
 const closure=revisionDependencyClosure(before.graphText,after.graphText);
 const old=new Map(before.report.receipts.map(r=>[r.id,r]));
 const now=new Map(after.report.receipts.map(r=>[r.id,r]));
 const changes=[];
 for(const id of [...new Set([...old.keys(),...now.keys()])].sort()){
  const a=old.get(id),b=now.get(id);
  const relation=!a?'added':!b?'removed':a.receiptDigest===b.receiptDigest?'unchanged':JSON.stringify(a.outcome)===JSON.stringify(b.outcome)?'receipt_changed':'outcome_changed';
  changes.push({id,relation,before:a?.outcome??null,after:b?.outcome??null,affected:closure.affected.includes(id)});
 }
 return frozenCopy({closure,changes});
}
export function createProofSession(initial=starterGraph()){
 let nodes=parseGraph(graphText(initial)).nodes;
 let revision=0;
 let current=null;
 let baseline=null;
 let busy=false;
 let history=[];
 let verifier=createVerifier();
 function snapshot(){
  return Object.freeze({nodes,revision,current,baseline,busy,history:Object.freeze([...history])});
 }
 function replace(next){
  if(busy)fail('PROOF_BUSY');
  nodes=parseGraph(graphText(next)).nodes;
  revision++;
  current=null;
  return snapshot();
 }
 function edit(command){return replace(editGraph(nodes,command));}
 async function evaluate(){
  if(busy)fail('PROOF_BUSY');
  busy=true;
  const ticket=revision,text=graphText(nodes);
  try{
   const result=await verifier.evaluate(text);
   const replayed=await replayReport(text,result.reportText);
   if(!replayed||ticket!==revision)fail('PROOF_REPLAY');
   current=deepFreeze({graphText:text,reportText:result.reportText,report:result.report,stats:result.stats,replayed:true,revision:ticket});
   history=[current,...history.filter(x=>x.report.graphDigest!==current.report.graphDigest)].slice(0,PROOF_LIMITS.history);
   return current;
  }finally{busy=false;}
 }
 function retain(){
  if(busy||!current)fail('NO_CURRENT_PROOF');
  baseline=current;
  return snapshot();
 }
 function clearBaseline(){
  if(busy)fail('PROOF_BUSY');
  baseline=null;
  return snapshot();
 }
 function restore(index){
  if(busy||!Number.isSafeInteger(index)||!history[index])fail('HISTORY_INDEX');
  return replace(parseGraph(history[index].graphText).nodes);
 }
 function diff(){return baseline&&current?compareProofs(baseline,current):null;}
 function reset(){
  if(busy)fail('PROOF_BUSY');
  verifier=createVerifier();
  baseline=null;
  history=[];
  return replace(starterGraph());
 }
 return Object.freeze({snapshot,replace,edit,evaluate,retain,clearBaseline,restore,diff,reset});
}
export function exportProof(record){
 if(!record?.replayed||typeof record.graphText!=='string'||typeof record.reportText!=='string')fail('NO_CURRENT_PROOF');
 const text=JSON.stringify({schema:'sutra-local-proof/v1',graphText:record.graphText,reportText:record.reportText});
 if(text.length>PROOF_LIMITS.archive)fail('ARCHIVE_LIMIT');
 return text;
}
export async function inspectProofArchive(text){
 if(typeof text!=='string'||text.length>PROOF_LIMITS.archive)fail('ARCHIVE_LIMIT');
 const data=parseUniqueJson(text,{maxChars:PROOF_LIMITS.archive,maxDepth:8});
 // Accept the existing Direct compute download as well as this versioned format.
 const versioned=exactKeys(data,['schema','graphText','reportText'])&&data.schema==='sutra-local-proof/v1';
 if(!versioned&&!exactKeys(data,['graphText','reportText']))fail('ARCHIVE_SHAPE');
 if(typeof data.reportText!=='string'||data.reportText.length>PROOF_LIMITS.report)fail('REPORT_LIMIT');
 const graph=parseGraph(data.graphText);
 if(!await replayReport(data.graphText,data.reportText))fail('ARCHIVE_REPLAY_MISMATCH');
 const result=await createVerifier().evaluate(data.graphText);
 return deepFreeze({nodes:graph.nodes,graphText:data.graphText,reportText:result.reportText,report:result.report,replayed:true});
}
