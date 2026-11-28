// Local workerd integration fixture. Never deploy this entrypoint.
// No model, provider credential, external fetch, account or public route.
import {readQuotaReply} from '../quota-transport.js';
import {handleInference,UPSTREAM} from '../inference.js';
export {InferenceQuota} from '../quota.js';
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/health'&&request.method==='GET')return Response.json({localFixture:true});
 if(request.method==='POST'&&path==='/test-inference')return runInferenceFixture(request,env,url);
 if(request.method!=='POST'||!['/reserve','/release','/source-read','/drop-reservation'].includes(path))return new Response('',{status:404});
 let transportDiagnostic=null;
 const name=url.searchParams.get('case')??'main';
 if(!['main','source'].includes(name))return new Response('',{status:400});
 try{
  const quota=env.TEST_QUOTA.get(env.TEST_QUOTA.idFromName('local-'+name));
  const observed={async fetch(target,init){
   try{
    const response=await quota.fetch(target,init);
    console.log('LOCAL_QUOTA_TRANSPORT',JSON.stringify({status:response.status,url:response.url,redirected:response.redirected,type:response.headers.get('content-type')}));
    return response;
   }catch(error){transportDiagnostic=String(error).slice(0,300);console.error('LOCAL_QUOTA_TRANSPORT_ERROR',transportDiagnostic);throw error;}
  }};
  const result=await readQuotaReply(observed,path==='/drop-reservation'?'/reserve':path,await request.json(),AbortSignal.timeout(5000));
  if(path==='/drop-reservation'&&result.status===200){
   // Deliberately hide a real committed reservation response. The client
   // never receives the lease; no release or retry can be made from it.
   return Response.json({lostReply:true},{status:503});
  }
  return Response.json(result.data??{refused:true},{status:result.status});
 }catch(error){console.error('LOCAL_QUOTA_REPLY_ERROR',String(error));return Response.json({unavailable:true,diagnostic:String(error).slice(0,300),transportDiagnostic},{status:503});}
}};

async function runInferenceFixture(request,env,url){
 const scenario=url.searchParams.get('scenario');
 if(!['success','redirect','malformed','disabled','load'].includes(scenario))return new Response('',{status:400});
 const origin='https://sutra.test',key='LOCAL_SYNTHETIC_KEY_NOT_A_REAL_CREDENTIAL';
 const config={...env,SUTRA_ENABLE_INFERENCE:scenario==='disabled'?'false':'true',SUTRA_INFERENCE_BACKEND:'hosted',
  SUTRA_PROVIDER_KEY:key,SUTRA_CLIENT_HASH_SECRET:'f'.repeat(32),SUTRA_ALLOWED_ORIGIN:origin,
  SUTRA_MODELS:'operator-approved',SUTRA_MAX_OUTPUT_TOKENS:'64',
  SUTRA_QUOTA:{idFromName:()=>env.TEST_QUOTA.idFromName(scenario==='load'?'local-inference-load':'local-inference'),get:id=>env.TEST_QUOTA.get(id)}
 };
 const original=await request.json();
 const localRequest=new Request(origin+'/api/infer',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':original.client??'192.0.2.1'},
  body:JSON.stringify({model:'operator-approved',stream:true,messages:[{role:'user',content:'local fixture'}],tools:[]})});
 let contacts=0;
 const result=await handleInference(localRequest,config,{fetchImpl:async(target,init)=>{
  contacts++;
  if(target!==UPSTREAM||init.redirect!=='manual'||init.headers.Authorization!=='Bearer '+key)throw Error('Fixture transport boundary');
  if(scenario==='redirect')return new Response('PRIVATE_PROVIDER_CANARY',{status:307,headers:{Location:'https://not-contacted.invalid/private'}});
  const enc=new TextEncoder();
  const text=scenario==='malformed'?'data: invalid\n\n':'data: {"choices":[{"index":0,"delta":{"content":"local workerd fixture"},"finish_reason":null}],"secret":"PRIVATE_PROVIDER_CANARY"}\n\ndata: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n';
  const body=new ReadableStream({start(controller){controller.enqueue(enc.encode(text));controller.close();}});
  return new Response(body,{headers:{'Content-Type':'text/event-stream'}});
 }});
 const headers=new Headers(result.headers);headers.set('X-Local-Provider-Contacts',String(contacts));
 return new Response(result.body,{status:result.status,headers});
}
