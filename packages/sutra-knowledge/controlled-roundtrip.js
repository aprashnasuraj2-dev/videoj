// Controlled-language reconstruction of admitted computation, not an NL equivalence oracle.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {compileReviewedProposal} from './reviewed-claim-compiler.js';
import {casePin} from './pinned-investigation.js';
import {FACETS} from './semantic-investigation.js';
export const VERSION='sutra-controlled-roundtrip/v1';
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const canonical=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canonical).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
const operators={add:'plus',sub:'minus',mul:'multiplied by',div:'divided by',eq:'equals',lt:'is less than',le:'is at most',gt:'is greater than',ge:'is at least'};
function reconstruct(c){
 const nodes=new Map(c.nodes.map(n=>[n.id,n])),bindings=new Map(c.bindings.map(b=>[b.id,b])),seen=new Set(),steps=[];
 function visit(id){
  if(seen.has(id))return;const n=nodes.get(id);if(!n)throw Error('ROUNDTRIP_NODE');
  for(const a of n.args??[])visit(a);
  seen.add(id);
  let statement,source=null;
  if(n.kind==='input'){
   const b=bindings.get(n.bindingId);
   statement=n.id+' is the reviewed numeric token '+JSON.stringify(b.span.quote)+' ('+b.type.unit+'; '+b.type.kind+'; declared scope '+b.type.scope+').';
   source={bindingId:b.id,span:b.span,exactValue:b.value,declaredType:b.type};
  }else if(n.kind==='unknown'){
   statement=n.id+' requires an unavailable input. Declared reason: '+JSON.stringify(n.reason)+'.';
  }else{
   statement=n.kind==='derive'?n.id+' is '+n.args[0]+' '+operators[n.op]+' '+n.args[1]+'.':'Test whether '+n.args[0]+' '+operators[n.op]+' '+n.args[1]+'.';
  }
  steps.push({id:n.id,kind:n.kind,operator:n.op??null,arguments:n.args??[],statement,source,status:n.status,outcome:n.receipt?.outcome??null,missing:n.missing,typeBlockers:n.typeBlockers});
 }
 visit(c.target.id);
 return {targetId:c.target.id,targetStatus:c.target.status,steps,excludedNodeIds:c.nodes.filter(n=>!seen.has(n.id)).map(n=>n.id)};
}
export async function renderInvestigationRoundtrip(versionText,expectedPin){
 const replay=await replayInvestigationVersion(versionText,expectedPin),v=parse(versionText,6),b=parse(v.batchText,5);
 const proposals=new Map(b.proposals.map(p=>[p.id,p.proposalText])),q=replay.investigation.originalQuestion,raw=enc.encode(q.text);
 const candidates=[];
 for(const candidate of replay.investigation.candidates){
  const span=candidate.questionSpan;
  const questionSelection=span?{selected:span.quote,unselectedPrefix:dec.decode(raw.slice(0,span.start)),unselectedSuffix:dec.decode(raw.slice(span.end)),coverage:candidate.questionCoverage}:null;
  const computation=candidate.admission==='ADMITTED'?reconstruct(await compileReviewedProposal(v.contractText,v.contractPin,proposals.get(candidate.id))):null;
  const qualifiers=FACETS.map(facet=>({facet,...candidate.facets[facet]}));
  candidates.push({id:candidate.id,proposedMeaning:candidate.meaning,admission:candidate.admission,questionSelection,computation,qualifiers,
   review:{unselectedQuestionText:candidate.questionCoverage==='PARTIAL_QUESTION_SPAN',unspecifiedFacets:qualifiers.filter(x=>x.status==='UNSPECIFIED').map(x=>x.facet),unsupportedFacets:qualifiers.filter(x=>x.status==='UNSUPPORTED_DECLARATION').map(x=>x.facet),meaning:'UNVERIFIED',entailment:'UNVERIFIED',method:'UNVERIFIED'}});
 }
 const differences=[];
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
  const a=candidates[i],b=candidates[j],facets=[];
  for(let k=0;k<FACETS.length;k++){
   const x=a.qualifiers[k],y=b.qualifiers[k];
   if(canonical(x)!==canonical(y))facets.push(FACETS[k]);
  }
  // Compare target DAG instructions, not coincidentally equal numeric outputs.
  const shape=x=>x.computation?x.computation.steps.map(s=>({id:s.id,kind:s.kind,operator:s.operator,arguments:s.arguments,binding:s.source?.bindingId??null})):null;
  differences.push({left:a.id,right:b.id,declaredQualifierDifferences:facets,selectedQuestionDiffers:canonical(a.questionSelection)!==canonical(b.questionSelection),instructionStructureDiffers:canonical(shape(a))!==canonical(shape(b)),interpretationEquivalence:'NOT_ESTABLISHED'});
 }
 return freeze({version:VERSION,versionDigest:expectedPin,originalQuestion:q,candidates,differences,triage:replay.investigation.triage.state,decisionAuthority:'NONE',qualification:'Controlled language describes admitted instructions, not the intended meaning or truth of the original question. Unselected bytes and unspecified facets are review prompts, not automatic semantic omissions. Structural differences do not establish semantic inequivalence. Supplied candidates only.'});
}

export async function exportInvestigationRoundtrip(versionText,versionPin){
 const result=await renderInvestigationRoundtrip(versionText,versionPin),bundleText=JSON.stringify({versionText,versionDigest:versionPin,result});
 const byteLength=enc.encode(bundleText).length;
 return freeze({result,bundleText,snapshotPin:await casePin(bundleText),byteLength,portable:byteLength<=262144});
}
