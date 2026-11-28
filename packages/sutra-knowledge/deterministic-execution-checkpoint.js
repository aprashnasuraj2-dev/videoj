// Only deterministic, known manifests can be freshly recomputed here.
// Hybrid/model/provider histories can be inspected, not re-executed on import.
import {openExecutionCheckpoint,createExecutionCheckpoint} from '../sutra-runtime/execution-checkpoint.js';
import {runInvestigationReview,ROLE_REVIEW_TASKS} from './investigation-role-review.js';
import {runInvestigationChallenge,CHALLENGE_REVIEW_TASKS} from './investigation-challenge-review.js';
const fail=code=>{const e=Error('Deterministic checkpoint verification refused ('+code+').');e.code=code;throw e;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export async function verifyDeterministicExecutionCheckpoint({checkpointText,checkpointPin,versionText,versionPin,beforeText,beforePin,signal,assertCurrent=()=>{}}={}){
 const opened=await openExecutionCheckpoint(checkpointText,checkpointPin,versionPin),x=opened.checkpoint;
 if(x.status!=='completed'||x.origin!=='deterministic'||x.artifactPins===null)fail('NOT_DETERMINISTIC_COMPLETED');
 const manifest=x.events[0].payload.tasks,events=[];
 const fence=()=>{if(signal?.aborted)fail('CANCELLED');assertCurrent();};fence();
 const args={runId:'checkpoint_verify',signal,assertCurrent:fence,onExecutionEvent:e=>events.push(e)};
 let fresh;
 if(same(manifest,ROLE_REVIEW_TASKS))fresh=await runInvestigationReview({...args,versionText,versionPin});
 else if(same(manifest,CHALLENGE_REVIEW_TASKS))fresh=await runInvestigationChallenge({...args,beforeText,beforePin,afterText:versionText,afterPin:versionPin});
 else fail('MANIFEST');
 fence();if(fresh.status!=='completed')fail('RECOMPUTE');
 const generated=await createExecutionCheckpoint(fresh,events);fence();
 return Object.freeze({status:same(generated.checkpoint.artifactPins,x.artifactPins)?'RECOMPUTED_LINEAGE_MATCHES':'RECOMPUTED_LINEAGE_DIFFERS',checkedArtifacts:generated.checkpoint.artifactPins.length,versionDigest:versionPin,checkpointPin,decisionAuthority:'NONE',qualification:'Fresh deterministic replay compares admitted value and predecessor digests, not historical timing, identity, source authenticity, or empirical truth.'});
}
