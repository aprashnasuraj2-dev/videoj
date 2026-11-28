// Score only externally supplied adjudicated labels and already frozen predictions.
// The gate reports numerical eligibility, never authenticates reviewer identity or grants release authority.
import {AMBIGUITY_FAMILIES} from './semantic-question-engine.js';
const fail=()=>{throw TypeError('SEMANTIC_READINESS_RECORD');};
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const pin=s=>typeof s==='string'&&/^sha256:[a-f0-9]{64}$/.test(s);
const identifier=s=>typeof s==='string'&&s.length>0&&s.length<=160&&/^[A-Za-z0-9_.:-]+$/.test(s);
const fraction=(a,b)=>b?a/b:null;
export const READINESS_TARGETS=Object.freeze({cases:500,scenarios:100,recall:.95,precision:.85,temporalRecall:.90,maxResolvedError:.01,minCoverage:.8,maxErrorUpper95:.02});
function upper95(errors,n){if(!n)return null;const p=errors/n,z=1.959963984540054,zz=z*z;return (p+zz/(2*n)+z*Math.sqrt(p*(1-p)/n+zz/(4*n*n)))/(1+zz/n);}
export function scoreSemanticReadiness({labels,predictions,independentAttestationPin=null}={}){
 if(!Array.isArray(labels)||!Array.isArray(predictions)||!labels.length||labels.length>30000||labels.length!==predictions.length||independentAttestationPin!==null&&!pin(independentAttestationPin))fail();
 const by=new Map(),groups=new Set(),families=new Set();let ambiguous=0,unambiguous=0;
 for(const x of labels){
  if(!exact(x,['id','scenario','family','ambiguous','reviewReceiptPins','adjudicationPin'])||!identifier(x.id)||by.has(x.id)||!identifier(x.scenario)||!(x.family===null||AMBIGUITY_FAMILIES.includes(x.family))||typeof x.ambiguous!=='boolean'||x.ambiguous!==(x.family!==null)||!Array.isArray(x.reviewReceiptPins)||x.reviewReceiptPins.length!==2||new Set(x.reviewReceiptPins).size!==2||!x.reviewReceiptPins.every(pin)||!pin(x.adjudicationPin))fail();
  by.set(x.id,x);groups.add(x.scenario);if(x.family)families.add(x.family);if(x.ambiguous)ambiguous++;else unambiguous++;
 }
 const seen=new Set(),matrix={tp:0,tn:0,fp:0,fn:0,abstainAmbiguous:0,abstainUnambiguous:0};let temporalTotal=0,temporalHit=0,resolved=0,errors=0;
 for(const p of predictions){
  if(!exact(p,['id','prediction','judgedResolution','predictionPin'])||seen.has(p.id)||!by.has(p.id)||!['AMBIGUOUS','UNAMBIGUOUS','ABSTAIN'].includes(p.prediction)||!['CORRECT','INCORRECT','UNRESOLVED'].includes(p.judgedResolution)||!pin(p.predictionPin)||p.prediction==='ABSTAIN'&&p.judgedResolution!=='UNRESOLVED')fail();
  seen.add(p.id);const g=by.get(p.id);const k=p.prediction==='ABSTAIN'?(g.ambiguous?'abstainAmbiguous':'abstainUnambiguous'):p.prediction==='AMBIGUOUS'?(g.ambiguous?'tp':'fp'):(g.ambiguous?'fn':'tn');matrix[k]++;
  if(g.family==='reporting_period'){temporalTotal++;if(p.prediction==='AMBIGUOUS')temporalHit++;}
  if(p.judgedResolution!=='UNRESOLVED'){resolved++;if(p.judgedResolution==='INCORRECT')errors++;}
 }
 const metrics={cases:labels.length,scenarios:groups.size,ambiguityFamilies:families.size,ambiguous,unambiguous,matrix,recall:fraction(matrix.tp,ambiguous),precision:fraction(matrix.tp,matrix.tp+matrix.fp),temporalRecall:fraction(temporalHit,temporalTotal),temporalCases:temporalTotal,coverage:fraction(resolved,labels.length),resolved,errors,resolvedError:fraction(errors,resolved),resolvedErrorUpper95:upper95(errors,resolved)};
 const t=READINESS_TARGETS,checks={cases:metrics.cases>=t.cases,scenarios:metrics.scenarios>=t.scenarios,allFamilies:families.size===AMBIGUITY_FAMILIES.length,controls:unambiguous>=100,recall:metrics.recall!==null&&metrics.recall>=t.recall,precision:metrics.precision!==null&&metrics.precision>=t.precision,temporal:temporalTotal>=50&&metrics.temporalRecall>=t.temporalRecall,coverage:metrics.coverage>=t.minCoverage,error:metrics.resolvedError!==null&&metrics.resolvedError<=t.maxResolvedError&&metrics.resolvedErrorUpper95<=t.maxErrorUpper95,attestationPresent:independentAttestationPin!==null};
 return {schema:'sutra-semantic-readiness-score/v1',metrics,checks,targets:t,status:Object.values(checks).every(Boolean)?'NUMERIC_THRESHOLDS_MET_ATTESTATION_REQUIRES_EXTERNAL_VERIFICATION':'NO_GO',decisionAuthority:'NONE',qualification:'Requires externally frozen predictions and adjudicated labels. Pins are references, not proof of reviewer identity, independence, timestamps, scenario separation or truth. Confidence interval is item-level Wilson, not group-adjusted. Independent authentication and grouped uncertainty review remain mandatory.'};
}
