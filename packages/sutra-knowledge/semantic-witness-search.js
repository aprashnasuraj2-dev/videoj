// Deterministic bounded search over synthetic single-binding changes, not possible-world completeness.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {compileReviewedProposal} from './reviewed-claim-compiler.js';
import {challengeSemanticInterpretations} from './semantic-counterfactual.js';
export const VERSION='sutra-semantic-witness-search/v1';
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const LIMIT=16;
function normalized(n,d){let a=n<0n?-n:n,b=d;while(b){[a,b]=[b,a%b];}return (n/a)+'/'+(d/a);}
function perturb(value){
 const [n,d]=value.split('/').map(BigInt);
 // Zero and twice the observed quantity; use +/- one unit for a zero baseline.
 // These are algebraic stress cases only and may be physically impossible.
 return n===0n?['1/1','-1/1']:['0/1',normalized(2n*n,d)];
}
const sort=(a,b)=>a<b?-1:a>b?1:0;
export async function searchSemanticWitnesses(versionText,expectedPin,{maxScenarios=LIMIT}={}){
 if(!Number.isSafeInteger(maxScenarios)||maxScenarios<1||maxScenarios>LIMIT)throw RangeError('WITNESS_BUDGET');
 const v=await replayInvestigationVersion(versionText,expectedPin),raw=parse(versionText,6),batch=parse(raw.batchText,5);
 const contrast=v.investigation.triage.contrast;
 const eligible=contrast.pairs.filter(p=>p.stateRelation==='SAME_CONDITIONAL_STATE'&&p.expressionRelation==='DIFFERENT_STRUCTURE_NOT_PROVEN_EQUIVALENT');
 const ids=new Set(eligible.flatMap(p=>[p.left,p.right]));
 const entries=new Map(contrast.entries.map(e=>[e.id,e]));
 const unique=new Set(eligible.flatMap(p=>[...p.bindingRelation.onlyLeft,...p.bindingRelation.onlyRight]));
 const all=new Set([...ids].flatMap(id=>entries.get(id).computation.bindingIds));
 const ranked=[...all].sort((a,b)=>Number(unique.has(b))-Number(unique.has(a))||sort(a,b));
 const base={version:VERSION,versionDigest:expectedPin,maxScenarios,eligiblePairs:eligible.map(p=>({left:p.left,right:p.right})),rankedBindings:ranked,
  policy:'PRIORITIZE_DIFFERENTIAL_BINDINGS_ZERO_DOUBLE_OR_ZERO_PLUS_MINUS_ONE',decisionAuthority:'NONE',
  qualification:'Only supplied agreeing, structurally different decisive programs and finite synthetic single-binding perturbations are searched. No physical feasibility, source revision, semantic correctness, completeness, or external authority.'};
 if(!ranked.length)return freeze({...base,status:'NO_ELIGIBLE_BINDING',possibleScenarioCount:0,evaluatedScenarioCount:0,truncated:false,planText:null,planDigest:null,witnesses:[],result:null});
 const first=batch.proposals.find(p=>ids.has(p.id));
 const compiled=await compileReviewedProposal(raw.contractText,raw.contractPin,first.proposalText);
 const bindings=new Map(compiled.bindings.map(b=>[b.id,b]));
 // Breadth-first by probe: each ranked binding receives the first perturbation
 // before a second perturbation is considered, within the same bounded budget.
 const probes=ranked.map(id=>({id,values:perturb(bindings.get(id).value)}));
 const candidates=[];
 for(let j=0;j<2;j++)for(const p of probes)candidates.push({replacements:[{bindingId:p.id,value:p.values[j]}]});
 const scenarios=candidates.slice(0,maxScenarios).map((s,i)=>({id:'scenario_'+String(i+1).padStart(2,'0'),...s}));
 const planText=JSON.stringify({version:1,contractDigest:raw.contractPin,batchDigest:await casePin(raw.batchText),scenarios}),planDigest=await casePin(planText);
 const result=await challengeSemanticInterpretations(raw.contractText,raw.contractPin,raw.batchText,raw.annotationText,raw.annotationPin,planText,planDigest);
 const pairs=new Set(eligible.map(p=>p.left+'|'+p.right)),witnesses=[];
 for(const scenario of result.scenarios)for(const w of scenario.witnesses)if(pairs.has(w.left+'|'+w.right))witnesses.push({scenarioId:scenario.id,replacements:scenario.replacements,...w});
 return freeze({...base,status:witnesses.length?'DISTINGUISHING_SCENARIO_FOUND':'NO_WITNESS_IN_SEARCHED_SCENARIOS',possibleScenarioCount:candidates.length,evaluatedScenarioCount:scenarios.length,
 truncated:scenarios.length<candidates.length,planText,planDigest,witnesses,result});
}
