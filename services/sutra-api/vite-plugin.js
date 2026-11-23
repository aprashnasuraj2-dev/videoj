import worker from './worker.js';
// Local development uses the same request handler, with inference always disabled.
export function sutraApiPlugin(){
 const install=server=>{server.middlewares.use(async(req,res,next)=>{
  if(!req.url?.startsWith('/api/'))return next();
  try{
   const origin=`http://${req.headers.host}`;const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);
   let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>32768){res.writeHead(413);res.end();return;}chunks.push(chunk);}
   const request=new Request(new URL(req.url,origin),{method:req.method,headers,...(req.method==='GET'||req.method==='HEAD'?{}:{body:Buffer.concat(chunks)})});
   const response=await worker.fetch(request,{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":{"code":"LOCAL_API_UNAVAILABLE"}}');}
 });};
 return {name:'sutra-local-read-api',configureServer:install,configurePreviewServer:install};
}
