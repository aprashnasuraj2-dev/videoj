// Local workerd integration fixture. Never deploy this entrypoint.
// No model, provider credential, external fetch, account or public route.
import {readQuotaReply} from '../quota-transport.js';
export {InferenceQuota} from '../quota.js';
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/health'&&request.method==='GET')return Response.json({localFixture:true});
 if(request.method!=='POST'||!['/reserve','/release','/source-read','/drop-reservation'].includes(path))return new Response('',{status:404});
 const name=url.searchParams.get('case')??'main';
 if(!['main','source'].includes(name))return new Response('',{status:400});
 try{
  const quota=env.TEST_QUOTA.get(env.TEST_QUOTA.idFromName('local-'+name));
  const result=await readQuotaReply(quota,path==='/drop-reservation'?'/reserve':path,await request.json(),AbortSignal.timeout(5000));
  if(path==='/drop-reservation'&&result.status===200){
   // Deliberately hide a real committed reservation response. The client
   // never receives the lease; no release or retry can be made from it.
   return Response.json({lostReply:true},{status:503});
  }
  return Response.json(result.data??{refused:true},{status:result.status});
 }catch{return Response.json({unavailable:true},{status:503});}
}};
