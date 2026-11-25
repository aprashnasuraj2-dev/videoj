// A deliberately closed semantic comparison profile. Equal dimensions alone
// are insufficient. Scope identifiers are exact DECLARATIONS, not inferred truth.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {createVerifier} from './index.js';
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,23}$/;
const literal=/^-?(?:0|[1-9]\d{0,47})(?:\/[1-9]\d{0,47})?$/;
const profile={
 length:{dim:[1,0,0],units:{m:'1',mm:'1/1000',cm:'1/100'}},
 stress:{dim:[-1,1,-2],units:{Pa:'1',MPa:'1000000',GPa:'1000000000'}},
 pressure:{dim:[-1,1,-2],units:{Pa:'1',kPa:'1000',MPa:'1000000'}},
 energy:{dim:[2,1,-2],units:{J:'1',kJ:'1000','N*m':'1'}},
 torque:{dim:[2,1,-2],units:{'N*m':'1','kN*m':'1000'}},
 force:{dim:[1,1,-2],units:{N:'1',kN:'1000'}},
 duration:{dim:[0,0,1],units:{s:'1',ms:'1/1000',min:'60'}},
 mass:{dim:[0,1,0],units:{kg:'1',g:'1/1000'}}
};
const fields=['subject','condition','referenceFrame'];
const fail=()=>{throw TypeError('SCOPE_PROFILE_REFUSED');};
const exact=(v,ks)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===ks.length&&ks.every(k=>Object.hasOwn(v,k));
function admit(q){
 if(!exact(q,['quantityKind','value','unit','scope'])||typeof q.quantityKind!=='string'||!Object.hasOwn(profile,q.quantityKind)||
  typeof q.unit!=='string'||!Object.hasOwn(profile[q.quantityKind].units,q.unit)||typeof q.value!=='string'||
  !literal.test(q.value)||q.value.startsWith('-0')||!exact(q.scope,fields)||
  fields.some(k=>typeof q.scope[k]!=='string'||!ID.test(q.scope[k])))fail();
 return q;
}
export function compileScopedComparison(text){
 const p=parseUniqueJson(text,{maxChars:8192,maxDepth:4});
 if(!exact(p,['version','left','right'])||p.version!==1)fail();
 const left=admit(p.left),right=admit(p.right);
 const differences=[];
 if(left.quantityKind!==right.quantityKind)differences.push('quantityKind');
 for(const field of fields)if(left.scope[field]!==right.scope[field])differences.push(field);
 const nodes=[];
 for(const [side,q] of [['left',left],['right',right]]){
  const def=profile[q.quantityKind],basis=[q.quantityKind,q.unit,...fields.map(k=>q.scope[k])].join('|');
  // Magnitude alone is dimensionless. The factor carries SI dimension per
  // declared unit. Bind all typed/scope declarations into the graph identity.
  nodes.push({id:side+'_magnitude',kind:'input',value:q.value,dimension:[0,0,0],basis:'Declared magnitude|'+basis},
   {id:side+'_factor',kind:'input',value:def.units[q.unit],dimension:def.dim,basis:'Profile SI factor|'+basis},
   {id:side+'_si',kind:'derive',op:'mul',args:[side+'_magnitude',side+'_factor']});
 }
 if(!differences.length)nodes.push({id:'equal_quantity',kind:'constraint',op:'eq',args:['left_si','right_si']});
 return Object.freeze({graphText:JSON.stringify({schemaVersion:1,nodes}),differences:Object.freeze(differences)});
}
export async function compareScopedQuantities(text){
 const c=compileScopedComparison(text),r=await createVerifier().evaluate(c.graphText);
 const find=id=>r.report.receipts.find(x=>x.id===id).outcome;
 const left=find('left_si'),right=find('right_si');
 const status=c.differences.length?'incomparable_declared_scope':
  find('equal_quantity').status==='constraint_satisfied'?'equal_declared_quantities':'different_declared_quantities';
 return Object.freeze({status,differences:c.differences,left,right,graphText:c.graphText,reportText:r.reportText,report:r.report});
}
