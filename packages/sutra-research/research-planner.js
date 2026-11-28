// Transparent objective-only planner. No hidden model reasoning or source-text disclosure.
const stopWords=new Set('the and for from that this with what which are was were how why does into about have has their than can could would should between compare investigate analysis'.split(' '));
export const objectiveTerms=s=>[...new Set((s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)??[]).filter(x=>!stopWords.has(x)))].slice(0,16);
export function createResearchPlan(objective){
 const terms=objectiveTerms(objective),q=(id,question,priority,requiredEvidenceTypes,acceptanceCriteria,dependencies=[])=>({id,question,priority,requiredEvidenceTypes,acceptanceCriteria,dependencies,status:'unverified'});
 return {schema:'sutra-deterministic-research-plan/v1',objective,terms,questions:[
  q('frame',objective,100,['directly relevant source'],['Retrieve relevant primary-source candidates; do not use search snippets as evidence']),
  q('primary','What primary data directly addresses the objective?',90,['original report','official data','primary documentation'],['Identify traceable evidence and definitions'],['frame']),
  q('counterevidence','What evidence challenges or limits the initial interpretation?',85,['contrary findings','methodological limitations'],['Execute a separate counterevidence query and retain competing evidence'],['frame']),
  q('comparability','Which definitions, periods, denominators and units affect comparison?',80,['methods','measurement definitions','reporting periods'],['Retain explicit units and period; do not infer comparability'],['primary']),
  q('gaps','Which important objective terms or questions remain uninvestigated?',70,['missing evidence','unresolved questions'],['Disclose remaining gaps rather than assert sufficiency'],['frame','counterevidence'])
 ],qualification:'Generic deterministic decomposition; acceptance criteria require semantic and independent evidence review.'};
}
export function researchQueryCandidates(objective,history,{missing=[],domainCount=0,potentialDiscrepancies=0}={}){
 if(!history.length)return [{query:objective,role:'drone',questionId:'frame',reason:'initial discovery'}];
 const variants=[];
 if(history.length===1)variants.push({query:objective+' '+(missing.length?'primary evidence '+missing.slice(0,4).join(' '):' limitations contradictory evidence'),role:missing.length?'drone':'spark',questionId:missing.length?'primary':'counterevidence',reason:missing.length?'uncovered objective terms':'independent counterevidence pass'});
 if(potentialDiscrepancies>0)variants.push({query:objective+' conflicting estimates methodology definitions',role:'spark',questionId:'comparability',reason:'potential numeric discrepancy requires definitions'});
 if(domainCount<2)variants.push({query:objective+' independent primary sources',role:'spark',questionId:'counterevidence',reason:'insufficient domain diversity'});
 variants.push({query:objective+' counterarguments limitations',role:'spark',questionId:'counterevidence',reason:'challenge first interpretation'},{query:objective+' official data methodology',role:'drone',questionId:'primary',reason:'seek primary data'},{query:objective+' systematic review evidence gaps',role:'spark',questionId:'gaps',reason:'investigate unresolved questions'});
 for(const word of missing.slice(0,8))variants.push({query:objective+' primary evidence '+word,role:'drone',questionId:'gaps',reason:'target remaining objective term'});
 return variants.filter((v,i)=>!history.some(h=>h.query===v.query)&&variants.findIndex(w=>w.query===v.query)===i);
}
export function questionProgress(plan,history){
 return plan.questions.map(q=>{
  const waves=history.filter(h=>h.questionId===q.id);
  return {...q,attemptedQueries:waves.length,candidateDocumentsAdmitted:waves.reduce((n,h)=>n+(h.waveOutcome?.newDocuments??0),0),candidatePassagesAdmitted:waves.reduce((n,h)=>n+(h.waveOutcome?.newPassages??0),0),status:waves.length?'investigated_unverified':'not_attempted',acceptanceSatisfied:false};
 });
}

export function chooseResearchQuery(objective,history,context={}){return researchQueryCandidates(objective,history,context)[0]??null;}
// Query text, model output and external URLs never enter this selection packet.
// An opaque identifier selects an already admitted host-side query; execution
// still requires a separate operation permit and atomic resource reservation.
const questionIds=new Set(['frame','primary','counterevidence','comparability','gaps']);
const roles=new Set(['drone','spark']);
export function browserQueryChoices(candidates,history){
 if(!Array.isArray(candidates)||!candidates.length||candidates.length>16||!Array.isArray(history)||history.length>30)throw Error('QUERY_SELECTION');
 return Object.freeze(candidates.map((c,i)=>{
  if(!questionIds.has(c.questionId)||!roles.has(c.role)||typeof c.query!=='string'||!c.query||c.query.length>1200)throw Error('QUERY_SELECTION');
  return Object.freeze({id:'query_'+i,questionId:c.questionId,role:c.role,attempts:history.filter(h=>h.questionId===c.questionId).length});
 }));
}
export function chooseBrowserQuery(choices){
 if(!Array.isArray(choices)||!choices.length||choices.length>16)throw Error('QUERY_SELECTION');
 const seen=new Set();let best=null;
 for(const c of choices){
  if(!c||typeof c!=='object'||Object.keys(c).length!==4||!['id','questionId','role','attempts'].every(k=>Object.hasOwn(c,k))||typeof c.id!=='string'||!/^query_(?:0|[1-9]|1[0-5])$/.test(c.id)||seen.has(c.id)||!questionIds.has(c.questionId)||!roles.has(c.role)||!Number.isSafeInteger(c.attempts)||c.attempts<0||c.attempts>30)throw Error('QUERY_SELECTION');
  seen.add(c.id);
  // Prefer an under-investigated subquestion. The original host order breaks
  // ties, preserving the deterministic discrepancy/counterevidence priorities.
  if(!best||c.attempts<best.attempts)best=c;
 }
 return best.id;
}
