// Durable Object class uses only standard Web APIs and ctx.storage transactions.
// Daily reservations are conservative: once admitted they consume daily/client quota
// even if the provider later fails. Active leases separately cap paid concurrency.
export class InferenceQuota{
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 async fetch(request){
  if(request.method!=='POST')return new Response('',{status:404});
  const pathname=new URL(request.url).pathname;
  if(!['/reserve','/release'].includes(pathname))return new Response('',{status:404});
  const max=Number(this.env.SUTRA_MAX_DAILY_CALLS),perClient=Number(this.env.SUTRA_MAX_CLIENT_CALLS),
   maxConcurrent=Number(this.env.SUTRA_MAX_CONCURRENT);
  if(!Number.isInteger(max)||max<1||max>1000||!Number.isInteger(perClient)||perClient<1||perClient>max||
   !Number.isInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>10||maxConcurrent>max)return new Response('',{status:503});
  let input;try{const text=await request.text();if(text.length>512)throw Error();input=JSON.parse(text);}catch{return new Response('',{status:400});}
  if(pathname==='/release'){
   if(!input||typeof input.lease!=='string'||!/^[0-9a-f-]{36}$/i.test(input.lease))return new Response('',{status:400});
   try{
    await this.ctx.storage.transaction(async tx=>{
     const state=await tx.get('quota');if(!state?.active||typeof state.active!=='object')return;
     if(Object.hasOwn(state.active,input.lease)){delete state.active[input.lease];await tx.put('quota',state);}
    });
    return Response.json({released:true});
   }catch{return new Response('',{status:503});}
  }
  if(!input||!/^[a-f0-9]{64}$/.test(input.clientKey??''))return new Response('',{status:400});
  const day=new Date().toISOString().slice(0,10),now=Date.now(),lease=crypto.randomUUID(),leaseMs=45000;
  try{
   const outcome=await this.ctx.storage.transaction(async tx=>{
    let state=await tx.get('quota');
    if(!state||state.day!==day)state={day,total:0,clients:{},active:{}};
    if(!state.clients||typeof state.clients!=='object')state.clients={};
    if(!state.active||typeof state.active!=='object')state.active={};
    for(const [id,expires] of Object.entries(state.active))if(!Number.isFinite(expires)||expires<=now)delete state.active[id];
    const used=state.clients[input.clientKey]??0;
    if(state.total>=max||used>=perClient){await tx.put('quota',state);return {allowed:false,reason:'daily'};}
    if(Object.keys(state.active).length>=maxConcurrent){await tx.put('quota',state);return {allowed:false,reason:'concurrency'};}
    state.total++;state.clients[input.clientKey]=used+1;state.active[lease]=now+leaseMs;
    await tx.put('quota',state);return {allowed:true,lease};
   });
   return Response.json(outcome,{status:outcome.allowed?200:429});
  }catch{return new Response('',{status:503});}
 }
}
