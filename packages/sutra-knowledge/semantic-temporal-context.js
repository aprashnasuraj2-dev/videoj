// Bounded clause-level temporal evidence. No wall-clock inference or semantic authority.
// Exact UTF-16 offsets are diagnostic, not reviewed quantity bindings.
const DATE=/(?<![\p{L}\p{N}])(?:18|19|20)\d{2}(?:-\d{2}-\d{2})?(?![\p{L}\p{N}])/gu;
const ATTACH=/\b(?:as of|effective|during|in|for|on|at|from|through|until|since|ending|ended|before|after|between|to)\s*$/i;
const IDENTIFIER=/\b(?:model|version|release|build|standard|iso|serial|part|product|route|flight|invoice|case|section|article|form|item|code|id|yearbook)\s*[-#:]?\s*$/i;
const EVENT=/\b(?:born|died|founded|established|invented|discovered|published|released|occurred|happened|signed|enacted|opened|closed)\b/i;
const STATE=/\b(?:is|are|was|were|has|have|had|holds?|held|serves?|served|owns?|owned|works?|worked|employs?|employed|sells?|sold|costs?|cost|stands?|stood|remains?|remained)\b/i;
const CHANGEABLE=/\b(?:available|eligible|legal|valid|expired|in force|in office|in stock|open|operating|married|employed|located|based|headquartered|belongs?|membership|affiliation|status|address|contact|exchange rate|market cap|capacity|subscriber count|subscription|coverage|inventory|stock|balance|reserves?|enrollment|staffing|tariff|policy|version|schedule|deadline|hours|temperature|weather|record|standings)\b/i;
const STABLE=/\b(?:atomic number|chemical symbol|square root|prime number|mathematical constant|definition of|how many sides|how many legs|number of sides|boiling point of pure water|formula for)\b/i;
const STOP=new Set('what which who where when why how is are was were has have had do does did the a an of for by at in on to from with as and or not this that these those it its their his her current now latest currently today yesterday tomorrow before after during between since until year years month months reported reports report says said total value values figure figures data source sufficient adequate meet exceeds above below'.split(' '));
function stems(s){return [...new Set((s.toLowerCase().match(/[\p{L}][\p{L}\p{M}]{2,}/gu)??[]).filter(x=>!STOP.has(x)).map(x=>x.length>4&&x.endsWith('s')?x.slice(0,-1):x))].slice(0,32);}
function anchors(text){
 return [...text.matchAll(DATE)].slice(0,32).map(m=>{const start=m.index,end=start+m[0].length,left=text.slice(Math.max(0,start-48),start),right=text.slice(end,end+24);
 const identifier=IDENTIFIER.test(left)||/^[.-]\d/.test(right)||/^\s*(?:units?|dollars?|usd|kg|mw|gw|people|customers?|tickets?|employees?|students?|votes?|points?|requests?)\b/i.test(right)||/[$€£]\s*$/.test(left);
 let kind=identifier?'IDENTIFIER_OR_QUANTITY':ATTACH.test(left)||/^(?:\s*[-–—]\s*|\s+to\s+)\d{4}\b/i.test(right)||m[0].length===10?'TEMPORAL_ATTACHMENT':'BARE_YEAR_LIKE';
 if(m[0].length===10){const d=new Date(m[0]+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==m[0])kind='INVALID_DATE';}
 return {text:m[0],start,end,kind};});
}
export function temporalContextEvidence(question,sources=[]){
 const qAnchors=anchors(question),tokens=stems(question),qSet=new Set(tokens),state=STATE.test(question),event=EVENT.test(question),changeable=CHANGEABLE.test(question),stable=STABLE.test(question),observations=[];
 let chars=0;
 for(const [i,s] of (Array.isArray(sources)?sources.slice(0,8):[]).entries()){
  if(typeof s?.text!=='string'||chars>=65536||observations.length>=32)continue;const t=s.text.slice(0,Math.min(16384,65536-chars));chars+=t.length;
  if(!/(?:18|19|20)\d{2}/.test(t))continue;
  // Sentence and semicolon boundaries, preserving decimals. Only question-linked clauses.
  for(const m of t.matchAll(/[^;\n!?]+?(?:\.(?=\s|$)|[;\n!?]|$)/gu)){
   const clause=m[0],overlap=stems(clause).filter(x=>qSet.has(x));if(!overlap.length)continue;
   for(const x of anchors(clause).filter(x=>x.kind==='TEMPORAL_ATTACHMENT')){if(observations.length>=32)break;observations.push({sourceIndex:i,sourceId:typeof s.id==='string'?s.id.slice(0,64):null,start:m.index+x.start,end:m.index+x.end,text:x.text,matchedTerms:overlap});}
   if(observations.length>=32)break;
  }
 }
 const dates=[...new Set(observations.map(x=>x.text.slice(0,4)))].sort(),attached=qAnchors.filter(x=>x.kind==='TEMPORAL_ATTACHMENT'),invalid=qAnchors.some(x=>x.kind==='INVALID_DATE');
 return {questionAnchors:qAnchors,attachedYears:attached.map(x=>x.text),sourceObservations:observations,sourceYears:dates,sourcePeriodContrast:dates.length>1,predicateKind:event&&!state?'HISTORICAL_EVENT':stable?'STABLE_FACT':state&&changeable?'CHANGEABLE_STATE':'UNRESOLVED',implicitState:state&&changeable&&!event&&!stable,invalidDate:invalid,decisionAuthority:'NONE'};
}
