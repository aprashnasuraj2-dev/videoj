// Reviewed-method policy over the shared provider-neutral council scheduler.
import {admitProofCase,parseProposal} from './agent-bridge.js';
import {createVerifier} from './index.js';
import {prepareCouncil,runCouncilRounds,councilFail,councilText} from './council-scheduler.js';
export async function runAgentCouncil({caseText,question,routes,workspace,maxRounds=2,maxOutputTokens=256,timeoutMs=15000,signal}={}){
 if(!councilText(question,2000))councilFail('CONFIG');
 const c=admitProofCase(caseText),methodIds=[...c.methods.keys()];
 const config=prepareCouncil({routes,workspace,shareScope:'reviewed-question-and-method-feedback',maxRounds,maxOutputTokens,timeoutMs,signal});
 const result=await runCouncilRounds(config,{
  operation:(route,round,feedback)=>({kind:'reviewed-method-council-v1',question,agentId:route.id,role:route.role,obligationId:c.obligationId,methodIds:[...methodIds],round,feedback,instruction:'Choose one offered method. Return only JSON {version:1,obligationId,methodId}. Prior findings are conditional, not semantic or factual authority. Do not request credentials, URLs or tools.'}),
  admit:text=>parseProposal(text,c.obligationId,methodIds).methodId,
  async verify(methodId){
   const method=c.methods.get(methodId),r=await createVerifier().evaluate(method.graphText),receipt=r.report.receipts.find(x=>x.id===method.constraintId);
   if(!receipt)councilFail('VERIFICATION_REFUSED');
   return Object.freeze({methodId,graphDigest:r.report.graphDigest,outcome:receipt.outcome,receipt});
  },
  feedbackRow:(round,row,method)=>({round,agentId:row.agentId,methodId:row.candidateKey,verification:method.outcome.status})
 });
 const rounds=result.rounds.map(row=>Object.freeze({round:row.round,agents:Object.freeze(row.agents.map(({candidateKey,...other})=>Object.freeze(candidateKey===undefined?other:{...other,methodId:candidateKey})))}));
 return Object.freeze({profile:'sutra-reviewed-agent-council/v1',mode:'injected-transport-laboratory',obligationId:c.obligationId,rounds:Object.freeze(rounds),methods:result.artifacts,termination:result.termination,agreement:{INCOMPLETE:'INCOMPLETE',SAME_CANDIDATE:'SAME_METHOD',DISTINCT_CANDIDATES:'DISTINCT_METHODS'}[result.agreement],decisionAuthority:'NONE',qualification:'Model proposals select caller-reviewed methods only. Conditional computations do not establish intended meaning, evidence truth or independent model ancestry. No live provider, endpoint, cost or secret is configured here.'});
}
