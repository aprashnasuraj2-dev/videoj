// Browser-safe exact research plan. No retrieval or grant occurs here.
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {admitPublicSourcePlan} from '../sutra-inference/public-source-plan.js';
const fail=code=>{const e=Error('Research plan refused ('+code+').');e.code=code;throw e;};
const keys=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const task=(id,kind,agentId,dependsOn)=>Object.freeze({id,kind,agentId,dependsOn:Object.freeze(dependsOn)});
export const researchTasks=sources=>Object.freeze([task('frame','research_frame','planner',[]),...sources.map((s,i)=>task('source_'+i,'research_fetch','researcher',['frame'])),task('coordinate','research_coordinate','coordinator',sources.map((s,i)=>'source_'+i))]);
export async function admitResearchPlan(planText){
 const planPin=await casePin(planText),p=parseUniqueJson(planText,{maxChars:262144,maxDepth:12});
 if(!keys(p,['version','versionText','versionPin','sources','timeoutMs'])||p.version!=='sutra-public-research/v1'||!Number.isSafeInteger(p.timeoutMs)||p.timeoutMs<100||p.timeoutMs>30000)fail('CONFIG');
 const sources=admitPublicSourcePlan(p.sources);
 await replayInvestigationVersion(p.versionText,p.versionPin);
 const wire=parseUniqueJson(p.versionText,{maxChars:262144,maxDepth:12}),contract=parseUniqueJson(wire.contractText,{maxChars:262144,maxDepth:9});
 if(sources.some(s=>contract.sources.some(old=>old.id===s.id)))fail('SOURCE_COLLISION');
 const tasks=researchTasks(sources);
 const preview=Object.freeze({schema:'sutra-public-research/v1',planPin,versionDigest:p.versionPin,sources,maxTotalBytes:sources.reduce((n,s)=>n+s.maxBytes,0),timeoutMs:p.timeoutMs,tasks,qualification:'Exact public document GET only; host network address and requested path are visible to the source. No question, evidence, cookies, credential or model output sent. Retrieved bytes are not accepted evidence or factual truth.'});
 return Object.freeze({planText,planPin,versionPin:p.versionPin,sources,timeoutMs:p.timeoutMs,tasks,preview});
}
export async function buildResearchPlan({versionText,versionPin,sources,timeoutMs=30000}={}){
 const safe=admitPublicSourcePlan(sources);
 return admitResearchPlan(JSON.stringify({version:'sutra-public-research/v1',versionText,versionPin,sources:safe,timeoutMs}));
}
