// Exact one-sided binomial tail under a DECLARED sampling model, not a truth verdict.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {compileReviewedProposal} from './reviewed-claim-compiler.js';
export const VERSION='sutra-reviewed-binomial/v1';
export const DESIGN_OBLIGATIONS=Object.freeze(['binaryOutcome','fixedSampleSize','independentTrials','commonProbability','selectionAndMissingness','hypothesisPrespecified','multiplicityFamilyComplete']);
const fail=x=>{throw TypeError('BINOMIAL_'+x);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
function fraction(n,d){let a=n,b=d;while(b)[a,b]=[b,a%b];return [n/a,d/a];}
function probability(s){
 if(typeof s!=='string'||!/^(?:0|[1-9]\d{0,6})\/[1-9]\d{0,6}$/.test(s))fail('PROBABILITY');
 const [n,d]=s.split('/').map(BigInt);if(n>d||d>1000000n)fail('PROBABILITY');
 return fraction(n,d);
}
const text=x=>x[0]+'/'+x[1];
const le=(a,b)=>a[0]*b[1]<=b[0]*a[1];
function count(b){
 if(!b||b.type.kind!=='count'||b.type.dimension.some(Boolean)||b.span.origin!=='source_assertion'||! /^(?:0|[1-9]\d*)\/1$/.test(b.value))fail('COUNT_BINDING');
 const n=BigInt(b.value.split('/')[0]);if(n>256n)fail('SAMPLE_LIMIT');return Number(n);
}
function tail(n,k,p,side){
 // Sum integer masses over the common denominator d^n. No float rounding.
 const [a,d]=p,b=d-a,N=BigInt(n);let choose=1n,sum=0n;
 for(let i=0;i<=n;i++){
  if(side==='greater'?i>=k:i<=k)sum+=choose*a**BigInt(i)*b**(N-BigInt(i));
  if(i<n)choose=choose*BigInt(n-i)/BigInt(i+1);
 }
 return fraction(sum,d**N);
}
export async function evaluateReviewedBinomial(versionText,versionPin,planText,planPin){
 if(typeof planPin!=='string'||await casePin(planText)!==planPin)fail('PIN');
 const replay=await replayInvestigationVersion(versionText,versionPin),v=parse(versionText,6),batch=parse(v.batchText,5),p=parse(planText,6);
 if(!keys(p,['version','versionDigest','successBinding','trialBinding','nullProbability','alternative','familyAlpha','familySize','design'])||p.version!==1||p.versionDigest!==versionPin||!['greater','less'].includes(p.alternative)||!Number.isSafeInteger(p.familySize)||p.familySize<1||p.familySize>1000||!keys(p.design,DESIGN_OBLIGATIONS)||DESIGN_OBLIGATIONS.some(k=>!['DECLARED_NOT_VERIFIED','UNRESOLVED'].includes(p.design[k])))fail('PLAN');
 if(typeof p.successBinding!=='string'||typeof p.trialBinding!=='string'||p.successBinding===p.trialBinding)fail('BINDING');
 const first=replay.investigation.candidates.find(c=>c.admission==='ADMITTED');if(!first)fail('NO_ADMITTED_CANDIDATE');
 const compiled=await compileReviewedProposal(v.contractText,v.contractPin,batch.proposals.find(c=>c.id===first.id).proposalText);
 const success=compiled.bindings.find(b=>b.id===p.successBinding),trials=compiled.bindings.find(b=>b.id===p.trialBinding);
 const k=count(success),n=count(trials);
 if(n===0||k>n||JSON.stringify(success.type)!==JSON.stringify(trials.type))fail('COUNT_SCOPE');
 // Binding identity and declared scope are checked. Subset relation, sampling,
 // independence, missingness and real population are NOT inferred from text.
 const nullP=probability(p.nullProbability),alpha=probability(p.familyAlpha);if(alpha[0]===0n||alpha[0]===alpha[1])fail('ALPHA');
 const threshold=fraction(alpha[0],alpha[1]*BigInt(p.familySize)),value=tail(n,k,nullP,p.alternative);
 const unresolved=DESIGN_OBLIGATIONS.filter(x=>p.design[x]==='UNRESOLVED');
 return freeze({version:VERSION,versionDigest:versionPin,planDigest:planPin,
  counts:{successes:k,trials:n,successBinding:success.id,trialBinding:trials.id,declaredScope:success.type.scope},nullProbability:text(nullP),alternative:p.alternative,
  observedProportion:text(fraction(BigInt(k),BigInt(n))),exactOneSidedTail:text(value),familyAlpha:text(alpha),familySize:p.familySize,perTestAlpha:text(threshold),
  mathematicalThreshold:le(value,threshold)?'TAIL_AT_OR_BELOW_DECLARED_THRESHOLD':'TAIL_ABOVE_DECLARED_THRESHOLD',
  design:Object.fromEntries(DESIGN_OBLIGATIONS.map(k=>[k,p.design[k]])),unresolvedDesign:unresolved,
  interpretation:unresolved.length?'DESIGN_UNRESOLVED_CONDITIONAL_CALCULATION_ONLY':'DECLARED_MODEL_ONLY_NOT_INDEPENDENTLY_VERIFIED',
  decisionAuthority:'NONE',qualification:'Exact inclusive one-sided binomial tail under a declared fixed-n common-probability independent-trial null model. Bonferroni threshold uses the caller-declared family size; completeness is not verified. Tail probability is not the probability the hypothesis is true; threshold crossing is not causal, practical, clinical, or generalizable evidence. Source truth, numerator subset relation, design, selection, missingness, prespecification, multiplicity, power and applicability are not established.'});
}
