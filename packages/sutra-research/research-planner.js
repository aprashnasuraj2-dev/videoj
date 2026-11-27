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
export function chooseResearchQuery(objective,history,{missing=[],domainCount=0,potentialDiscrepancies=0}={}){
 if(!history.length)return {query:objective,role:'drone',questionId:'frame',reason:'initial discovery'};
 const variants=[];
 if(history.length===1)variants.push({query:objective+' '+(missing.length?'primary evidence '+missing.slice(0,4).join(' '):' limitations contradictory evidence'),role:missing.length?'drone':'spark',questionId:missing.length?'primary':'counterevidence',reason:missing.length?'uncovered objective terms':'independent counterevidence pass'});
 if(potentialDiscrepancies>0)variants.push({query:objective+' conflicting estimates methodology definitions',role:'spark',questionId:'comparability',reason:'potential numeric discrepancy requires definitions'});
 if(domainCount<2)variants.push({query:objective+' independent primary sources',role:'spark',questionId:'counterevidence',reason:'insufficient domain diversity'});
 variants.push({query:objective+' counterarguments limitations',role:'spark',questionId:'counterevidence',reason:'challenge first interpretation'},{query:objective+' official data methodology',role:'drone',questionId:'primary',reason:'seek primary data'},{query:objective+' systematic review evidence gaps',role:'spark',questionId:'gaps',reason:'investigate unresolved questions'});
 for(const word of missing.slice(0,8))variants.push({query:objective+' primary evidence '+word,role:'drone',questionId:'gaps',reason:'target remaining objective term'});
 return variants.find(v=>!history.some(h=>h.query===v.query))??null;
}
export function questionProgress(plan,history){
 return plan.questions.map(q=>{
  const waves=history.filter(h=>h.questionId===q.id);
  return {...q,attemptedQueries:waves.length,candidateDocumentsAdmitted:waves.reduce((n,h)=>n+(h.waveOutcome?.newDocuments??0),0),candidatePassagesAdmitted:waves.reduce((n,h)=>n+(h.waveOutcome?.newPassages??0),0),status:waves.length?'investigated_unverified':'not_attempted',acceptanceSatisfied:false};
 });
}
