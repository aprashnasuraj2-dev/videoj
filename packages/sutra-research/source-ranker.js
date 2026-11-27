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
