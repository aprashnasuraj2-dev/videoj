import http from 'node:http';import {readFile,stat} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))),'dist');const port=Number(process.env.PORT||4185);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.sha256':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1');let pathname=decodeURIComponent(u.pathname);if(pathname==='/'||pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('path');
  const info=await stat(file);if(!info.isFile())throw Error('not file');
  const data=await readFile(file);res.statusCode=200;res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  if(pathname.startsWith('/agents/'))res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Content-Type-Options','nosniff');res.end(data);
 }catch{res.statusCode=404;res.setHeader('Content-Type','text/plain; charset=utf-8');res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`SUTRA peer preview http://127.0.0.1:${port}`));
