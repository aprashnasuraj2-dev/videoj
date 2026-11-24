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
   const result=await locks.request(REVIEW_LOCK_NAME,{mode:'exclusive',signal},async()=>{
    signal.throwIfAborted();
    // Only bounded synchronous local storage work (or an immediately settled
    // registry promise) is valid here. Do not await network or user decisions:
    // a noncooperating async effect cannot be undone after the lock is lost.
    const value=await effect();
    signal.throwIfAborted(); // No false completion after pagehide or deadline.
    return value;
   });
   signal.throwIfAborted(); // Covers revocation after the lock callback settles.
   return result;
  },
  revoke(){const previous=lifetime;lifetime=new AbortController();previous.abort();}
 });
}
