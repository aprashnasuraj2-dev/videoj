// Safe compiler for a deterministic third-party FinQA gold-program subset.
// It compiles the independently supplied annotation, not natural language.
import {createVerifier} from './index.js';
const OPS=Object.freeze({add:'add',subtract:'sub',multiply:'mul',divide:'div'}),NUM=/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/,REF=/^#([0-9]+)$/,CONST=/^const_([1-9]\d*)$/;
const fail=c=>{throw TypeError('FINQA_SEMANTIC_'+c);};
const closed=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const rational=t=>{if(!NUM.test(t))fail('NUMBER');let sign='';if(t[0]==='-'){sign='-';t=t.slice(1);}if(!t.includes('.'))return sign+t;let [a,b]=t.split('.');let n=BigInt(a+b),d=10n**BigInt(b.length),x=n,y=d;while(y)[x,y]=[y,x%y];n/=x;d/=x;return sign+n+'/'+d;};
const fnv=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h>>>0;};
export function auditFinQASelection(corpus){
 if(!closed(corpus,['version','name','license','upstream','selection','inventory','cases'])||corpus.version!==1||corpus.license!=='MIT'||!Array.isArray(corpus.inventory)||!Array.isArray(corpus.cases)||corpus.cases.length!==corpus.selection?.count||corpus.inventory.length!==corpus.upstream?.caseCount)fail('CORPUS');
 const ids=new Set();for(const r of corpus.inventory){if(!closed(r,['id','rank'])||typeof r.id!=='string'||ids.has(r.id)||r.rank!==fnv(r.id))fail('INVENTORY');ids.add(r.id);}
 const sorted=[...corpus.inventory].sort((a,b)=>a.rank-b.rank||a.id.localeCompare(b.id)),wanted=sorted.slice(0,corpus.selection.count);
 if(corpus.selection.nextRank!==sorted[corpus.selection.count]?.rank||corpus.cases.some((c,i)=>c.id!==wanted[i].id||c.rank!==wanted[i].rank))fail('SELECTION');
 return Object.freeze({total:sorted.length,selected:wanted.length,threshold:corpus.selection.nextRank});
}
function parseProgram(program){
 if(typeof program!=='string'||program.length<1||program.length>4096)fail('PROGRAM');
 const steps=[];let pos=0;
 while(pos<program.length){
  const m=/^(add|subtract|multiply|divide)\(\s*([^,()]+?)\s*,\s*([^,()]+?)\s*\)/.exec(program.slice(pos));if(!m)fail('PROGRAM');
  steps.push({op:m[1],args:[m[2],m[3]]});pos+=m[0].length;
  if(pos===program.length)break;if(program.slice(pos,pos+2)!==', ')fail('PROGRAM');pos+=2;
 }
 if(!steps.length||steps.length>32)fail('PROGRAM');return steps;
}
function operand(token,stepIndex,nodes,literals){
 const ref=REF.exec(token);if(ref){const i=Number(ref[1]);if(!Number.isSafeInteger(i)||i<0||i>=stepIndex)fail('REFERENCE');return 'step_'+i;}
 const c=CONST.exec(token),literal=c?c[1]:token;if(!NUM.test(literal))fail('OPERAND');
 if(!literals.has(token)){const id='literal_'+literals.size;literals.set(token,id);nodes.push({id,kind:'input',value:rational(literal),dimension:[0,0,0],basis:'FinQA gold program literal '+token});}
 return literals.get(token);
}
export function compileFinQAGoldProgram(record){
 if(!closed(record,['id','rank','question','program','answer'])||typeof record.id!=='string'||record.id.length>256||record.rank!==fnv(record.id)||typeof record.question!=='string'||record.question.length<1||record.question.length>2000||typeof record.answer!=='string'||record.answer.length>64||!NUM.test(record.answer))fail('RECORD');
 const parsed=parseProgram(record.program),nodes=[],literals=new Map(),steps=[];
 for(let i=0;i<parsed.length;i++){const p=parsed[i],args=p.args.map(x=>operand(x,i,nodes,literals)),id='step_'+i;nodes.push({id,kind:'derive',op:OPS[p.op],args});steps.push({id,operation:p.op,args:p.args.slice()});}
 const graphText=JSON.stringify({schemaVersion:1,nodes}),targetId='step_'+(parsed.length-1);
 return Object.freeze({profile:'sutra-finqa-gold-program/v1',externalId:record.id,question:record.question,program:record.program,answer:record.answer,steps:Object.freeze(steps.map(Object.freeze)),graphText,targetId,semanticInterpretation:'THIRD_PARTY_GOLD_PROGRAM',decisionAuthority:'NONE',qualification:'Compiles a third-party FinQA public-test gold reasoning program into the exact quantity kernel. It does not infer the program from the question, verify source-document extraction, or provide financial advice.'});
}
function fraction(text){const [a,b='1']=text.split('/');return [BigInt(a),BigInt(b)];}
function abs(n){return n<0n?-n:n;}
export async function evaluateFinQAGoldProgram(record){
 const compiled=compileFinQAGoldProgram(record),run=await createVerifier().evaluate(compiled.graphText),row=run.report.receipts.find(x=>x.id===compiled.targetId),value=row?.outcome?.value;if(!value)fail('EVALUATION');
 const [n,d]=fraction(value),[gn,gd]=fraction(rational(record.answer)),delta=abs(n*gd-gn*d),den=d*gd;
 const matches=delta*100000n<=den; // <= 1e-5 absolute; FinQA public answers are rounded.
 return Object.freeze({...compiled,result:value,goldMatchesWithin1e5:matches,reportText:run.reportText});
}
