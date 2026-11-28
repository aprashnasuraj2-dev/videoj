import {parseUniqueJson} from '../../packages/sutra-consent/strict-json.js';
// Internal RPC is still an untrusted wire boundary. Count bytes before retaining
// them, reject duplicate members (including escapes), and bound empty chunks/time.
export async function readQuotaJson(request){
 const max=512,signal=request.signal;signal.throwIfAborted();
 const reader=request.body?.getReader();if(!reader)throw Error('QUOTA_BODY');
 const bytes=new Uint8Array(max);let size=0,empty=0,rejectStop;
 const stopped=new Promise((_,reject)=>{rejectStop=reject;});
 const stop=()=>rejectStop(Error('QUOTA_BODY_STOPPED'));
 const timer=setTimeout(stop,5000);signal.addEventListener('abort',stop,{once:true});
 try{
  if(signal.aborted)stop();
  for(;;){
   const {value,done}=await Promise.race([reader.read(),stopped]);signal.throwIfAborted();
   if(done)break;
   if(!(value instanceof Uint8Array)||value.byteLength>max-size||(!value.byteLength&&++empty>256))throw Error('QUOTA_BODY_SIZE');
   bytes.set(value,size);size+=value.byteLength;
  }
  return parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,size)),{maxChars:max,maxDepth:4});
 }finally{
  clearTimeout(timer);signal.removeEventListener('abort',stop);
  try{void Promise.resolve(reader.cancel()).catch(()=>{});}catch{}
  try{reader.releaseLock();}catch{}
 }
}
