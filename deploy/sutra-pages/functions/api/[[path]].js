// Same-account service binding only. No URL-based proxy, fallback or automatic retry.
const methods = new Map([['/api/status','GET'],['/api/infer','POST'],['/api/v1/chat/completions','POST'],['/api/source-tools','POST']]);
const error=(code,status,extra={})=>Response.json({error:{code}},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",...extra}});
export async function onRequest({request,env}){
 const url=new URL(request.url), method=methods.get(url.pathname);
 if(!method||url.search)return error('NOT_FOUND',404);
 if(request.method!==method)return error('METHOD',405,{Allow:method});
 if(request.signal.aborted)return error('CANCELLED',499);
 if(typeof env?.SUTRA_API?.fetch!=='function')return error('BINDING_UNAVAILABLE',503);
 let response,received,finished=false,abort;
 const dispose=value=>{try{void Promise.resolve(value?.body?.cancel()).catch(()=>{});}catch{}};
 const stopped=new Promise((_,reject)=>{abort=()=>reject(Error('Request cancelled'));request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort();});stopped.catch(()=>{});
 try{
  // The original HTTPS URL, Origin, body and client metadata are preserved.
  // Do not derive a caller identity from a user-supplied forwarding header.
  const incoming=Promise.resolve().then(()=>{request.signal.throwIfAborted();return env.SUTRA_API.fetch(request);}).then(value=>{if(finished||request.signal.aborted){dispose(value);throw Error('Cancelled service response');}received=value;return value;});
  response=await Promise.race([incoming,stopped]);request.signal.throwIfAborted();
  if(!(response instanceof Response)||response.redirected||response.url&&response.url!==url.href||response.status>=300&&response.status<400){dispose(response);return error('BINDING_UNAVAILABLE',502);}
  const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 }catch{dispose(response??received);return error(request.signal.aborted?'CANCELLED':'BINDING_UNAVAILABLE',request.signal.aborted?499:502);}
 finally{finished=true;request.signal.removeEventListener('abort',abort);}
}
