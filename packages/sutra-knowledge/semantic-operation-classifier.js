// Frozen question-only operation-family classifier. No gold program/answer input.
export const OPERATION_FAMILIES=Object.freeze(['SUM','MEAN','RATIO','RELATIVE_CHANGE','DIFFERENCE','UNSUPPORTED']);
export function classifySemanticOperation(question){
 if(typeof question!=='string'||!question.trim()||question.length>8192)throw TypeError('SEMANTIC_BENCH_QUESTION');
 const q=question.toLowerCase().replace(/\s+/g,' ').trim();let family='UNSUPPORTED',reason='No supported operation-family cue.';
 if(/\b(average|mean)\b/.test(q)){family='MEAN';reason='Explicit average/mean wording.';}
 else if(/\b(percent(?:age)?\s+(?:change|growth)|percentage\s+growth|percent\s+did\b.*\bincrease|what\s+percent\s+did\b.*\bincrease)\b/.test(q)){family='RELATIVE_CHANGE';reason='Explicit percent/percentage change or growth wording.';}
 else if(/\b(change|growth)\b/.test(q)&&/\b(from|between)\b/.test(q)&&!/\b(percent|percentage)\b/.test(q)){family='DIFFERENCE';reason='Non-percentage change wording.';}
 else if(/\b(sum of|how many total|total\s+.+\s+would|combined total)\b/.test(q)){family='SUM';reason='Explicit sum/total construction.';}
 else if(/\b(ratio|proportion|per\s+common\s+share|per\s+share|for each|percent of|percentage of|what percent|what percentage)\b/.test(q)){family='RATIO';reason='Explicit ratio/per/percent-of construction.';}
 return Object.freeze({version:'sutra-question-operation-family/v1',family,reason,decisionAuthority:'NONE'});
}
