// Internal Durable Object: atomic daily/client/resource admission and active leases.
// A reservation consumes its full requested resource allowance even on ambiguous failure.
export const MAX_INPUT_BYTES=33792; // 32 KiB validated client body plus bounded server fields.
export const MAX_OUTPUT_TOKENS=1024;
const safe=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const map=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function sourceQuotaLimits(env={}){
 const max=Number(env.SUTRA_MAX_DAILY_SOURCE_READS),perClient=Number(env.SUTRA_MAX_CLIENT_SOURCE_READS);
 return safe(max,1,100000)&&safe(perClient,1,max)?{max,perClient}:null;
}
export function quotaLimits(env={}){
 const max=Number(env.SUTRA_MAX_DAILY_CALLS),perClient=Number(env.SUTRA_MAX_CLIENT_CALLS),maxConcurrent=Number(env.SUTRA_MAX_CONCURRENT);
 const maxInput=Number(env.SUTRA_MAX_DAILY_INPUT_BYTES??max*MAX_INPUT_BYTES),maxOutput=Number(env.SUTRA_MAX_DAILY_OUTPUT_TOKENS??max*MAX_OUTPUT_TOKENS);
 if(!safe(max,1,1000)||!safe(perClient,1,max)||!safe(maxConcurrent,1,Math.min(10,max))||!safe(maxInput,1,max*MAX_INPUT_BYTES)||!safe(maxOutput,1,max*MAX_OUTPUT_TOKENS))return null;
 return {max,perClient,maxConcurrent,maxInput,maxOutput};
}
export class InferenceQuota{
 constructor(ctx,env,{clock=Date.now}={}){this.ctx=ctx;this.env=env;this.clock=clock;}
 async fetch(request){
  if(request.method!=='POST')return new Response('',{status:404});
  const pathname=new URL(request.url).pathname;
  if(!['/reserve','/release','/source-read'].includes(pathname))return new Response('',{status:404});
  let input;try{const text=await request.text();if(text.length>512)throw Error();input=JSON.parse(text);}catch{return new Response('',{status:400});}
  if(pathname==='/source-read'){
   const limits=sourceQuotaLimits(this.env);
   if(!limits||!map(input)||Object.keys(input).length!==1||!/^[a-f0-9]{64}$/.test(input.clientKey??''))return new Response('',{status:limits?400:503});
   try{
    const outcome=await this.ctx.storage.transaction(async tx=>{
     const now=this.clock(),day=new Date(now).toISOString().slice(0,10);if(!Number.isSafeInteger(now))throw Error('Invalid quota clock');
     // Keep the global counter small and shard per-client counters across 256
     // pseudorandom HMAC buckets. A single hot day can never grow one Durable
     // Object value with tens of thousands of client keys.
     const bucket=input.clientKey.slice(0,2),bucketKey='source-quota:'+bucket;
     let state=await tx.get('source-quota'),clients=await tx.get(bucketKey);
     if(state){
      if(!map(state)||!/^\d{4}-\d{2}-\d{2}$/.test(state.day??'')||state.day>day||!safe(state.total,0,100000)||Object.keys(state).some(k=>!['day','total'].includes(k)))throw Error('Invalid source quota state');
      if(state.day!==day)state={day,total:0};
     }else state={day,total:0};
     if(clients){
      if(!map(clients)||!/^\d{4}-\d{2}-\d{2}$/.test(clients.day??'')||clients.day>day||!map(clients.counts)||Object.keys(clients).some(k=>!['day','counts'].includes(k)))throw Error('Invalid source client bucket');
      if(clients.day!==day)clients={day,counts:{}};
     }else clients={day,counts:{}};
     const used=clients.counts[input.clientKey]??0;if(!safe(used,0,100000))throw Error('Invalid source client count');
     if(state.total>=limits.max||used>=limits.perClient){await tx.put('source-quota',state);await tx.put(bucketKey,clients);return {allowed:false};}
     state.total++;clients.counts[input.clientKey]=used+1;await tx.put('source-quota',state);await tx.put(bucketKey,clients);return {allowed:true};
    });
    return Response.json(outcome,{status:outcome.allowed?200:429});
   }catch{return new Response('',{status:503});}
  }
  if(pathname==='/release'){
   if(!map(input)||Object.keys(input).length!==1||typeof input.lease!=='string'||!/^[0-9a-f-]{36}$/i.test(input.lease))return new Response('',{status:400});
   try{
    await this.ctx.storage.transaction(async tx=>{
     const state=await tx.get('quota');if(!map(state?.active))return;
     if(Object.hasOwn(state.active,input.lease)){delete state.active[input.lease];await tx.put('quota',state);}
    });
    return Response.json({released:true});
   }catch{return new Response('',{status:503});}
  }
  const limits=quotaLimits(this.env);if(!limits)return new Response('',{status:503});
  const {max,perClient,maxConcurrent,maxInput,maxOutput}=limits;
  if(!map(input)||Object.keys(input).length!==3||!/^[a-f0-9]{64}$/.test(input.clientKey??'')||!safe(input.inputBytes,1,MAX_INPUT_BYTES)||!safe(input.outputTokens,64,MAX_OUTPUT_TOKENS))return new Response('',{status:400});
  try{
   const outcome=await this.ctx.storage.transaction(async tx=>{
    // Sample time inside the transaction; do not admit using stale queued time.
    const now=this.clock(),day=new Date(now).toISOString().slice(0,10),lease=crypto.randomUUID(),leaseMs=45000;
    if(!Number.isSafeInteger(now))throw Error('Invalid quota clock');
    let state=await tx.get('quota');
    if(state){
     if(!map(state)||!/^\d{4}-\d{2}-\d{2}$/.test(state.day??'')||state.day>day||!map(state.active)||!map(state.clients)||!safe(state.total,0,1000))throw Error('Invalid stored quota state');
     for(const [id,expires] of Object.entries(state.active)){
      if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isSafeInteger(expires))throw Error('Invalid stored lease');
      if(expires<=now)delete state.active[id];
     }
     // Active calls can straddle UTC midnight. Preserve unexpired leases across daily reset.
     if(state.day!==day)state={day,total:0,inputBytes:0,outputTokens:0,clients:{},active:state.active};
    }else state={day,total:0,inputBytes:0,outputTokens:0,clients:{},active:{}};
    // Legacy same-day state had only call counts. Conservatively charge the former per-call maximum.
    if(state.inputBytes===undefined)state.inputBytes=state.total*MAX_INPUT_BYTES;
    if(state.outputTokens===undefined)state.outputTokens=state.total*MAX_OUTPUT_TOKENS;
    if(!safe(state.inputBytes,0,1000*MAX_INPUT_BYTES)||!safe(state.outputTokens,0,1000*MAX_OUTPUT_TOKENS))throw Error('Invalid stored resource counters');
    const used=state.clients[input.clientKey]??0;if(!safe(used,0,1000))throw Error('Invalid stored client count');
    let reason=null;
    if(state.total>=max||used>=perClient)reason='daily';
    else if(state.inputBytes+input.inputBytes>maxInput||state.outputTokens+input.outputTokens>maxOutput)reason='resource';
    else if(Object.keys(state.active).length>=maxConcurrent)reason='concurrency';
    if(reason){await tx.put('quota',state);return {allowed:false,reason};}
    state.total++;state.inputBytes+=input.inputBytes;state.outputTokens+=input.outputTokens;
    state.clients[input.clientKey]=used+1;state.active[lease]=now+leaseMs;
    await tx.put('quota',state);return {allowed:true,lease};
   });
   return Response.json(outcome,{status:outcome.allowed?200:429});
  }catch{return new Response('',{status:503});}
 }
}
