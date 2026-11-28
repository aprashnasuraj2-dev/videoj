// Reuse the existing quantity admission profile and exact computation kernel.
import {compileScopedComparison} from '../../../../packages/sutra-knowledge/scope.js';
import {createVerifier,replayReport} from '../../../../packages/sutra-knowledge/index.js';
export const quantityUnits=Object.freeze(Object.fromEntries(Object.entries({
 length:['m','mm','cm'],stress:['Pa','MPa','GPa'],pressure:['Pa','kPa','MPa'],
 energy:['J','kJ','N*m'],torque:['N*m','kN*m'],force:['N','kN'],
 duration:['s','ms','min'],mass:['kg','g']
}).map(([k,v])=>[k,Object.freeze(v)])));
const fail=()=>{throw Error('LOCAL_QUANTITY_INPUT');};
const gcd=(a,b)=>{a=a<0n?-a:a;while(b){const r=a%b;a=b;b=r;}return a||1n;};
export function exactMagnitude(input){
 if(typeof input!=='string'||input.length>50||!(/^-?(?:0|[1-9]\d{0,23})(?:\.\d{1,23}|\/[1-9]\d{0,23})?$/.test(input)))fail();
 let n,d;
 if(input.includes('/'))[n,d]=input.split('/').map(BigInt);
 else if(input.includes('.')){
  const negative=input.startsWith('-'),parts=input.replace(/^-/, '').split('.');
  d=10n**BigInt(parts[1].length);n=BigInt(parts.join(''))*(negative?-1n:1n);
 }else{n=BigInt(input);d=1n;}
 if(n===0n)return '0';
 const g=gcd(n,d);n/=g;d/=g;
 return d===1n?String(n):n+'/'+d;
}
export function conversionGraph({kind,value,from,to}={}){
 if(typeof kind!=='string'||!Object.hasOwn(quantityUnits,kind)||!quantityUnits[kind].includes(from)||!quantityUnits[kind].includes(to))fail();
 const magnitude=exactMagnitude(value);
 const scope={subject:'same_quantity',condition:'unit_conversion',referenceFrame:'declared_SI'};
 const comparison=compileScopedComparison(JSON.stringify({version:1,left:{quantityKind:kind,value:magnitude,unit:from,scope},right:{quantityKind:kind,value:'1',unit:to,scope}}));
 if(comparison.differences.length)fail();
 const graph=JSON.parse(comparison.graphText);
 graph.nodes=graph.nodes.filter(n=>n.id!=='equal_quantity');
 graph.nodes.push({id:'converted_value',kind:'derive',op:'div',args:['left_si','right_si']});
 return JSON.stringify(graph);
}
export async function convertQuantity(input){
 const graphText=conversionGraph(input),result=await createVerifier().evaluate(graphText);
 const receipt=result.report.receipts.find(r=>r.id==='converted_value'),outcome=receipt?.outcome;
 if(!outcome||typeof outcome.value!=='string'||!Array.isArray(outcome.dimension)||outcome.dimension.some(x=>x!==0))throw Error('LOCAL_QUANTITY_RESULT');
 if(!await replayReport(graphText,result.reportText))throw Error('LOCAL_QUANTITY_REPLAY');
 return Object.freeze({value:outcome.value.replace(/\/1$/,''),unit:input.to,graphText,reportText:result.reportText,digest:result.report.graphDigest,receipt,qualification:'Exact local unit conversion of declared magnitude and quantity kind. Not a measurement or independent empirical verification.'});
}
