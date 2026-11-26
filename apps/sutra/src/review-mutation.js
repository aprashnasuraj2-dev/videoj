// Cooperative cross-document serialization for application-owned review storage
// mutations. Other scripts/devtools can still mutate the origin: the store
// compares destructive snapshots and confirms exact post-write readback.
export const REVIEW_LOCK_NAME='sutra.review-cards.mutation.v2';
export class ReviewMutationOutcomeError extends Error {
 constructor(){super('Mutation may have completed before cancellation; inspect local data.');this.outcome='unknown';}
}
export function createReviewMutationQueue({locks=globalThis.navigator?.locks,timeoutMs=5000}={}){
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)throw Error('Review mutation deadline is invalid.');
 let lifetime=new AbortController();
 return Object.freeze({
  async run(effect){
   if(typeof effect!=='function'||typeof locks?.request!=='function')throw Error('Safe review mutation locking is unavailable.');
   const controller=lifetime,deadline=AbortSignal.timeout(timeoutMs),signal=AbortSignal.any([controller.signal,deadline]);
   let invoked=false,onAbort;
   // Race the caller's waiting period separately from the lock callback.
   // On timeout after invocation we return UNKNOWN promptly, but deliberately
   // DO NOT release a running lock effect early: its late mutation would then
   // race a later action. The browser will release the lock when that effect
   // settles or its document is destroyed.
   const stopped=new Promise((_,reject)=>{
    onAbort=()=>reject(signal.reason);
    signal.addEventListener('abort',onAbort,{once:true});
    if(signal.aborted)onAbort();
   });
   stopped.catch(()=>{});
   try{
    const operation=Promise.resolve(locks.request(REVIEW_LOCK_NAME,{mode:'exclusive',signal},async()=>{
     signal.throwIfAborted();
     invoked=true;
     const value=await effect();
     if(signal.aborted)throw new ReviewMutationOutcomeError();
     return value;
    }));
    // If the caller's race terminates, observe the detached lock promise so
    // a later rejection cannot become an unhandled process/browser event.
    operation.catch(()=>{});
    const result=await Promise.race([operation,stopped]);
    if(signal.aborted)throw new ReviewMutationOutcomeError();
    return result;
   }catch(error){
    if(signal.aborted&&invoked)throw new ReviewMutationOutcomeError();
    throw error;
   }finally{
    signal.removeEventListener('abort',onAbort);
   }
  },
  revoke(){const previous=lifetime;lifetime=new AbortController();previous.abort();}
 });
}
