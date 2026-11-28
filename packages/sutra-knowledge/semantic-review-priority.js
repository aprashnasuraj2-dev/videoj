// Experimental diagnostic only; the rejected heuristic cannot reorder review. No probability, semantic verdict, or authority is generated.
const REVIEW=new Set(['REVIEW_REQUIRED','EXPLICIT_OR_REVIEW']);
const SOURCE_FAMILIES={entity_identity:'entityIdentity',numerator:'numerator',reporting_period:'reportingPeriod',units:'units',scaling:'scaling',sign:'sign',percentage_vs_percentage_point:'percentageConvention',baseline_selection:'baseline',measurement_assumptions:'measurement',causal_vs_observational:'causality'};
export function prioritizeSemanticReview({diagnostics,profile,aliasCollisions=[],typeCollisions=[],admission}){
 const contrast=new Set(profile.sourceContextPairs.map(x=>x.family)),flags=profile.sourceContextFlags,temporal=profile.temporalEvidence;
 const rows=diagnostics.filter(x=>REVIEW.has(x.state)).map(x=>{
  const family=x.family,grounds=[];
  if(contrast.has(family)||flags[SOURCE_FAMILIES[family]]===true)grounds.push('SOURCE_CONTRAST_CUE');
  if(family==='entity_identity'&&aliasCollisions.length)grounds.push('QUESTION_LINKED_ALIAS_COLLISION');
  if(family==='metric_definition'&&typeCollisions.length)grounds.push('QUESTION_LINKED_TYPE_COLLISION');
  if(family==='reporting_period'&&temporal.sourcePeriodContrast)grounds.push('QUESTION_LINKED_PERIOD_CONTRAST');
  if(family==='reporting_period'&&temporal.invalidDate)grounds.push('INVALID_DATE');
  if(family==='quantifier_scope'&&profile.scopeInteraction)grounds.push('OVERLAPPING_SCOPE_OPERATORS');
  if(family==='negation_scope'&&profile.negation&&profile.scopeInteraction)grounds.push('NEGATION_WITH_SCOPE_OPERATORS');
  if(family==='conditional_scope'&&profile.conditional&&profile.negation)grounds.push('CONDITION_WITH_NEGATION');
  if(family==='absolute_vs_relative'&&profile.change&&profile.ratio)grounds.push('CHANGE_AND_RATIO_INTERACTION');
  return {family,priority:grounds.length?'FIRST_PASS':'STANDARD_REVIEW',grounds,decisionAuthority:'NONE'};
 });
 const first=rows.filter(r=>r.priority==='FIRST_PASS').length;
 return {status:admission==='REFUSE'?'REFUSED':'REVIEW_REQUIRED',firstPassCount:first,standardCount:rows.length-first,policy:'DIAGNOSTIC_ONLY_NOT_ADOPTED',rows,decisionAuthority:'NONE',qualification:'Records experimental structural or source contrast cues in original diagnostic order; does not prioritize or remove any mandatory review obligation. FIRST_PASS is not a calibrated ambiguity probability; STANDARD_REVIEW is not evidence of unambiguity.'};
}
