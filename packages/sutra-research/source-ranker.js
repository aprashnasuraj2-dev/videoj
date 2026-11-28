// Discovery priority only; never a truth or source-authority probability.
import {objectiveTerms} from './research-planner.js';
export function discoveryScore(candidate,objective,domainAttempts){
 const host=new URL(candidate.url).hostname,attempts=domainAttempts.get(host)??0,terms=objectiveTerms(objective);
 const title=(candidate.title??'').toLowerCase(),relevance=terms.length?terms.filter(w=>title.includes(w)).length/terms.length:0;
 const rank=Number.isSafeInteger(candidate.rank)&&candidate.rank>=1&&candidate.rank<=10?candidate.rank:10;
 const components={novelty:1/(1+attempts),titleRelevance:relevance,providerRank:(11-rank)/10,depth:1/(1+candidate.depth)};
 const score=.45*components.novelty+.30*components.titleRelevance+.15*components.providerRank+.10*components.depth;
 return {score,components};
}
export function rankFrontier(frontier,objective,domainAttempts){
 return frontier.map((candidate,index)=>({candidate,index,...discoveryScore(candidate,objective,domainAttempts)})).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.candidate);
}

/** Browser gets only bounded ranking features, never authority to propose a URL. */
export function browserFrontierChoices(frontier,domainAttempts){
 if(!Array.isArray(frontier)||frontier.length>240||!(domainAttempts instanceof Map))throw Error('FRONTIER_SELECTION');
 const choices=[];
 for(const [index,candidate] of frontier.entries()){
  const attempts=domainAttempts.get(new URL(candidate.url).hostname)??0;
  if(attempts>=3)continue;
  choices.push(Object.freeze({id:'candidate_'+index,title:typeof candidate.title==='string'?candidate.title.slice(0,300):'',rank:Number.isSafeInteger(candidate.rank)&&candidate.rank>=1&&candidate.rank<=10?candidate.rank:10,depth:candidate.depth,attempts}));
 }
 return Object.freeze(choices);
}
export function chooseBrowserFrontier(choices,objective){
 if(!Array.isArray(choices)||choices.length<1||choices.length>240||typeof objective!=='string'||!objective.trim()||objective.length>1000)throw Error('FRONTIER_SELECTION');
 const seen=new Set(),terms=objectiveTerms(objective);
 let best=null;
 for(const [index,c] of choices.entries()){
  if(!c||typeof c!=='object'||Object.keys(c).length!==5||!['id','title','rank','depth','attempts'].every(k=>Object.hasOwn(c,k))||typeof c.id!=='string'||!/^candidate_(?:0|[1-9]\d{0,2})$/.test(c.id)||Number(c.id.slice(10))>=240||seen.has(c.id)||typeof c.title!=='string'||c.title.length>300||!Number.isSafeInteger(c.rank)||c.rank<1||c.rank>10||!Number.isSafeInteger(c.depth)||c.depth<0||c.depth>8||!Number.isSafeInteger(c.attempts)||c.attempts<0||c.attempts>=3)throw Error('FRONTIER_SELECTION');
  seen.add(c.id);
  const title=c.title.toLowerCase(),relevance=terms.length?terms.filter(w=>title.includes(w)).length/terms.length:0;
  const score=.45*(1/(1+c.attempts))+.30*relevance+.15*((11-c.rank)/10)+.10*(1/(1+c.depth));
  if(!best||score>best.score)best={id:c.id,score,index};
 }
 return best.id;
}
