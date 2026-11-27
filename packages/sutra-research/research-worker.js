// A trusted worker never resumes a running/expired lease or restores approval
// from an untrusted report. Only an already explicitly approved queued job starts.
import {admitManifest,authorizeResearch} from './research-session.js';
import {runAutonomousResearch} from './research-supervisor.js';
const code=e=>typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'WORKER_FAILURE';
const fail=c=>{throw Object.assign(Error('Research worker refused: '+c),{code:c});};
export async function runNextResearchJob({store,allowManifest,configure,signal}={}){
 if(!store||typeof allowManifest!=='function'||typeof configure!=='function')fail('WORKER_CONFIG');
 if(signal?.aborted)return null;
 await store.sweep();const lease=await store.claimNext();if(!lease)return null;
 const c=new AbortController(),abort=()=>c.abort(),events=[];signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 let authorization,host,revision=lease.checkpointRevision,lastSequence=0,heartbeat,busy=false,pending=true,started=false;
 const renew=async()=>{if(busy||c.signal.aborted)return;busy=true;try{if(!await store.renew(lease))abort();}catch{abort();}finally{busy=false;}};
 try{
  const p=admitManifest(lease.manifestText);if(p.planPin!==lease.planPin||!await allowManifest(p.plan,{tenantId:lease.tenantId,ownerId:lease.ownerId}))fail('WORKER_POLICY');
  authorization=authorizeResearch(lease.manifestText,{approvedPlanPin:lease.planPin,approvePublicContact:true,approveEstimatedCost:true,approveModelDisclosure:lease.modelDisclosureApproved,absoluteDeadline:new Date(lease.deadline).getTime(),signal:c.signal});
  if(!await store.renew(lease))fail('LEASE_LOST');
  heartbeat=setInterval(()=>void renew(),Math.max(1000,Math.floor(store.leaseSeconds*1000/3)));heartbeat.unref?.();
  host=await configure(authorization);authorization.assertActive();
  if(!host||!host.providers||typeof host.readDocument!=='function')fail('WORKER_CONFIG');
  const report=await runAutonomousResearch({authorization,providers:host.providers,readDocument:host.readDocument,modelBroker:host.modelBroker,assignedSessionId:lease.sessionId,
   onEvent:e=>{events.push(e);},
   onCheckpoint:async s=>{
    authorization.assertActive();const batch=events.splice(0,events.length);
    if(s.sequence!==lastSequence+batch.length)fail('EVENT_SEQUENCE');
    const saved=await store.checkpoint(lease,s,batch,revision);revision=saved.revision;lastSequence=s.sequence;pending=s.pending!==null;
    if(pending)started=true;authorization.assertActive();
   }
  });
  authorization.assertActive();
  if(pending)fail('UNKNOWN_DISPATCH');
  const row=await store.finish(lease,report,revision);
  return {sessionId:row.sessionId,state:row.state,reportPin:row.reportPin};
 }catch(e){
  // Any uncertainty after a dispatch boundary is conservatively quarantined.
  abort();try{const row=await store.fail(lease,code(e),{uncertain:started||pending&&revision>0});if(row)return {sessionId:row.sessionId,state:row.state,reason:code(e)};}catch{}
  return {sessionId:lease.sessionId,state:'lease_lost_or_reconciliation_required',reason:code(e)};
 }finally{clearInterval(heartbeat);host?.modelBroker?.close();try{await host?.close?.();}catch{}authorization?.close();signal?.removeEventListener('abort',abort);}
}
