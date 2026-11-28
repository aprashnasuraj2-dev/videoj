import http from 'node:http';
import {readFile,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=await realpath(path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))),'dist')),port=Number(process.env.PORT||4185);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const publicArtifacts=new Set(['/agents/agent-manifest.json','/agents/checklist.network.json','/agents/links.json']);
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
 let pathname;
 try{const u=new URL(req.url,'http://127.0.0.1:'+port);if(u.origin!=='http://127.0.0.1:'+port||u.search||u.hash)throw Error();pathname=decodeURIComponent(u.pathname);if(/[\\\u0000-\u001f]/.test(pathname)||!pathname.startsWith('/'))throw Error();}catch{res.statusCode=400;return res.end('Bad request');}
 const publicAgent=publicArtifacts.has(pathname);
 if(publicAgent){
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, HEAD');res.setHeader('Access-Control-Allow-Headers','Accept');res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
 }
 if(req.method==='OPTIONS'&&publicAgent){const method=req.headers['access-control-request-method'],headers=req.headers['access-control-request-headers'];if(method&&!['GET','HEAD'].includes(method)||headers&&headers.toLowerCase().trim()!=='accept'){res.statusCode=403;return res.end();}res.statusCode=204;return res.end();}
 if(!['GET','HEAD'].includes(req.method||'')){res.statusCode=405;res.setHeader('Allow',publicAgent?'GET, HEAD, OPTIONS':'GET, HEAD');return res.end('Method not allowed');}
 if(pathname.startsWith('/agents/')&&!publicAgent){res.statusCode=404;return res.end(req.method==='HEAD'?'':'Not found');}
 try{
  if(pathname==='/'||pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('path');
  const resolved=await realpath(file);if(!resolved.startsWith(root+path.sep)||resolved!==file)throw Error('symlink');
  const info=await stat(resolved);if(!info.isFile()||info.size>2097152)throw Error('not file');
  const data=await readFile(resolved);res.statusCode=200;res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Content-Length',data.length);res.end(req.method==='HEAD'?undefined:data);
 }catch{res.statusCode=404;res.setHeader('Content-Type','text/plain; charset=utf-8');res.end(req.method==='HEAD'?'':'Not found');}
});
server.requestTimeout=10000;server.headersTimeout=10000;server.listen(port,'127.0.0.1',()=>console.log('SUTRA peer preview http://127.0.0.1:'+port));
