// Closed, caller-grounded English comparison grammar. Not unrestricted NLP.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {selectedSpan} from './reviewed-draft.js';
import {compileReviewedExpression} from './reviewed-expression.js';
import {validateReviewedContract,compileReviewedProposal} from './reviewed-claim-compiler.js';
import {FACETS,evaluateSemanticInvestigation} from './semantic-investigation.js';
export const VERSION='sutra-reviewed-question/v1';
export const CHANGE_VERSION='sutra-reviewed-change-question/v1';
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
 if(p?.version===2)return compileChange(contractText,contractPin,planPin,contract,p);
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


// Explicitly bounded alternative meanings of change. Signed difference and
// signed relative change are not magnitude, annualized growth or causal effect.
const changePrefixes=Object.freeze({
 'Is the change from ':['SIGNED_DIFFERENCE','SIGNED_RELATIVE_CHANGE'],
 'Is the signed difference from ':['SIGNED_DIFFERENCE'],
 'Is the signed relative change from ':['SIGNED_RELATIVE_CHANGE']
});
const changeReserved=/(?:^|[ _-])(?:change|difference|signed|relative|from|to|between|percent|percentage|points?|absolute|growth|increase|decrease)(?:$|[ _-])/iu;
const CHANGE_QUAL='Closed English change grammar with caller-reviewed baseline, current and threshold bindings. Unqualified change preserves both signed difference and signed relative change; these are supplied templates, not complete meaning coverage. Relative formula divides by the signed baseline: zero remains unresolved and a negative baseline is not conventional positive-base growth. Percentage-point and percent wording, annualization, causal interpretation and authority are not inferred.';
async function compileChange(contractText,contractPin,planPin,contract,p){
 const q=contract.question.text;
 if(!keys(p,['version','contractDigest','baseline','current','threshold'])||p.contractDigest!==contractPin||q.length>1000)fail('CHANGE_PLAN');
 const ids=new Set(contract.bindings.map(b=>b.id)),b=operand(p.baseline,q,ids),c=operand(p.current,q,ids),t=operand(p.threshold,q,ids);
 if([b,c,t].some(x=>changeReserved.test(x.span.quote)))fail('CHANGE_OPERAND');
 const prefix=q.slice(0,b.start),modes=changePrefixes[prefix];
 if(!Object.hasOwn(changePrefixes,prefix)||q.slice(b.end,c.start)!==' to '||c.end>=t.start||t.end!==q.length-1||q.at(-1)!=='?')fail('CHANGE_GRAMMAR');
 const middle=q.slice(c.end,t.start),relation=middle.slice(1,-1);
 if(!middle.startsWith(' ')||!middle.endsWith(' ')||!Object.hasOwn(phrases,relation))fail('CHANGE_RELATION');
 const count=modes.length*b.bindingIds.length*c.bindingIds.length*t.bindingIds.length;if(count>8)fail('CANDIDATE_LIMIT');
 const relationSpan=selectedSpan('question',q,c.end+1,t.start-1),modeSpan=selectedSpan('question',q,7,b.start-1);
 const candidates=[],proposals=[];
 for(const mode of modes)for(const prior of b.bindingIds)for(const now of c.bindingIds)for(const threshold of t.bindingIds){
  const id='question_'+(candidates.length+1),difference='(['+now+']-['+prior+'])',expression=difference+(mode==='SIGNED_RELATIVE_CHANGE'?'/['+prior+']':'')+phrases[relation]+'['+threshold+']';
  const draft=await compileReviewedExpression(contractText,contractPin,expression),proposal=JSON.parse(draft.proposalText);
  proposal.claims=[['change_phrase',modeSpan],['baseline_alias',b.span],['current_alias',c.span],['relation_phrase',relationSpan],['threshold_alias',t.span]].map(([id,span])=>({id,kind:'quoted_assertion',span}));
  const proposalText=JSON.stringify(proposal),computed=await compileReviewedProposal(contractText,contractPin,proposalText);
  const meaning=(mode==='SIGNED_DIFFERENCE'?'Signed difference':'Signed relative change')+' from '+b.span.quote+' ('+prior+') to '+c.span.quote+' ('+now+') '+relation+' '+t.span.quote+' ('+threshold+')';
  const refs=[...new Set([prior,now,threshold])].map(id=>({kind:'binding',id})),facets=Object.fromEntries(FACETS.map(k=>[k,null]));
  facets.definition={statement:meaning,references:refs};
  facets.baseline={statement:'Caller-declared baseline: '+prior,references:[{kind:'binding',id:prior}]};
  facets.measurement={statement:'Caller-declared current and threshold: '+now+' / '+threshold,references:[...new Set([now,threshold])].map(id=>({kind:'binding',id}))};
  facets.method={statement:mode==='SIGNED_DIFFERENCE'?'Current minus baseline; not absolute magnitude.':'(Current minus baseline) divided by signed baseline; zero unresolved; negative baseline is not conventional growth.',references:refs};
  facets.quantifier={statement:'Exact comparison phrase: '+relation,references:[{kind:'claim',id:'relation_phrase'}]};
  if(relation.startsWith('not ')||relation.startsWith('no '))facets.negation={statement:'Explicit inclusive negated relation: '+relation,references:[{kind:'claim',id:'relation_phrase'}]};
  proposals.push({id,proposalText});candidates.push({id,meaning,facets,changeMode:mode,baselineBinding:prior,currentBinding:now,thresholdBinding:threshold,expression,conditionalState:computed.target.status});
 }
 let batchText=null,annotationText=null,annotationPin=null,investigation=null;
 if(count>=2){
  batchText=JSON.stringify({version:1,contractDigest:contractPin,proposals});
  annotationText=JSON.stringify({version:1,contractDigest:contractPin,batchDigest:await casePin(batchText),candidates:candidates.map(({id,meaning,facets})=>({id,meaning,facets}))});annotationPin=await casePin(annotationText);
  investigation=await evaluateSemanticInvestigation(contractText,contractPin,batchText,annotationText,annotationPin);
 }
 const operandProjection=x=>({span:x.span,bindingIds:x.bindingIds});
 return freeze({version:CHANGE_VERSION,contractDigest:contractPin,planDigest:planPin,originalQuestion:contract.question,grammar:'IS_CHANGE_FROM_EXACT_BASELINE_TO_EXACT_CURRENT_RELATION_EXACT_THRESHOLD_QUESTION_MARK',change:{span:modeSpan,modes},baseline:operandProjection(b),current:operandProjection(c),threshold:operandProjection(t),relation:{span:relationSpan,operator:phrases[relation]},candidates,proposals,batchText,annotationText,annotationPin,investigation,mode:count===1?'SINGLE_UNTRUSTED_PROPOSAL':'ALL_DECLARED_ALTERNATIVES',decisionAuthority:'NONE',qualification:CHANGE_QUAL});
}

/** Portable replay projection: independently pinned contract and plan are still mandatory. */
export async function exportReviewedQuestion(contractText,contractPin,planText,planPin){
 const result=await compileReviewedQuestion(contractText,contractPin,planText,planPin);
 const fields=result.version===CHANGE_VERSION?['change','baseline','current','threshold','relation']:['left','relation','right'];
 const projection=Object.fromEntries(['version','contractDigest','planDigest','originalQuestion','grammar',...fields,'candidates','proposals','mode','decisionAuthority','qualification'].map(k=>[k,result[k]]));
 const bundleText=JSON.stringify({contractText,contractDigest:contractPin,planText,planDigest:planPin,result:projection});
 const byteLength=new TextEncoder().encode(bundleText).length;
 const portable=byteLength<=262144;
 return freeze({result,bundleText:portable?bundleText:null,snapshotPin:portable?await casePin(bundleText):null,byteLength,portable});
}
