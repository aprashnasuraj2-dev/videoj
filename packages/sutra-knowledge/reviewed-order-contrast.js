// Restricted order-logic analysis over exact matching typed expression signatures.
// No natural-language equivalence, algebraic identity or source truth is inferred.
import {exportReviewedContrast} from './reviewed-proposal-contrast.js';
export const VERSION='sutra-reviewed-order-contrast/v1';
const QUAL='Conditional total-order logic only for structurally identical typed operands, with reversed orientation normalized. Assumes defined comparable exact scalar quantities; not semantic equivalence, source truth, model independence or a vote. Unaligned expressions remain unclassified. Observed truth-state compatibility is separate from the symbolic relation.';
const SIGNS=['LT','EQ','GT'];
const truth={lt:['LT'],le:['LT','EQ'],eq:['EQ'],ge:['EQ','GT'],gt:['GT']};
const opposite={LT:'GT',EQ:'EQ',GT:'LT'};
const decisive=s=>s==='CONDITIONALLY_SATISFIED'||s==='CONDITIONALLY_REFUTED';
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
// Pure analysis helper; the public entry point derives both computations
// from replay, never from peer-supplied signatures or statuses.
export function orderRelation(a,b){
 const u=a.operandSignatures,v=b.operandSignatures;
 const direct=same(u,v),reverse=same(u,[v[1],v[0]]);
 if(!direct&&!reverse)return {status:'UNALIGNED_OPERANDS'};
 if(a.typeBlockers.length||b.typeBlockers.length)return {status:'BLOCKED_TYPE'};
 const domain=u[0]===u[1]?['EQ']:SIGNS.slice();
 const left=domain.filter(s=>truth[a.targetOperator].includes(s)),right=domain.filter(s=>truth[b.targetOperator].includes(direct?s:opposite[s]));
 const overlap=domain.filter(s=>left.includes(s)&&right.includes(s)),uncovered=domain.filter(s=>!left.includes(s)&&!right.includes(s));
 const leftImpliesRight=left.every(s=>right.includes(s)),rightImpliesLeft=right.every(s=>left.includes(s));
 let relation;
 if(leftImpliesRight&&rightImpliesLeft)relation='EQUIVALENT';
 else if(!overlap.length&&!uncovered.length)relation='COMPLEMENT';
 else if(!overlap.length)relation='MUTUALLY_EXCLUSIVE_NONEXHAUSTIVE';
 else if(leftImpliesRight)relation='LEFT_IMPLIES_RIGHT';
 else if(rightImpliesLeft)relation='RIGHT_IMPLIES_LEFT';
 else relation='OVERLAP';
 let compatibleObservedOrders=null;
 if(decisive(a.status)&&decisive(b.status)){
  compatibleObservedOrders=domain.filter(s=>left.includes(s)===(a.status==='CONDITIONALLY_SATISFIED')&&right.includes(s)===(b.status==='CONDITIONALLY_SATISFIED'));
  if(!compatibleObservedOrders.length)throw Error('ORDER_CONTRAST_REPLAY_DIVERGENCE');
 }
 return {status:'CLASSIFIED',orientation:direct?'DIRECT':'REVERSED',domain,leftTrueOrders:left,rightTrueOrders:right,overlap,uncovered,leftImpliesRight,rightImpliesLeft,relation,compatibleObservedOrders};
}
export async function exportReviewedOrderContrast(contractText,contractPin,batchText){
 const contrast=await exportReviewedContrast(contractText,contractPin,batchText),accepted=contrast.result.entries.filter(e=>e.admission==='ADMITTED'),by=new Map(accepted.map(e=>[e.id,e.computation]));
 const orderRelations=contrast.result.pairs.map(p=>({left:p.left,right:p.right,...orderRelation(by.get(p.left),by.get(p.right))}));
 return freeze({version:VERSION,contrast,orderRelations,decisionAuthority:'NONE',qualification:QUAL});
}
