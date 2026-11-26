import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
export function createSite(){
 return createServer(async(req,res)=>{
  const send=(status,body,headers={})=>{res.writeHead(status,{'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer',...headers});res.end(body);};
  if(req.method!=='GET')return send(405,'Method not allowed',{Allow:'GET'});
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return send(400,'Invalid URL');}
  if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(s=>s==='..'||s.startsWith('.')))return send(404,'Not found');
  const publicArtifact=/^\/agents\/(?:agent-manifest|learner\.network|links)\.json$/.test(pathname);
  const browserFile=pathname==='/'?'index.html':pathname==='/app.js'?'app.js':null;
  const moduleFile=/^\/packages\/(?:sutra-runtime|sutra-consent|sutra-actions|sutra-source-tools|sutra-evidence)\/[A-Za-z0-9_./-]+\.(?:js|mjs)$/.test(pathname)&&!pathname.includes('/test/')?pathname.slice(1):null;
  const candidate=publicArtifact?'public'+pathname:browserFile||moduleFile;
  if(!candidate)return send(404,'Not found');
  const file=resolve(root,candidate);
  if(!file.startsWith(root+sep))return send(404,'Not found');
  try{const body=await readFile(file);return send(200,body,{'Content-Type':types[extname(file)],...(publicArtifact?{'Access-Control-Allow-Origin':'*'}:{}),...(browserFile==='index.html'?{'Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"}:{})});}
  catch{return send(404,'Not found');}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||4177);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
 createSite().listen(port,'127.0.0.1',()=>console.log('Starter: http://127.0.0.1:'+port));
}
