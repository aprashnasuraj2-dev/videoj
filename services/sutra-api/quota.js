// Durable Object class uses only standard Web APIs and ctx.storage transactions.
export class InferenceQuota{
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 async fetch(request){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/reserve')return new Response('',{status:404});
  const max=Number(this.env.SUTRA_MAX_DAILY_CALLS),perClient=Number(this.env.SUTRA_MAX_CLIENT_CALLS);
  if(!Number.isInteger(max)||max<1||max>1000||!Number.isInteger(perClient)||perClient<1||perClient>max)return new Response('',{status:503});
  let input;try{const text=await request.text();if(text.length>512)throw Error();input=JSON.parse(text);}catch{return new Response('',{status:400});}
  if(!input||!/^[a-f0-9]{64}$/.test(input.clientKey??''))return new Response('',{status:400});
  const day=new Date().toISOString().slice(0,10);
  try{
   const allowed=await this.ctx.storage.transaction(async tx=>{
    let state=await tx.get('quota');if(!state||state.day!==day)state={day,total:0,clients:{}};
    const used=state.clients[input.clientKey]??0;if(state.total>=max||used>=perClient)return false;
    state.total++;state.clients[input.clientKey]=used+1;await tx.put('quota',state);return true;
   });
   return Response.json({allowed},{status:allowed?200:429});
  }catch{return new Response('',{status:503});}
 }
}
