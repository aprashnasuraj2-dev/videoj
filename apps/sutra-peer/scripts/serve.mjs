import http from 'node:http';import {readFile,stat} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))),'dist');const port=Number(process.env.PORT||4185);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');let pathname;
 try{pathname=decodeURIComponent(u.pathname);}catch{res.statusCode=400;return res.end('Bad request');}
 const publicAgent=pathname.startsWith('/agents/');
 if(publicAgent){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, HEAD');
  res.setHeader('Access-Control-Allow-Headers','Accept');
  res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
 }
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='OPTIONS'&&publicAgent){res.statusCode=204;return res.end();}
 if(!['GET','HEAD'].includes(req.method||'')){res.statusCode=405;res.setHeader('Allow','GET, HEAD');res.setHeader('Content-Type','text/plain; charset=utf-8');return res.end('Method not allowed');}
 try{
  if(pathname==='/'||pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('path');
  const info=await stat(file);if(!info.isFile())throw Error('not file');
  const data=await readFile(file);res.statusCode=200;res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  if(req.method==='HEAD')return res.end();res.end(data);
 }catch{res.statusCode=404;res.setHeader('Content-Type','text/plain; charset=utf-8');res.end(req.method==='HEAD'?'':'Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`SUTRA peer preview http://127.0.0.1:${port}`));
