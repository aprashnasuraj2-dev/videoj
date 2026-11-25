// Conditional Fisher exact test of a reviewed two-group binary table.
// No randomization, sampling, causal or clinical authority is inferred.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {compileReviewedProposal} from './reviewed-claim-compiler.js';
export const VERSION='sutra-reviewed-fisher/v1';
export const FISHER_DESIGN=Object.freeze(['binaryOutcome','distinctGroups','independentObservations','comparableOutcomeDefinition','samplingOrAssignment','selectionAndMissingness','hypothesisPrespecified','multiplicityFamilyComplete','confoundingAndApplicability']);
const fail=x=>{throw TypeError('FISHER_'+x);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function fraction(n,d){let a=n<0n?-n:n,b=d;while(b)[a,b]=[b,a%b];return (n/a)+'/'+(d/a);}
function choose(n,k){if(k<0||k>n)return 0n;k=Math.min(k,n-k);let c=1n;for(let i=1;i<=k;i++)c=c*BigInt(n-k+i)/BigInt(i);return c;}
function count(b){
 if(!b||b.type.kind!=='count'||b.type.dimension.some(Boolean)||b.span.origin!=='source_assertion'||!/^(?:0|[1-9]\d*)\/1$/.test(b.value))fail('COUNT_BINDING');
 const n=BigInt(b.value.split('/')[0]);if(n>256n)fail('SAMPLE_LIMIT');return Number(n);
}
const groupKeys=['successBinding','trialBinding'];
export async function evaluateReviewedFisher(versionText,versionPin,planText,planPin){
 if(typeof planPin!=='string'||await casePin(planText)!==planPin)fail('PIN');
 const replay=await replayInvestigationVersion(versionText,versionPin),v=parse(versionText,6),batch=parse(v.batchText,5),p=parse(planText,6);
 if(!keys(p,['version','versionDigest','groupA','groupB','alternative','familyAlpha','familySize','design'])||p.version!==1||p.versionDigest!==versionPin||
 !['greater','less','two-sided-probability-order'].includes(p.alternative)||!Number.isSafeInteger(p.familySize)||p.familySize<1||p.familySize>1000||
 !keys(p.groupA,groupKeys)||!keys(p.groupB,groupKeys)||!keys(p.design,FISHER_DESIGN)||FISHER_DESIGN.some(k=>!['DECLARED_NOT_VERIFIED','UNRESOLVED'].includes(p.design[k])))fail('PLAN');
 const ids=[p.groupA.successBinding,p.groupA.trialBinding,p.groupB.successBinding,p.groupB.trialBinding];
 if(ids.some(x=>typeof x!=='string')||new Set(ids).size!==4)fail('BINDING_IDENTITY');
 const first=replay.investigation.candidates.find(c=>c.admission==='ADMITTED');if(!first)fail('NO_ADMITTED_CANDIDATE');
 const compiled=await compileReviewedProposal(v.contractText,v.contractPin,batch.proposals.find(c=>c.id===first.id).proposalText);
 const bindings=ids.map(id=>compiled.bindings.find(b=>b.id===id)),[ka,na,kb,nb]=bindings.map(count);
 if(!na||!nb||ka>na||kb>nb||na+nb>256)fail('SAMPLE_COUNTS');
 // Group-specific scopes must be internally consistent and distinct.
 // Different declared scope labels cannot establish actual disjoint populations.
 const [a,an,b,bn]=bindings;
 if(JSON.stringify(a.type)!==JSON.stringify(an.type)||JSON.stringify(b.type)!==JSON.stringify(bn.type)||
 a.type.scope===b.type.scope||a.type.unit!==b.type.unit)fail('COUNT_SCOPE');
 // Four IDs alone are insufficient: reject aliases or overlapping text spans.
 for(let i=0;i<bindings.length;i++)for(let j=i+1;j<bindings.length;j++){
  const x=bindings[i].span,y=bindings[j].span;
  if(x.sourceId===y.sourceId&&x.start<y.end&&y.start<x.end)fail('OVERLAPPING_SPANS');
 }
 if(typeof p.familyAlpha!=='string'||!/^(?:0|[1-9]\d{0,6})\/[1-9]\d{0,6}$/.test(p.familyAlpha))fail('ALPHA');
 const [alphaNum,alphaDen]=p.familyAlpha.split('/').map(BigInt);
 if(alphaNum<=0n||alphaNum>=alphaDen||alphaDen>1000000n)fail('ALPHA');
 const n=na+nb,k=ka+kb,lo=Math.max(0,k-nb),hi=Math.min(na,k);
 const den=choose(n,k),observed=choose(na,ka)*choose(nb,k-ka);
 let tail=0n,total=0n;
 for(let x=lo;x<=hi;x++){
  const weight=choose(na,x)*choose(nb,k-x);total+=weight;
  if(p.alternative==='greater'?x>=ka:p.alternative==='less'?x<=ka:weight<=observed)tail+=weight;
 }
 if(total!==den)fail('MASS_CONSERVATION');
 const unresolved=FISHER_DESIGN.filter(x=>p.design[x]==='UNRESOLVED');
 return freeze({version:VERSION,versionDigest:versionPin,planDigest:planPin,
  groupA:{successes:ka,trials:na,successBinding:a.id,trialBinding:an.id,declaredScope:a.type.scope},
  groupB:{successes:kb,trials:nb,successBinding:b.id,trialBinding:bn.id,declaredScope:b.type.scope},
  alternative:p.alternative,observedProportionA:fraction(BigInt(ka),BigInt(na)),observedProportionB:fraction(BigInt(kb),BigInt(nb)),
  observedDifferenceAminusB:fraction(BigInt(ka*nb-kb*na),BigInt(na*nb)),
  feasibleTables:hi-lo+1,observedTableProbability:fraction(observed,den),exactConditionalTail:fraction(tail,den),
  familyAlpha:fraction(alphaNum,alphaDen),familySize:p.familySize,perTestAlpha:fraction(alphaNum,alphaDen*BigInt(p.familySize)),
  mathematicalThreshold:tail*alphaDen*BigInt(p.familySize)<=alphaNum*den?'TAIL_AT_OR_BELOW_DECLARED_THRESHOLD':'TAIL_ABOVE_DECLARED_THRESHOLD',
  design:Object.fromEntries(FISHER_DESIGN.map(k=>[k,p.design[k]])),unresolvedDesign:unresolved,
  interpretation:unresolved.length?'DESIGN_UNRESOLVED_CONDITIONAL_CALCULATION_ONLY':'DECLARED_MODEL_ONLY_NOT_INDEPENDENTLY_VERIFIED',
  decisionAuthority:'NONE',qualification:'Exact conditional hypergeometric probability under the declared equal-odds null with fixed margins. Two-sided means probability ordering including ties, not twice a one-sided tail. Distinct spans and declared scopes do not establish disjoint samples, common outcome definition, exchangeability, sampling, randomization, independence, absence of confounding or causal applicability. The observed difference is descriptive only. Bonferroni uses declared family size; completeness is not verified. No hypothesis truth, practical effect, clinical or external action authority.'});
}
