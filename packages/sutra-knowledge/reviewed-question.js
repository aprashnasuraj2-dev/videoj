// Closed, caller-grounded English comparison grammar. Not unrestricted NLP.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {selectedSpan} from './reviewed-draft.js';
import {compileReviewedExpression} from './reviewed-expression.js';
import {validateReviewedContract,compileReviewedProposal} from './reviewed-claim-compiler.js';
import {FACETS,evaluateSemanticInvestigation} from './semantic-investigation.js';
export const VERSION='sutra-reviewed-question/v1';
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const fail=x=>{throw TypeError('QUESTION_'+x);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const phrases=Object.freeze({
 'greater than':'>','higher than':'>','less than':'<','lower than':'<',
 'at least':'>=','at most':'<=','equal to':'==',
 'not greater than':'<=','not higher than':'<=','not less than':'>=','not lower than':'>=',
 'no more than':'<=','no less than':'>='
});
const alias=/^[\p{L}\p{M}\p{N}]+(?:[ _-][\p{L}\p{M}\p{N}]+)*$/u;
// Do not hide a second relation, conjunction, conditional or negation inside
// the reviewed operand. This deliberately refuses some real-world names.
const reserved=/(?:^|[ _-])(?:not|no|and|or|if|unless|because|except|than|greater|higher|less|lower|equal|least|most|more|causes?|causal|afterwards|respectively)(?:$|[ _-])/iu;
function operand(raw,question,bindings){
 if(!keys(raw,['start','end','bindingIds'])||!Array.isArray(raw.bindingIds)||!raw.bindingIds.length||raw.bindingIds.length>8||new Set(raw.bindingIds).size!==raw.bindingIds.length||raw.bindingIds.some(id=>typeof id!=='string'||!bindings.has(id)))fail('OPERAND');
 if(!Number.isSafeInteger(raw.start)||!Number.isSafeInteger(raw.end)||Object.is(raw.start,-0)||raw.start<0||raw.end<=raw.start||raw.end>question.length)fail('OPERAND_SPAN');
 const quote=question.slice(raw.start,raw.end);
 if(quote.length>128||!alias.test(quote)||reserved.test(quote))fail('UNSUPPORTED_OPERAND_TEXT');
 return {span:selectedSpan('question',question,raw.start,raw.end),bindingIds:raw.bindingIds.slice().sort(),start:raw.start,end:raw.end};
}
export async function compileReviewedQuestion(contractText,contractPin,planText,planPin){
 if(typeof planPin!=='string'||await casePin(planText)!==planPin)fail('PIN');
 await validateReviewedContract(contractText,contractPin);
 const contract=parse(contractText),p=parse(planText,6),question=contract.question.text;
 if(!keys(p,['version','contractDigest','left','right'])||p.version!==1||p.contractDigest!==contractPin||question.length>1000)fail('PLAN');
 const ids=new Set(contract.bindings.map(b=>b.id));
 const left=operand(p.left,question,ids),right=operand(p.right,question,ids);
 if(left.start!==3||question.slice(0,left.start)!=='Is '||right.end!==question.length-1||question.at(-1)!=='?'||left.end>=right.start)fail('FULL_QUESTION_GRAMMAR');
 const middle=question.slice(left.end,right.start);
 if(!middle.startsWith(' ')||!middle.endsWith(' '))fail('RELATION');
 const relation=middle.slice(1,-1);
 if(!Object.hasOwn(phrases,relation))fail('UNSUPPORTED_RELATION');
 const relationSpan=selectedSpan('question',question,left.end+1,right.start-1);
 const count=left.bindingIds.length*right.bindingIds.length;
 if(count>8)fail('CANDIDATE_LIMIT');
 const candidates=[],proposals=[];
 for(const a of left.bindingIds)for(const b of right.bindingIds){
  const id='question_'+(candidates.length+1),expression='['+a+']'+phrases[relation]+'['+b+']';
  const drafted=await compileReviewedExpression(contractText,contractPin,expression),proposal=JSON.parse(drafted.proposalText);
  // Preserve exact operand and relation bytes as quotation claims. These
  // establish only what was written, not the validity of the chosen mapping.
  proposal.claims=[['left_alias',left.span],['relation_phrase',relationSpan],['right_alias',right.span]].map(([id,span])=>({id,kind:'quoted_assertion',span}));
  const proposalText=JSON.stringify(proposal),computed=await compileReviewedProposal(contractText,contractPin,proposalText);
  const meaning=left.span.quote+' ('+a+') '+relation+' '+right.span.quote+' ('+b+')';
  const facets=Object.fromEntries(FACETS.map(k=>[k,null]));
  const refs=[...new Set([a,b])].map(id=>({kind:'binding',id}));
  facets.definition={statement:meaning,references:refs};
  facets.measurement={statement:'Caller-declared operand correspondence: '+a+' / '+b,references:refs};
  facets.quantifier={statement:'Exact comparison phrase: '+relation,references:[{kind:'claim',id:'relation_phrase'}]};
  if(relation.startsWith('not ')||relation.startsWith('no '))facets.negation={statement:'Explicit inclusive negated relation: '+relation,references:[{kind:'claim',id:'relation_phrase'}]};
  proposals.push({id,proposalText});candidates.push({id,meaning,facets,leftBinding:a,rightBinding:b,expression,conditionalState:computed.target.status});
 }
 let batchText=null,annotationText=null,annotationPin=null,investigation=null;
 // The existing contrast profile requires at least two distinct candidate IDs.
 // A single admitted program must not be duplicated to create a false consensus.
 if(count>=2){
  batchText=JSON.stringify({version:1,contractDigest:contractPin,proposals});
  annotationText=JSON.stringify({version:1,contractDigest:contractPin,batchDigest:await casePin(batchText),candidates:candidates.map(({id,meaning,facets})=>({id,meaning,facets}))});
  annotationPin=await casePin(annotationText);
  investigation=await evaluateSemanticInvestigation(contractText,contractPin,batchText,annotationText,annotationPin);
 }
 return freeze({version:VERSION,contractDigest:contractPin,planDigest:planPin,originalQuestion:contract.question,
  grammar:'IS_EXACT_LEFT_RELATION_EXACT_RIGHT_QUESTION_MARK',left:{span:left.span,bindingIds:left.bindingIds},relation:{span:relationSpan,operator:phrases[relation]},right:{span:right.span,bindingIds:right.bindingIds},
  candidates,proposals,batchText,annotationText,annotationPin,investigation,mode:count===1?'SINGLE_UNTRUSTED_PROPOSAL':'ALL_DECLARED_ALTERNATIVES',decisionAuthority:'NONE',
  qualification:'Closed English comparison grammar and exact caller-selected operand spans only. Binding correspondences are declarations, not inferred entity or semantic truth. All supplied alternatives are retained, including same-binding or type-blocked comparisons. Unsupported syntax and more than eight combinations are refused, not guessed. No unrestricted natural-language parsing, source retrieval, semantic completeness or external authority.'});
}

/** Portable replay projection: independently pinned contract and plan are still mandatory. */
export async function exportReviewedQuestion(contractText,contractPin,planText,planPin){
 const result=await compileReviewedQuestion(contractText,contractPin,planText,planPin);
 const projection=Object.fromEntries(['version','contractDigest','planDigest','originalQuestion','grammar','left','relation','right','candidates','proposals','mode','decisionAuthority','qualification'].map(k=>[k,result[k]]));
 const bundleText=JSON.stringify({contractText,contractDigest:contractPin,planText,planDigest:planPin,result:projection});
 const byteLength=new TextEncoder().encode(bundleText).length;
 return freeze({result,bundleText,snapshotPin:await casePin(bundleText),byteLength,portable:byteLength<=262144});
}
