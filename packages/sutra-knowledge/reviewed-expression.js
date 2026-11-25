// Closed human-authored expression language: no evaluator, literal numbers,
// function calls, code execution, implicit conversions or model dependency.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {selectedSpan} from './reviewed-draft.js';
import {validateReviewedContract,compileReviewedProposal} from './reviewed-claim-compiler.js';
export const VERSION='sutra-reviewed-expression/v1';
const fail=x=>{throw TypeError('EXPRESSION_'+x);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const COMPARISONS={'==':'eq','<':'lt','<=':'le','>':'gt','>=':'ge'};
const OPS={'+':'add','-':'sub','*':'mul','/':'div'};
function tokenize(source){
 if(typeof source!=='string'||!source.trim()||source.length>4096)fail('SIZE');
 const tokens=[];
 let i=0;
 while(i<source.length){
  const c=source[i];
  if(/[ \n\r\t]/.test(c)){i++;continue;}
  const m=/^\[([A-Za-z][A-Za-z0-9_-]{0,63})\]/.exec(source.slice(i));
  if(m){tokens.push({kind:'binding',value:m[1]});i+=m[0].length;}
  else{
   const two=source.slice(i,i+2);
   if(Object.hasOwn(COMPARISONS,two)){tokens.push({kind:two});i+=2;}
   else if('()+-*/<>'.includes(c)){tokens.push({kind:c});i++;}
   else fail('TOKEN');
  }
  if(tokens.length>256)fail('TOKEN_LIMIT');
 }
 return tokens;
}
export async function compileReviewedExpression(contractText,contractPin,expression){
 await validateReviewedContract(contractText,contractPin);
 const c=parseUniqueJson(contractText,{maxChars:262144,maxDepth:9});
 const tokens=tokenize(expression),bindings=new Set(c.bindings.map(b=>b.id)),nodes=[],inputs=new Map(),derives=new Map();
 let pos=0;
 const peek=()=>tokens[pos]?.kind;
 const take=kind=>{if(peek()!==kind)fail('SYNTAX');return tokens[pos++];};
 const append=n=>{if(nodes.length>=64)fail('NODE_LIMIT');nodes.push(n);return n.id;};
 const addInput=id=>{
  if(!bindings.has(id))fail('UNKNOWN_BINDING');
  if(!inputs.has(id))inputs.set(id,append({id:'input_'+(inputs.size+1),kind:'input',bindingId:id}));
  return inputs.get(id);
 };
 const derive=(op,a,b)=>{
  const key=JSON.stringify([op,a,b]);
  if(!derives.has(key))derives.set(key,append({id:'derive_'+(derives.size+1),kind:'derive',op,args:[a,b]}));
  return derives.get(key);
 };
 function atom(depth){
  if(depth>24)fail('DEPTH');
  if(peek()==='binding')return addInput(take('binding').value);
  if(peek()==='('){take('(');const a=sum(depth+1);take(')');return a;}
  fail('SYNTAX');
 }
 function product(depth){
  let a=atom(depth);
  while(peek()==='*'||peek()==='/'){const op=tokens[pos++].kind;a=derive(OPS[op],a,atom(depth));}
  return a;
 }
 function sum(depth){
  let a=product(depth);
  while(peek()==='+'||peek()==='-'){const op=tokens[pos++].kind;a=derive(OPS[op],a,product(depth));}
  return a;
 }
 const left=sum(0),comparison=peek();
 if(!Object.hasOwn(COMPARISONS,comparison))fail('COMPARISON_REQUIRED');
 pos++;
 const right=sum(0);
 if(pos!==tokens.length)fail('TRAILING_TOKENS');
 append({id:'target',kind:'constraint',op:COMPARISONS[comparison],args:[left,right]});
 const questionSpan=selectedSpan('question',c.question.text,0,c.question.text.length);
 if(questionSpan.quote.length>2048||questionSpan.end>4096)fail('QUESTION_SPAN');
 const proposalText=JSON.stringify({version:1,contractDigest:contractPin,questionSpan,claims:[],nodes,targetId:'target'},null,2);
 // Existing compiler remains the sole authority for source admission, units,
 // scope, graph depth, resource bounds and conditional computation.
 const result=await compileReviewedProposal(contractText,contractPin,proposalText);
 return freeze({version:VERSION,contractDigest:contractPin,expression,proposalText,proposalDigest:result.proposalDigest,
  target:result.target,nodeCount:result.nodes.length,usedBindings:[...inputs.keys()].sort(),decisionAuthority:'NONE',
  qualification:'Human-authored expression over reviewed bindings. The parser does not select or verify the intended formula, quantity types, evidence authenticity, comparability, method or meaning. No literals, evaluation of code, or external model calls.'});
}
