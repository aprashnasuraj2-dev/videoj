// Development-only selective temporal ambiguity classifier v2.
// Rules are frozen from public-corpus development analysis; results are not model-unseen held-out accuracy.
import {analyzeSemanticContext} from '../semantic-context-analyzer.js';
export const VERSION='sutra-temporal-selector/v2';
const CONTACT=/\b(?:phone|fax)\s+number\b/i,JOB=/\bjob\s+title\b/i,POP=/\bpopulation\b/i;
const PERCENT=/\b(?:what\s+percentage|what\s+percent|percentage\s+of|percent\s+of)\b/i;
const COST=/\b(?:how\s+much\s+(?:does|do|did|is|was)|cost|price|salary|wage|worth)\b/i;
const ROLE=/\b(?:who|what)\s+(?:is|are)\b.{0,60}\b(?:president|prime\s+minister|governor|mayor|ceo|chair(?:person|man)?|captain|coach|director|manager|leader|owner|principal|commander|head\s+of)\b/i;
const RANK=/\b(?:has|have|who\s+has|who\s+have|scored|won)\b.{0,60}\b(?:most|highest|lowest|record|points?|goals?|wins?|podium|rank|ranking)\b/i;
const HOW_MANY=/\bhow\s+many\b.{0,60}\b(?:students?|employees?|members?|subscribers?|people|shelters?|points?|goals?|wins?|tickets?|orders?|sites?|users?|customers?)\b/i;
const freeze=x=>Object.freeze(x);
export function classifyTemporalAmbiguity(question){
 const a=analyzeSemanticContext({question}),p=a.profile,q=question.toLowerCase();
 if(a.admission!=='REVIEW')return freeze({version:VERSION,state:'ABSTAIN',reason:'REFUSED_INPUT',decisionAuthority:'NONE'});
 if(p.temporalAnchor==='MIXED_ABSOLUTE_RELATIVE')return freeze({version:VERSION,state:'ABSTAIN',reason:'MIXED_ABSOLUTE_RELATIVE',decisionAuthority:'NONE'});
 if(p.temporalAnchor==='EXPLICIT_ABSOLUTE')return freeze({version:VERSION,state:'PREDICT_UNAMBIGUOUS',reason:'EXPLICIT_ABSOLUTE_ANCHOR',decisionAuthority:'NONE'});
 if(p.temporalAnchor==='EXPLICIT_RELATIVE')return freeze({version:VERSION,state:'PREDICT_AMBIGUOUS',reason:'RELATIVE_REFERENCE_TIME_REQUIRED',decisionAuthority:'NONE'});
 const rules=[[CONTACT,'CONTACT_STATE'],[JOB,'ROLE_TITLE_STATE'],[POP,'POPULATION_STATE'],[PERCENT,'PERCENTAGE_STATE'],[ROLE,'PRESENT_ROLE_STATE'],[RANK,'RANKING_RECORD_STATE'],[HOW_MANY,'DYNAMIC_COUNT_STATE'],[COST,'PRICE_OR_VALUE_STATE']];
 for(const [re,reason] of rules)if(re.test(q))return freeze({version:VERSION,state:'PREDICT_AMBIGUOUS',reason,decisionAuthority:'NONE'});
 return freeze({version:VERSION,state:'ABSTAIN',reason:p.temporalAnchor==='IMPLICIT_DYNAMIC'?'LOW_CONFIDENCE_IMPLICIT_DYNAMIC':'NO_SELECTIVE_TEMPORAL_RULE',decisionAuthority:'NONE'});
}
