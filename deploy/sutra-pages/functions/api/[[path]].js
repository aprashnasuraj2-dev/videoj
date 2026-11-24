// Same-account service binding only. No URL-based proxy, fallback or automatic retry.
const methods = new Map([['/api/status','GET'],['/api/infer','POST'],['/api/source-tools','POST']]);
const error=(code,status,extra={})=>Response.json({error:{code}},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",...extra}});
export async function onRequest({request,env}){
 const url=new URL(request.url), method=methods.get(url.pathname);
 if(!method||url.search)return error('NOT_FOUND',404);
 if(request.method!==method)return error('METHOD',405,{Allow:method});
 if(request.signal.aborted)return error('CANCELLED',499);
 if(typeof env?.SUTRA_API?.fetch!=='function')return error('BINDING_UNAVAILABLE',503);
 try{
  // The original HTTPS URL, Origin, body and client metadata are preserved.
  // Do not derive a caller identity from a user-supplied forwarding header.
  const response=await env.SUTRA_API.fetch(request);
  if(!(response instanceof Response))return error('BINDING_UNAVAILABLE',502);
  const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 }catch{return error('BINDING_UNAVAILABLE',502);}
}
