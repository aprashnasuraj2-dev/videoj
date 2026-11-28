// Bounded structural/contextual semantic review. This module does not compile answers or grant authority.
export const VERSION='sutra-semantic-context-analyzer/v1';
export const FAMILIES=Object.freeze(['entity_identity','metric_definition','numerator','denominator','reporting_period','population','geography','units','scaling','sign','absolute_vs_relative','percentage_vs_percentage_point','aggregation','negation_scope','quantifier_scope','conditional_scope','baseline_selection','measurement_assumptions','modality','causal_vs_observational']);
const INVISIBLE=/[\u200b\u200c\u200d\u2060\ufeff]/u;
const INJECTION=/\b(?:ignore|disregard|override|bypass)\b.{0,32}\b(?:instruction|rule|policy|prompt|guard|system|developer)\b|\b(?:system|developer)\s+(?:prompt|message)\b/i;
const RELATION='(?:not greater than|not less than|no more than|no less than|greater than|higher than|less than|lower than|at least|at most|equal to)';
const COMPUTATIONAL_TRAILING=new RegExp('^is\\s+.+?\\s+'+RELATION+'\\s+.+?\\s+(?:because|if|unless|provided|while|although|but)\\b','i');
const MONTH='(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const ABSOLUTE_TIME=new RegExp('\\b(?:18|19|20)\\d{2}\\b|\\b'+MONTH+'\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+(?:18|19|20)\\d{2})?\\b','ig');
const RELATIVE_TIME=/\b(?:currently|current|today|tomorrow|yesterday|now|latest|newest|recently|this\s+(?:year|month|week|quarter|season)|next\s+(?:year|month|week|quarter|season|election|summer|winter)|last\s+(?:year|month|week|quarter|season|election|time)|as\s+of\s+now|so\s+far|to\s+date|former|caretaker)\b/i;
const DYNAMIC_ROLE=/\b(?:president|prime\s+minister|governor|mayor|ceo|chair(?:person|man)?|captain|coach|director|manager|leader|owner|principal|commander|head\s+of|job\s+title|works?\s+for|member\s+of|cabinet|phone\s+number|fax\s+number)\b/i;
const DYNAMIC_QUANTITY=/\b(?:population|price|cost|salary|wage|revenue|sales|market\s+share|exchange\s+rate|interest\s+rate|subscribers?|students?|employees?|members?|attendance|score|points?|wins?|losses|goals?|podium\s+finishes|record|rank|ranking|percentage|percent|rate|how\s+many|how\s+much)\b/i;
const SUPERLATIVE=/\b(?:most|least|highest|lowest|largest|smallest|fastest|best|worst|top|record|only|first|last)\b/i;
const CHANGE=/\b(?:change|changed|difference|increase|increased|decrease|decreased|growth|grew|fell|rose|improve|improved|decline|declined)\b/i;
const RATIO=/\b(?:ratio|proportion|rate|percent|percentage|share)\b/i;
const QUANT=/\b(?:all|any|each|every|exactly|some|none|both|either|neither|at\s+least|at\s+most)\b/i;
const NEG=/\b(?:not|no|none|without|except|neither)\b/i;
const CONDITIONAL=/\b(?:if|unless|when|assuming|provided|only\s+if|as\s+long\s+as)\b/i;
const GEO=/\b(?:global|world|country|region|province|district|state|city|municipality|metro|metropolitan|rural|urban|market|facility|site|upstream|downstream)\b/i;
const SCALE=/\b(?:thousand|million|billion|trillion|mn|bn)\b/i;
const AGG=/\b(?:sum|total|average|mean|median|weighted|aggregate|across)\b/i;
const MEASURE=/\b(?:reported|measured|estimated|approximate|adjusted|nominal|real|raw|calibrated|observed|seasonally\s+adjusted|intention-to-treat|completers?)\b/i;
const MODAL=/\b(?:may|might|must|should|could|can|significant|likely|possible|required|rated|demonstrated)\b/i;
const CAUSAL=/\b(?:cause|caused|because|due\s+to|impact|effect|led\s+to|resulted\s+in|attribut(?:e|ed|able))\b/i;
const UNIT=/\b(?:mm|cm|m|km|kg|g|tonnes?|hours?|ms|seconds?|usd|eur|gbp|kwh|mwh|gwh|mw|gw|degrees?\s+c(?:elsius)?|percent(?:age)?\s+points?)\b/i;
const BARE_MEASURE=/\b(?:deflection|displacement|energy|output|latency|temperature|clearance|capacity|weight|length|distance|time|cost|price|salary|revenue|profit|yield|rate)\b/i;
const CONTEXT_PAIRS=Object.freeze([
 ['parent','subsidiary','entity_identity'],['metro','rural','geography'],['upstream','downstream','geography'],
 ['operating profit','net income','metric_definition'],['gross','net','metric_definition'],
 ['raw','calibrated','measurement_assumptions'],['nominal','real','measurement_assumptions'],
 ['budget','actual','baseline_selection'],['calendar','fiscal','reporting_period'],
 ['completers','intention-to-treat','population'],['weighted','unweighted','aggregation'],
 ['domestic','international','population'],['eventual','without rework','metric_definition']
]);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const signal=(family,state,reason)=>({family,state,reason,decisionAuthority:'NONE'});
const reviewState=s=>s==='REVIEW_REQUIRED'||s==='EXPLICIT_OR_REVIEW';
function textOfSources(sources){
 if(!Array.isArray(sources)||sources.length>8)return '';
 let out='';
 for(const s of sources){if(!s||typeof s.text!=='string')continue;out+=(out?'\n':'')+s.text.slice(0,16384);if(out.length>=65536)break;}
 return out.slice(0,65536);
}
function pairSignals(text){
 const q=text.toLowerCase(),out=[];
 for(const [a,b,family] of CONTEXT_PAIRS)if(q.includes(a)&&q.includes(b))out.push({family,left:a,right:b});
 return out;
}
export function analyzeSemanticContext({question,sources=[],aliasCollisions=[],typeCollisions=[]}={}){
 if(typeof question!=='string'||!question.trim()||question.length>8192)throw TypeError('SEMANTIC_CONTEXT_QUESTION');
 const q=question.replace(/\s+/g,' ').trim(),lower=q.toLowerCase(),sourceText=textOfSources(sources),sourceLower=sourceText.toLowerCase();
 const hidden=INVISIBLE.test(q),injection=INJECTION.test(q),trailing=COMPUTATIONAL_TRAILING.test(lower);
 const admission=hidden||injection||trailing?'REFUSE':'REVIEW';
 const refusalReason=hidden?'INVISIBLE_CONTROL':injection?'INSTRUCTION_INJECTION':trailing?'COMPUTATIONAL_TRAILING_CLAUSE':null;
 const absolute=[...new Set(q.match(ABSOLUTE_TIME)??[])],relative=RELATIVE_TIME.test(lower);
 const dynamicRole=DYNAMIC_ROLE.test(lower),dynamicQuantity=DYNAMIC_QUANTITY.test(lower),superlative=SUPERLATIVE.test(lower);
 const implicitDynamic=!absolute.length&&!relative&&(dynamicRole||dynamicQuantity||superlative);
 const temporalAnchor=absolute.length&&relative?'MIXED_ABSOLUTE_RELATIVE':absolute.length?'EXPLICIT_ABSOLUTE':relative?'EXPLICIT_RELATIVE':implicitDynamic?'IMPLICIT_DYNAMIC':'UNSPECIFIED';
 const contextPairs=pairSignals(sourceLower),contextFamilies=new Set(contextPairs.map(x=>x.family));
 const ratio=RATIO.test(lower),change=CHANGE.test(lower),quantifier=QUANT.test(lower),negation=NEG.test(lower),conditional=CONDITIONAL.test(lower),geo=GEO.test(lower);
 const numeric=/\b\d+(?:\.\d+)?\b/.test(lower),unit=UNIT.test(lower),aggregate=AGG.test(lower);
 const diagnostics=[];
 diagnostics.push(signal('entity_identity',aliasCollisions.length||contextFamilies.has('entity_identity')||/\b(?:he|she|they|it|former|latter|this\s+(?:person|company|group)|that\s+(?:person|company|group))\b/i.test(lower)?'REVIEW_REQUIRED':'NO_SIGNAL',aliasCollisions.length?'Declared alias has multiple bindings.':contextFamilies.has('entity_identity')?'Source context contains contrasting entity qualifiers.':'No structural entity-identity conflict detected.'));
 diagnostics.push(signal('metric_definition',typeCollisions.length||contextFamilies.has('metric_definition')?'REVIEW_REQUIRED':'NO_SIGNAL',typeCollisions.length?'Declared alias crosses binding types.':contextFamilies.has('metric_definition')?'Source context presents contrasting metric definitions.':'No structural metric-definition contrast detected.'));
 diagnostics.push(signal('numerator',ratio?'EXPLICIT_OR_REVIEW':'NO_SIGNAL',ratio?'Ratio-like construction requires a reviewed numerator.':'No ratio-like construction detected.'));
 diagnostics.push(signal('denominator',ratio?'EXPLICIT_OR_REVIEW':'NO_SIGNAL',ratio?'Ratio-like construction requires a reviewed denominator or baseline.':'No ratio-like construction detected.'));
 diagnostics.push(signal('reporting_period',temporalAnchor==='EXPLICIT_ABSOLUTE'?'EXPLICIT_OR_REVIEW':temporalAnchor==='UNSPECIFIED'?'NO_SIGNAL':'REVIEW_REQUIRED',temporalAnchor==='IMPLICIT_DYNAMIC'?'Time-varying role, quantity or ranking lacks an explicit time anchor.':temporalAnchor==='EXPLICIT_RELATIVE'?'Relative time expression requires a reference time.':temporalAnchor==='MIXED_ABSOLUTE_RELATIVE'?'Absolute and relative temporal cues coexist and require scope review.':temporalAnchor==='EXPLICIT_ABSOLUTE'?'Explicit absolute time anchor detected: '+absolute.join(', '):contextFamilies.has('reporting_period')?'Source context contrasts reporting periods.':'No temporal anchor requirement detected.'));
 if(contextFamilies.has('reporting_period')&&diagnostics.at(-1).state==='NO_SIGNAL')diagnostics[diagnostics.length-1]=signal('reporting_period','REVIEW_REQUIRED','Source context contrasts reporting periods.');
 diagnostics.push(signal('population',quantifier||/\b(?:population|customers?|users?|tickets?|shares?|participants?|students?|orders?|items?|pieces?|groups?|plants?|sites?)\b/i.test(lower)||contextFamilies.has('population')?'REVIEW_REQUIRED':'NO_SIGNAL',contextFamilies.has('population')?'Source context contrasts evaluated populations.':'Population or quantifier scope must remain explicit.'));
 diagnostics.push(signal('geography',geo||contextFamilies.has('geography')?'REVIEW_REQUIRED':'NO_SIGNAL',contextFamilies.has('geography')?'Source context contains contrasting geographic scopes.':'Geographic scope signal from the utterance.'));
 diagnostics.push(signal('units',unit?'EXPLICIT_OR_REVIEW':numeric&&BARE_MEASURE.test(lower)?'REVIEW_REQUIRED':'NO_SIGNAL',unit?'Explicit unit wording remains bound to reviewed quantities.':numeric&&BARE_MEASURE.test(lower)?'Bare numeric measurement may depend on an unstated unit.':'No unit-dependent numeric comparison detected.'));
 diagnostics.push(signal('scaling',SCALE.test(lower)?'REVIEW_REQUIRED':'NO_SIGNAL','Scale multipliers are never silently normalized.'));
 diagnostics.push(signal('sign',change&&!/\b(?:absolute|magnitude|signed)\b/i.test(lower)?'REVIEW_REQUIRED':'NO_SIGNAL','Change wording can depend on signed versus magnitude interpretation.'));
 diagnostics.push(signal('absolute_vs_relative',change&&!/\b(?:percent|percentage|relative|point|absolute|magnitude|signed)\b/i.test(lower)?'REVIEW_REQUIRED':'NO_SIGNAL','Unqualified change can denote absolute difference or relative change.'));
 diagnostics.push(signal('percentage_vs_percentage_point',/percentage\s+points?|\bpp\b/i.test(lower)?'EXPLICIT_POINTS':/\b(?:percent|percentage)\b/i.test(lower)?'EXPLICIT_RELATIVE':'NO_SIGNAL','Percent and percentage-point change remain distinct.'));
 diagnostics.push(signal('aggregation',aggregate||contextFamilies.has('aggregation')?'EXPLICIT_OR_REVIEW':'NO_SIGNAL',contextFamilies.has('aggregation')?'Source context contrasts aggregation rules.':'Aggregation method and weighting remain explicit.'));
 diagnostics.push(signal('negation_scope',negation&&(quantifier||/\b(?:and|or)\b/i.test(lower))?'REVIEW_REQUIRED':negation?'EXPLICIT_OR_REVIEW':'NO_SIGNAL','Negation is reviewed compositionally with quantifiers and conjunctions.'));
 diagnostics.push(signal('quantifier_scope',quantifier?'REVIEW_REQUIRED':'NO_SIGNAL','Quantifier scope is separated from arithmetic and entity resolution.'));
 diagnostics.push(signal('conditional_scope',conditional?'REVIEW_REQUIRED':'NO_SIGNAL','Conditional clauses define applicability and scope.'));
 diagnostics.push(signal('baseline_selection',change||/\b(?:from|versus|vs\.?|compared\s+with|relative\s+to)\b/i.test(lower)||contextFamilies.has('baseline_selection')?'EXPLICIT_OR_REVIEW':'NO_SIGNAL',contextFamilies.has('baseline_selection')?'Source context presents competing baselines.':'Change/comparison wording requires an explicit baseline.'));
 diagnostics.push(signal('measurement_assumptions',MEASURE.test(lower)||contextFamilies.has('measurement_assumptions')?'REVIEW_REQUIRED':'NO_SIGNAL',contextFamilies.has('measurement_assumptions')?'Source context contrasts measurement conventions.':'Measurement qualifiers remain obligations.'));
 diagnostics.push(signal('modality',MODAL.test(lower)?'REVIEW_REQUIRED':'NO_SIGNAL','Modal wording is not converted into probability or observed capability.'));
 diagnostics.push(signal('causal_vs_observational',CAUSAL.test(lower)?'REVIEW_REQUIRED':'NO_SIGNAL','Causal wording requires causal evidence or study design.'));
 const reviewPrompts=diagnostics.filter(x=>reviewState(x.state)).map(x=>x.family).map(f=>({
  family:f,prompt:f==='reporting_period'?'Which time point or reporting period applies?':f==='entity_identity'?'Which entity does the reference denote?':f==='metric_definition'?'Which metric definition applies?':f==='population'?'Which population is included?':f==='baseline_selection'?'Which baseline is authoritative?':f==='causal_vs_observational'?'Is the claim observational or causal?':'Confirm '+f.replaceAll('_',' ')+' before adopting a meaning.'
 }));
 return freeze({version:VERSION,admission,refusalReason,utteranceKind:/\?$/.test(q)?'QUESTION':'STATEMENT',profile:{temporalAnchor,absoluteTimeAnchors:absolute,relativeTime:relative,implicitDynamic,dynamicRole,dynamicQuantity,superlative,change,ratio,quantifier,negation,conditional,geography:geo,aggregate,sourceContextPairs:contextPairs},diagnostics,reviewPrompts,decisionAuthority:'NONE',qualification:'Deterministic structural/contextual review only. Signals identify obligations; they do not establish intended meaning, truth, causality, or executable computation.'});
}
