// SUTRA knowledge kernel: closed, data-only exact quantity claims.
// No model, arbitrary evaluator, network, source-trust or physical-safety authority.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';

export const KERNEL = 'sutra-exact-quantity/0.1.0';
const LIMIT = Object.freeze({nodes:256, depth:32, graphChars:65536, rationalBits:512, reportChars:262144});
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const OPS = new Set(['add','sub','mul','div']);
const CMP = new Set(['eq','le','lt','ge','gt']);
const invalid = code => { throw new TypeError(code); };
const hasKeys = (o,keys) => o!==null && typeof o==='object' && !Array.isArray(o) &&
 Object.keys(o).length===keys.length && keys.every(k=>Object.hasOwn(o,k));
const identifier = v => typeof v==='string' && ID.test(v);
const sameDim = (a,b) => a.every((v,i)=>v===b[i]);
const dimension = v => Array.isArray(v) && v.length===3 && v.every(x=>Number.isInteger(x)&&x>=-16&&x<=16&&!Object.is(x,-0));
const boundedText = v => typeof v==='string' && v.length>0 && v.length<=160 &&
 !/[\u0000-\u001f\u007f]/.test(v) && !/[\ud800-\udfff]/u.test(v) && v.trim().length>0;
const bitLength = n => (n<0n?-n:n).toString(2).length;
function gcd(a,b){ a=a<0n?-a:a; b=b<0n?-b:b; while(b){const r=a%b;a=b;b=r;} return a; }
function rational(n,d){
 if(d===0n)throw new RangeError('DIVISION_BY_ZERO');
 if(d<0n){n=-n;d=-d;}
 const g=gcd(n,d);n/=g;d/=g;
 if(bitLength(n)>LIMIT.rationalBits||bitLength(d)>LIMIT.rationalBits)throw new RangeError('RATIONAL_LIMIT');
 return {n,d};
}
function parseRational(v){
 if(typeof v!=='string'||!/^(-?(?:0|[1-9]\d{0,47}))(?:\/([1-9]\d{0,47}))?$/.test(v)||v.startsWith('-0'))invalid('RATIONAL_LITERAL');
 const [n,d='1']=v.split('/');return rational(BigInt(n),BigInt(d));
}
function freeze(o){if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;}
 // Canonical JSON on our validated closed profile (integer dimensions, ASCII keys,
 // well-formed strings, arrays, no floating numbers). Not a general JCS implementation.
function canonical(o){
 if(o===null||typeof o!=='object')return JSON.stringify(o);
 if(Array.isArray(o))return '['+o.map(canonical).join(',')+']';
 return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')+'}';
}
async function digest(o){
 const bytes=new TextEncoder().encode(canonical(o));
 const raw=await globalThis.crypto.subtle.digest('SHA-256',bytes);
 return 'sha256:'+Array.from(new Uint8Array(raw),b=>b.toString(16).padStart(2,'0')).join('');
}
function admit(text){
 const graph=parseUniqueJson(text,{maxChars:LIMIT.graphChars,maxDepth:12});
 if(!hasKeys(graph,['schemaVersion','nodes'])||graph.schemaVersion!==1||
 !Array.isArray(graph.nodes)||graph.nodes.length<1||graph.nodes.length>LIMIT.nodes)invalid('GRAPH_SHAPE');
 const nodes=new Map();
 for(const n of graph.nodes){
  if(!n||!identifier(n.id)||nodes.has(n.id))invalid('NODE_ID');
  if(n.kind==='input'){
   if(!hasKeys(n,['id','kind','value','dimension','basis'])||!dimension(n.dimension)||!boundedText(n.basis))invalid('INPUT_SHAPE');
   parseRational(n.value);
  }else if(n.kind==='derive'||n.kind==='constraint'){
   if(!hasKeys(n,['id','kind','op','args'])||!(n.kind==='derive'?OPS:CMP).has(n.op)||
    !Array.isArray(n.args)||n.args.length!==2||!n.args.every(identifier))invalid('OP_SHAPE');
  }else invalid('NODE_KIND');
  nodes.set(n.id,freeze(n));
 }
 // Iterative Kahn traversal: depth computed on all paths, no recursive call stack.
 const degree=new Map(),children=new Map(),depth=new Map();
 for(const [id] of nodes){degree.set(id,0);children.set(id,[]);depth.set(id,1);}
 for(const [id,n] of nodes){
  for(const dep of new Set(n.args??[])){
   if(!nodes.has(dep))invalid('MISSING_DEPENDENCY');
   if(nodes.get(dep).kind==='constraint')invalid('NON_QUANTITY_DEPENDENCY');
   degree.set(id,degree.get(id)+1);children.get(dep).push(id);
  }
 }
 const ready=[...nodes.keys()].filter(id=>degree.get(id)===0).sort(),ordered=[];
 while(ready.length){
  const id=ready.shift();ordered.push(nodes.get(id));
  for(const child of children.get(id)){
   depth.set(child,Math.max(depth.get(child),depth.get(id)+1));
   if(depth.get(child)>LIMIT.depth)invalid('GRAPH_DEPTH');
   degree.set(child,degree.get(child)-1);
   if(degree.get(child)===0){ready.push(child);ready.sort();}
  }
 }
 if(ordered.length!==nodes.size)invalid('GRAPH_CYCLE');
 return ordered;
}
const quantity = (r,dim,status) => ({status,value:r.n.toString()+'/'+r.d.toString(),dimension:dim});
const no = (status,reason) => ({status,reason});
function calculate(node,deps){
 if(node.kind==='input')return quantity(parseRational(node.value),node.dimension,'assumption_declared');
 const [a,b]=deps.map(d=>d.outcome);
 if(!a.value||!b.value)return no('blocked','DEPENDENCY_NOT_QUANTITY');
 const compatible=sameDim(a.dimension,b.dimension);
 if((node.kind==='constraint'||node.op==='add'||node.op==='sub')&&!compatible)return no('incompatible','DIMENSION_MISMATCH');
 // Inputs are exact rationals. Internal values have a separately enforced 512-bit
 // ceiling, so they must not be re-admitted through the shorter wire-literal grammar.
 const internal = v => {const [n,d]=v.split('/');return {n:BigInt(n),d:BigInt(d)};};
 const x=internal(a.value),y=internal(b.value);
 if(node.kind==='constraint'){
  const delta=x.n*y.d-y.n*x.d;
  const ok={eq:delta===0n,le:delta<=0n,lt:delta<0n,ge:delta>=0n,gt:delta>0n}[node.op];
  return {status:ok?'constraint_satisfied':'constraint_refuted',comparison:node.op};
 }
 try{
  let r,dim=a.dimension;
  if(node.op==='add')r=rational(x.n*y.d+y.n*x.d,x.d*y.d);
  if(node.op==='sub')r=rational(x.n*y.d-y.n*x.d,x.d*y.d);
  if(node.op==='mul'||node.op==='div'){
   dim=a.dimension.map((v,i)=>v+(node.op==='mul'?1:-1)*b.dimension[i]);
   if(!dimension(dim))return no('indeterminate','DIMENSION_LIMIT');
   r=node.op==='mul'?rational(x.n*y.n,x.d*y.d):rational(x.n*y.d,x.d*y.n);
  }
  return quantity(r,dim,'computed');
 }catch(e){if(e instanceof RangeError&&['DIVISION_BY_ZERO','RATIONAL_LIMIT'].includes(e.message))return no('indeterminate',e.message);throw e;}
}
// Trusted, in-process cache only. The original receipt identity remains bound to
// the complete graph and exact dependency receipts. The optional revision mode
// reuses an arithmetic outcome only when the entire normalized input provenance
// and all transitive computation identities are unchanged; it never imports a
// receipt or changes the canonical wire report.
function kernelVerifier(provenanceMode=false,initial=new Map()){
 let previous=new Map(initial),running=false;
 const emptyStats=removed=>freeze({executed:[],reusedOutcomes:[],reusedReceipts:[],rebuiltReceipts:[],removed});
 const api={async evaluate(graphText,sourceKeys){
  if(running)throw Error('VERIFIER_BUSY');
  running=true;
  try{
   const nodes=admit(graphText),next=new Map(),executed=[],reused=[],reusedOutcomes=[],rebuiltReceipts=[];
   // The compiler supplies closed, normalized identities of *admitted* bindings.
   // Copy the bounded map before any await. Exact numeric value and dimension
   // remain in the computation key even if a caller lies about this identity.
   const keys=new Map();
   if(provenanceMode){
    const inputs=nodes.filter(n=>n.kind==='input');
    if(!(sourceKeys instanceof Map)||sourceKeys.size!==inputs.length)invalid('REVISION_PROVENANCE_KEYS');
    let chars=0;
    for(const n of inputs){
     const key=sourceKeys.get(n.id);
     if(typeof key!=='string'||!key.length||key.length>8192||/[\ud800-\udfff]/u.test(key))invalid('REVISION_PROVENANCE_KEY');
     chars+=key.length;if(chars>262144)invalid('REVISION_PROVENANCE_LIMIT');
     keys.set(n.id,key);
    }
   }
   for(const node of nodes){
    const dependencyEntries=(node.args??[]).map(id=>next.get(id)),dependencies=dependencyEntries.map(d=>d.receipt);
    const refs=dependencies.map(d=>({id:d.id,receiptDigest:d.receiptDigest}));
    const nodeDigest=await digest({kernel:KERNEL,node,dependencies:refs});
    const old=previous.get(node.id);
    const tokens=provenanceMode?dependencyEntries.map(d=>d.token):null;
    const calculationKey=provenanceMode?canonical(node.kind==='input'?{id:node.id,kind:node.kind,value:node.value,dimension:node.dimension,provenance:keys.get(node.id)}:node):null;
    const sameCalculation=provenanceMode?!!old&&old.calculationKey===calculationKey&&old.tokens.length===tokens.length&&old.tokens.every((t,i)=>t===tokens[i]):old?.receipt.nodeDigest===nodeDigest;
    let receipt;
    if(sameCalculation){
     reusedOutcomes.push(node.id);
     if(old.receipt.nodeDigest===nodeDigest){receipt=old.receipt;reused.push(node.id);}
     else{
      // New receipt, new digest and current dependency receipt identities.
      // Only the immutable, deterministic arithmetic outcome is reused.
      const body={id:node.id,nodeDigest,dependencies:refs,outcome:old.receipt.outcome};
      receipt=freeze({...body,receiptDigest:await digest(body)});rebuiltReceipts.push(node.id);
     }
    }else{
     const body={id:node.id,nodeDigest,dependencies:refs,outcome:calculate(node,dependencies)};
     receipt=freeze({...body,receiptDigest:await digest(body)});executed.push(node.id);rebuiltReceipts.push(node.id);
    }
    next.set(node.id,{receipt,calculationKey,tokens,token:provenanceMode?(sameCalculation?old.token:Symbol()):null});
   }
   const sorted=[...next.values()].map(e=>e.receipt).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
   const graphDigest=await digest({kernel:KERNEL,nodes:sorted.map(r=>({id:r.id,nodeDigest:r.nodeDigest}))});
   const report=freeze({schemaVersion:1,kernel:KERNEL,graphDigest,receipts:sorted});
   const reportText=canonical(report);
   if(reportText.length>LIMIT.reportChars)throw RangeError('REPORT_LIMIT');
   const removed=[...previous.keys()].filter(id=>!next.has(id)).sort();
   previous=next; // transactional: invalid/failed run never replaces previous state
   const stats=provenanceMode?{executed,reusedOutcomes,reusedReceipts:reused,rebuiltReceipts,removed}:{executed,reused,removed};
   return freeze({report,reportText,stats});
  }finally{running=false;}
 }};
 if(provenanceMode){
  api.fork=()=>{if(running)throw Error('VERIFIER_BUSY');return kernelVerifier(true,previous);};
  api.clear=()=>{if(running)throw Error('VERIFIER_BUSY');const removed=[...previous.keys()].sort();previous=new Map();return emptyStats(removed);};
 }
 return Object.freeze(api);
}
export function createVerifier(){return kernelVerifier();}
export function createProvenanceVerifier(){return kernelVerifier(true);}
// No trust in claims or signatures asserted by the producer. Recompute from the
// graph in a fresh verifier and require byte-identical canonical report.
export async function replayReport(graphText,reportText){
 if(typeof reportText!=='string'||reportText.length>LIMIT.reportChars)return false;
 const result=await createVerifier().evaluate(graphText);
 return result.reportText===reportText;
}

// Exact structural invalidation diagnostic over admitted graphs. It does not
// import receipts or grant authority. Compare both old and new reverse edges.
export function revisionDependencyClosure(beforeText,afterText){
 const before=new Map(admit(beforeText).map(n=>[n.id,n])),after=new Map(admit(afterText).map(n=>[n.id,n]));
 const children=new Map(),changed=[],removed=[],added=[];
 for(const graph of [before,after])for(const n of graph.values())for(const dep of new Set(n.args??[])){
  if(!children.has(dep))children.set(dep,new Set());children.get(dep).add(n.id);
 }
 for(const id of new Set([...before.keys(),...after.keys()])){
  if(!before.has(id)){added.push(id);changed.push(id);}
  else if(!after.has(id)){removed.push(id);changed.push(id);}
  else if(canonical(before.get(id))!==canonical(after.get(id)))changed.push(id);
 }
 const affected=new Set(changed),queue=changed.slice();let traversedEdges=0;
 for(let i=0;i<queue.length;i++)for(const child of children.get(queue[i])??[]){traversedEdges++;if(!affected.has(child)){affected.add(child);queue.push(child);}}
 return freeze({changed:changed.sort(),added:added.sort(),removed:removed.sort(),affected:[...affected].sort(),recompute:[...affected].filter(id=>after.has(id)).sort(),unaffected:[...after.keys()].filter(id=>!affected.has(id)).sort(),traversedEdges,decisionAuthority:'NONE'});
}
