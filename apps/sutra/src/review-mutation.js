// Cooperative cross-document serialization for application-owned review storage
// mutations. Other scripts/devtools can still mutate the origin: the store
// compares destructive snapshots and confirms exact post-write readback.
export const REVIEW_LOCK_NAME='sutra.review-cards.mutation.v2';
export function createReviewMutationQueue({locks=globalThis.navigator?.locks,timeoutMs=5000}={}){
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)throw Error('Review mutation deadline is invalid.');
 let lifetime=new AbortController();
 return Object.freeze({
  async run(effect){
   if(typeof effect!=='function'||typeof locks?.request!=='function')throw Error('Safe review mutation locking is unavailable.');
   const controller=lifetime,deadline=AbortSignal.timeout(timeoutMs),signal=AbortSignal.any([controller.signal,deadline]);
   return locks.request(REVIEW_LOCK_NAME,{mode:'exclusive',signal},()=>{
    signal.throwIfAborted();
    // The app calls bounded synchronous store operations (or their immediate
    // registry promise). No network or user decision is awaited under this lock.
    return effect();
   });
  },
  revoke(){const previous=lifetime;lifetime=new AbortController();previous.abort();}
 });
}
