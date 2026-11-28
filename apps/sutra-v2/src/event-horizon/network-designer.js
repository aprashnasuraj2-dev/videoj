import {compileNetwork} from '../../../../packages/sutra-runtime/index.js';
import {parseUniqueJson} from '../../../../packages/sutra-runtime/strict-json.js';

export const DESIGN_LIMITS=Object.freeze({agents:32,edgesPerAgent:16,bytes:65536,history:24});
const idPattern=/^[A-Za-z][A-Za-z0-9_]{0,59}$/;
const blocked=new Set(['constructor','prototype','__proto__']);
const validId=value=>typeof value==='string'&&idPattern.test(value)&&!blocked.has(value);
const fail=code=>{throw Error(code);};
const encoder=new TextEncoder();
function freeze(value){
 if(value&&typeof value==='object'){
  for(const child of Object.values(value))freeze(child);
  Object.freeze(value);
 }
 return value;
}
function copy(value){return JSON.parse(JSON.stringify(value));}
function ownShape(value,keys){
 return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
}
export function newAgent(name,{description='A specialist for a declared capability',instructions='Return a bounded candidate, identify uncertainty and avoid unsupported factual claims.',steps=2}={}){
 if(!validId(name)||!Number.isInteger(steps)||steps<1||steps>8||typeof description!=='string'||!description.trim()||description.length>2000||typeof instructions!=='string'||!instructions.trim()||instructions.length>12000)fail('DESIGN_AGENT');
 return {
  name,
  function:{
   description,
   parameters:{
    type:'object',
    properties:{request:{type:'string',minLength:1,maxLength:2000}},
    required:['request'],
    additionalProperties:false
   }
  },
  instructions,
  max_steps:steps,
  tools:[]
 };
}
export function initialNetwork(){
 return freeze({
  metadata:{description:'A local, declarative network. Define capabilities before selecting a model.'},
  max_steps:4,
  tools:[newAgent('specialist')]
 });
}
export function networkText(definition){
 const text=JSON.stringify(definition,null,2);
 if(encoder.encode(text).length>DESIGN_LIMITS.bytes)fail('DESIGN_SIZE');
 return text;
}
export function admitDesign(definition,{name='custom_network',limits={}}={}){
 if(!validId(name))fail('DESIGN_NAME');
 // Closed local-only compiler; arbitrary peer/MCP references cannot pass.
 const frontDescriptor=Object.getOwnPropertyDescriptor(definition??{},'tools');
 const first=Array.isArray(frontDescriptor?.value)?Object.getOwnPropertyDescriptor(frontDescriptor.value,'0')?.value:null;
 const front=Object.getOwnPropertyDescriptor(first??{},'name')?.value;
 if(!validId(front))fail('DESIGN_FRONT');
 const compiled=compileNetwork(definition,{name,frontMan:front,limits});
 const text=networkText(definition);
 const data=parseUniqueJson(text,{maxChars:DESIGN_LIMITS.bytes,maxDepth:32});
 return freeze({definition:data,name,front,limits:compiled.limits,text});
}
export function parseDesign(text,{name='custom_network'}={}){
 if(typeof text!=='string'||encoder.encode(text).length>DESIGN_LIMITS.bytes)fail('DESIGN_SIZE');
 const data=parseUniqueJson(text,{maxChars:DESIGN_LIMITS.bytes,maxDepth:32});
 return admitDesign(data,{name});
}
export function delegationAnalysis(definition){
 const byName=new Map(definition.tools.map(a=>[a.name,a]));
 const incoming=new Map([...byName.keys()].map(id=>[id,[]]));
 const edges=[];
 for(const a of byName.values())for(const ref of a.tools){
  if(typeof ref==='string'&&byName.has(ref)){
   edges.push({from:a.name,to:ref});
   incoming.get(ref).push(a.name);
  }
 }
 const front=definition.tools[0].name;
 const visited=new Set([front]),queue=[front];
 for(let i=0;i<queue.length;i++)for(const id of byName.get(queue[i]).tools){
  if(byName.has(id)&&!visited.has(id)){
   visited.add(id);
   queue.push(id);
  }
 }
 const memo=new Map();
 function depth(id,path=new Set()){
  if(path.has(id))fail('DESIGN_CYCLE');
  if(memo.has(id))return memo.get(id);
  const next=new Set(path);
  next.add(id);
  const d=1+Math.max(0,...byName.get(id).tools.filter(x=>byName.has(x)).map(x=>depth(x,next)));
  memo.set(id,d);
  return d;
 }
 const maxDepth=Math.max(...[...byName.keys()].map(id=>depth(id)));
 const nodes=definition.tools.map(a=>({
  id:a.name,
  reachable:visited.has(a.name),
  incoming:incoming.get(a.name),
  outgoing:a.tools.filter(x=>byName.has(x)),
  depth:depth(a.name),
  steps:a.max_steps??definition.max_steps??8
 }));
 return freeze({
  front,
  nodes,
  edges,
  reachable:queue,
  unreachable:nodes.filter(n=>!n.reachable).map(n=>n.id),
  maxDepth,
  definitionCount:nodes.length,
  edgeCount:edges.length
 });
}
function applyCommand(definition,command){
 const next=copy(definition);
 const find=id=>next.tools.find(a=>a.name===id);
 switch(command.type){
  case 'add':{
   if(next.tools.length>=DESIGN_LIMITS.agents||find(command.name))fail('DESIGN_AGENT_LIMIT_OR_DUPLICATE');
   next.tools.push(newAgent(command.name,command));
   break;
  }
  case 'remove':{
   if(!find(command.name)||next.tools.length===1)fail('DESIGN_REMOVE');
   next.tools=next.tools.filter(a=>a.name!==command.name);
   for(const a of next.tools)a.tools=a.tools.filter(t=>t!==command.name);
   break;
  }
  case 'rename':{
   const a=find(command.name);
   if(!a||!validId(command.nextName)||find(command.nextName))fail('DESIGN_RENAME');
   a.name=command.nextName;
   for(const item of next.tools)item.tools=item.tools.map(t=>t===command.name?command.nextName:t);
   break;
  }
  case 'front':{
   const a=find(command.name);
   if(!a)fail('DESIGN_FRONT');
   next.tools=[a,...next.tools.filter(t=>t!==a)];
   break;
  }
  case 'update':{
   const a=find(command.name);
   if(!a||typeof command.description!=='string'||command.description.length>2000||typeof command.instructions!=='string'||command.instructions.length>12000||!Number.isInteger(command.steps)||command.steps<1||command.steps>8)fail('DESIGN_UPDATE');
   a.function.description=command.description;
   a.instructions=command.instructions;
   a.max_steps=command.steps;
   break;
  }
  case 'connect':{
   const a=find(command.from),b=find(command.to);
   if(!a||!b||a===b||a.tools.includes(b.name)||a.tools.length>=DESIGN_LIMITS.edgesPerAgent)fail('DESIGN_EDGE');
   a.tools.push(b.name);
   break;
  }
  case 'disconnect':{
   const a=find(command.from);
   if(!a||!a.tools.includes(command.to))fail('DESIGN_EDGE');
   a.tools=a.tools.filter(t=>t!==command.to);
   break;
  }
  case 'metadata':{
   if(typeof command.description!=='string'||command.description.length>2000||!Number.isInteger(command.steps)||command.steps<1||command.steps>8)fail('DESIGN_METADATA');
   next.metadata.description=command.description;
   next.max_steps=command.steps;
   break;
  }
  case 'parameters':{
   const a=find(command.name);
   if(!a||typeof command.text!=='string'||command.text.length>16384)fail('DESIGN_PARAMETERS');
   a.function.parameters=parseUniqueJson(command.text,{maxChars:16384,maxDepth:20});
   break;
  }
  default:fail('DESIGN_COMMAND');
 }
 return next;
}
export function createNetworkDesigner(initial=initialNetwork()){
 let current=admitDesign(initial);
 let past=[];
 let future=[];
 let revision=0;
 function snapshot(){
  return Object.freeze({revision,definition:current.definition,name:current.name,front:current.front,limits:current.limits,analysis:delegationAnalysis(current.definition),canUndo:past.length>0,canRedo:future.length>0});
 }
 function replace(definition){
  const admitted=admitDesign(definition,{name:current.name});
  past=[current,...past].slice(0,DESIGN_LIMITS.history);
  current=admitted;
  future=[];
  revision++;
  return snapshot();
 }
 function edit(command){return replace(applyCommand(current.definition,command));}
 function undo(){
  if(!past.length)fail('DESIGN_NO_UNDO');
  future=[current,...future].slice(0,DESIGN_LIMITS.history);
  [current,...past]=past;
  revision++;
  return snapshot();
 }
 function redo(){
  if(!future.length)fail('DESIGN_NO_REDO');
  past=[current,...past].slice(0,DESIGN_LIMITS.history);
  [current,...future]=future;
  revision++;
  return snapshot();
 }
 function reset(){return replace(initialNetwork());}
 async function exportBundle(){
  const record=current;
  const bytes=encoder.encode(record.text);
  const digest='sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  return freeze({text:record.text,digest,front:record.front,name:record.name,definitionCount:record.definition.tools.length,limits:record.limits});
 }
 return Object.freeze({snapshot,replace,edit,undo,redo,reset,exportBundle});
}
export function composeProfile(profile,count){
 if(!Number.isInteger(count)||count<1||count>12||!['single','parallel','hierarchy','challenge'].includes(profile))fail('DESIGN_PROFILE');
 const base=copy(initialNetwork());
 if(profile==='single'){
  if(count!==1)fail('DESIGN_SINGLE_COUNT');
  return admitDesign(base).definition;
 }
 if(profile==='parallel'&&count>1){
  base.tools=[newAgent('request_router',{description:'Coordinate declared independent capability requests',instructions:'Select only necessary declared specialist capabilities. Distinguish observations, assumptions and unresolved questions.'}),...Array.from({length:count-1},(_,i)=>newAgent('specialist_'+(i+1)))];
  base.tools[0].tools=base.tools.slice(1).map(a=>a.name);
 }
 if(profile==='hierarchy'&&count>1){
  base.tools=Array.from({length:count},(_,i)=>newAgent(i===0?'request_router':'specialist_'+i));
  const parents=Math.min(3,count-1);
  base.tools[0].tools=base.tools.slice(1,parents+1).map(a=>a.name);
  for(let i=parents+1;i<count;i++)base.tools[1+(i-parents-1)%parents].tools.push(base.tools[i].name);
 }
 if(profile==='challenge'){
  if(count<2)fail('DESIGN_CHALLENGE_COUNT');
  base.tools=[newAgent('integrator',{description:'Compare candidate answers and explicitly retain disagreement',instructions:'Request only relevant alternative interpretations. Report conflicts, assumptions and missing evidence.'}),...Array.from({length:count-1},(_,i)=>newAgent('interpretation_'+(i+1),{description:'Offer one bounded candidate interpretation',instructions:'Identify a plausible interpretation, its assumptions, counterexamples and limits. Do not claim independent empirical verification.'}))];
  base.tools[0].tools=base.tools.slice(1).map(a=>a.name);
 }
 return admitDesign(base).definition;
}
export function designGraph(snapshot){
 return {
  id:'design-'+snapshot.revision,
  nodes:snapshot.definition.tools.map(a=>({
   key:a.name,id:a.name,label:a.name,kind:'agent',status:'draft',front:a.name===snapshot.front
  })),
  edges:snapshot.analysis.edges.map(e=>({key:e.from+'>'+e.to,from:e.from,to:e.to,kind:'dependency',authority:'declared possible delegation'}))
 };
}
