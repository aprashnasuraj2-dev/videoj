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
   let invoked=false;
   try{
    const result=await locks.request(REVIEW_LOCK_NAME,{mode:'exclusive',signal},async()=>{
     signal.throwIfAborted();
     // No network or user decision may be awaited under the storage lock.
     // If revocation follows invocation, the side effect could already exist:
     // report UNKNOWN, not a falsely certain rejection or completion.
     invoked=true;
     const value=await effect();
     if(signal.aborted)throw new ReviewMutationOutcomeError();
     return value;
    });
    if(signal.aborted)throw new ReviewMutationOutcomeError();
    return result;
   }catch(error){
    if(signal.aborted&&invoked)throw new ReviewMutationOutcomeError();
    throw error;
   }
  },
  revoke(){const previous=lifetime;lifetime=new AbortController();previous.abort();}
 });
}
