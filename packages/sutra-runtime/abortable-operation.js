// Runtime-local cancellation primitive. This package must remain reusable without
// importing learner-app inference adapters or provider-specific infrastructure.
export class OperationAbortError extends Error {
  constructor(){super('Operation cancelled.');this.name='OperationAbortError';this.code='ABORTED';}
}
export async function abortableOperation(promise,signal){
  const pending=Promise.resolve(promise);
  if(!signal)return pending;
  if(signal.aborted){void pending.catch(()=>{});throw new OperationAbortError();}
  let cancel;
  const stopped=new Promise((_,reject)=>{
    cancel=()=>reject(new OperationAbortError());
    signal.addEventListener('abort',cancel,{once:true});
  });
  // A cancellation rejection can win the race while the provider promise
  // continues settling later; Promise.race keeps the late settlement handled.
  try{return await Promise.race([pending,stopped]);}
  finally{signal.removeEventListener('abort',cancel);}
}
