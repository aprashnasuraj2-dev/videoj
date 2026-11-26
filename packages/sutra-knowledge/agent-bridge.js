// Host-owned proof planning bridge. Model output selects a pre-approved graph;
// it never supplies executable code, a graph, network destination, or verdict.
import {runNetwork} from '../sutra-runtime/index.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {createVerifier} from './index.js';
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const reject=()=>{throw new TypeError('PROOF_PROPOSAL_REFUSED');};
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
export function makeProofNetwork(){
 const parameters={type:'object',properties:{request:{type:'string',minLength:1,maxLength:2000}},required:['request'],additionalProperties:false};
 return {metadata:{description:'Select an already reviewed proof obligation; no verification authority.'},max_steps:3,tools:[
  {name:'planner',function:{description:'Select a reviewed method with a specialist.',parameters},instructions:'Delegate to specialist before selecting. Return only JSON with version:1, obligationId and methodId. Do not claim verification; the caller evaluates a separately approved graph.',tools:['specialist']},
  {name:'specialist',function:{description:'Suggest one of the offered proof methods.',parameters},instructions:'Return a candidate method identifier from the request. No factual or verification authority.',tools:[]}
 ]};
}
// The trusted host supplies a single bounded case, not a model-written registry.
// Copy it before awaiting orchestration; do not expose the graph or result to
// the model unless a future explicitly authorized disclosure contract allows it.
export function admitProofCase(text){
 const c=parseUniqueJson(text,{maxChars:65536,maxDepth:5});
 if(!keys(c,['obligationId','methods'])||typeof c.obligationId!=='string'||!ID.test(c.obligationId)||
 !Array.isArray(c.methods)||c.methods.length<1||c.methods.length>4)reject();
 const methods=new Map();
 for(const m of c.methods){
  if(!keys(m,['id','graphText','constraintId'])||typeof m.id!=='string'||!ID.test(m.id)||methods.has(m.id)||
   typeof m.graphText!=='string'||m.graphText.length>65536||typeof m.constraintId!=='string'||!ID.test(m.constraintId))reject();
  // Admit a reference to a declared constraint, not an arbitrary quantity.
  const g=parseUniqueJson(m.graphText,{maxChars:65536,maxDepth:12});
  if(!Array.isArray(g?.nodes)||g.nodes.filter(n=>n?.id===m.constraintId&&n.kind==='constraint').length!==1)reject();
  methods.set(m.id,Object.freeze({...m}));
 }
 return {obligationId:c.obligationId,methods};
}
export function parseProposal(text,obligationId,methodIds){
 const p=parseUniqueJson(text,{maxChars:1024,maxDepth:3});
 if(!keys(p,['version','obligationId','methodId'])||p.version!==1||p.obligationId!==obligationId||
 typeof p.methodId!=='string'||!methodIds.includes(p.methodId))reject();
 return Object.freeze(p);
}
export async function runProofProposal({caseText,model,signal}){
 const c=admitProofCase(caseText),methodIds=[...c.methods.keys()];
 const request=JSON.stringify({obligationId:c.obligationId,methodIds});
 signal?.throwIfAborted();
 const run=await runNetwork({definition:makeProofNetwork(),name:'proof',frontMan:'planner',request,model,signal,
  limits:{maxDepth:2,maxAgents:4,maxModelCalls:5,maxSteps:3,timeoutMs:15000,maxOutputChars:4000}});
 signal?.throwIfAborted();
 // The runtime's textual output is untrusted. Reject extra fields and unknown
 // IDs, including a model-declared verified flag, before deterministic work.
 const proposal=parseProposal(run.text,c.obligationId,methodIds);
 const method=c.methods.get(proposal.methodId);
 const result=await createVerifier().evaluate(method.graphText);
 signal?.throwIfAborted();
 const receipt=result.report.receipts.find(r=>r.id===method.constraintId);
 if(!receipt)reject();
 return Object.freeze({proposal,receipt,report:result.report,reportText:result.reportText,
  graphText:method.graphText,mode:run.mode,agentCalls:run.agentCalls,modelCalls:run.modelCalls});
}
// Explicit scripted orchestration only. The real pinned runtime executes the
// delegation, but these decisions are deterministic test fixtures, not live AI.
export function scriptedProofModel({obligationId='beam_deflection',methodId='section_derived',hostile=false}={}){
 let sequence=0;
 return {mode:'scripted-test',async chat({messages,tools,signal}){
  signal?.throwIfAborted();
  if(tools.some(t=>t.function.name==='specialist')&&!messages.some(m=>m.role==='tool')){
   return {content:'',toolCalls:[{id:'proof-'+(++sequence),type:'function',function:{name:'specialist',arguments:JSON.stringify({request:'Suggest a reviewed method from the offered case.'})}}]};
  }
  if(!tools.length)return {content:methodId,toolCalls:[]};
  return {content:JSON.stringify({version:1,obligationId,methodId,...(hostile?{verified:true}:{})}),toolCalls:[]};
 }};
}
