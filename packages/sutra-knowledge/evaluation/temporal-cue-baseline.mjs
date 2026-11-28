// Evaluation-only, selective temporal-cue baseline; not the kernel or an authority signal.
// Heuristics were authored after observing public dataset examples; these are development results, not held-out performance.
export function temporalCueBaseline(question) {
  if(typeof question!=="string"||!question.trim()||question.length>2048)return {state:"ABSTAIN",reason:"INVALID_OR_OVERSIZE"};
  const q=question.toLowerCase();
  const year=/\b(?:18|19|20)\d{2}\b/.test(q);
  const relative=/\b(?:currently|current|today|tomorrow|yesterday|now|latest|newest|recently|this (?:year|month|week)|next (?:year|month|week|season|election|summer|winter)|last (?:year|month|week|season|election|time)|as of now|so far|to date)\b/.test(q);
  const role=/\b(?:who|what)\b.{0,35}\b(?:is|are)\b.{0,60}\b(?:president|prime minister|governor|mayor|ceo|chairperson|chairman|captain|coach|director|manager|leader|owner|job title|head of)\b/.test(q);
  const quantity=/\b(?:how much|how many|what (?:is|are) the)\b.{0,80}\b(?:cost|price|salary|population|employees|members|subscribers|students|exchange rate|interest rate|worth|revenue|market share)\b/.test(q);
  const record=/\b(?:most|highest|lowest|largest|smallest|fastest|record for)\b.{0,70}\b(?:goals|wins|points|population|sales|revenue|attendance|titles|awards|score|price|finishes|record|episodes)\b/.test(q);
  const timeDependent=relative||role||quantity||record;
  if(year&&timeDependent)return {state:"ABSTAIN",reason:"MIXED_ANCHOR_AND_DYNAMIC_CUE"};
  if(year)return {state:"PREDICT_UNAMBIGUOUS",reason:"EXPLICIT_YEAR_BASELINE"};
  if(relative)return {state:"PREDICT_AMBIGUOUS",reason:"RELATIVE_TIME_CUE"};
  if(role)return {state:"PREDICT_AMBIGUOUS",reason:"TIME_VARYING_ROLE_CUE"};
  if(quantity)return {state:"PREDICT_AMBIGUOUS",reason:"TIME_VARYING_QUANTITY_CUE"};
  if(record)return {state:"PREDICT_AMBIGUOUS",reason:"TIME_VARYING_RECORD_CUE"};
  return {state:"ABSTAIN",reason:"NO_DECLARED_TEMPORAL_CUE"};
}
