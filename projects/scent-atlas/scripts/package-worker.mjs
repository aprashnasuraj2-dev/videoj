/** Cloudflare Worker fallback packager. Use only on an isolated script / domain, never shared routes. */
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve('.'), dist=path.join(root,'dist'), output=path.join(root,'release');
const rev=process.env.SCENT_ATLAS_SOURCE_SHA||'local-uncommitted';
const preview=process.env.SCENT_ATLAS_PREVIEW==='1';
let files=[];async function walk(d){for(const e of await readdir(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())await walk(f);else if(!['/_headers'].includes('/'+path.relative(dist,f).replaceAll('\\','/')))files.push(f);}}
await walk(dist);files.sort();
const type=(name)=>name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':name.endsWith('.js')?'application/javascript; charset=utf-8':name.endsWith('.webp')?'image/webp':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.xml')?'application/xml; charset=utf-8':'text/plain; charset=utf-8';
const data={};let bytes=0;
for(const f of files){const pathName='/'+path.relative(dist,f).replaceAll('\\','/');const bin=await readFile(f);bytes+=bin.length;data[pathName]={mime:type(f),data:bin.toString('base64'),hash:createHash('sha256').update(bin).digest('hex')};}
const script=`/* Scent Atlas / self-contained static Worker. Compiled from ${rev}. */
const FILES=${JSON.stringify(data)};
const CACHE=new Map();
const REV=${JSON.stringify(rev)};
const IS_PREVIEW=${JSON.stringify(preview)};
const POLICY="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests";
function fromBase64(data){const raw=atob(data);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
async function serve(req){
 const url=new URL(req.url);if(req.method!=='GET'&&req.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 let requested=url.pathname;if(requested.includes('\\\\'))return new Response('Invalid path',{status:400});
 try{requested=decodeURIComponent(requested)}catch{return new Response('Invalid path',{status:400})}
 if(requested.includes('..')||requested.includes('\\\\'))return new Response('Invalid path',{status:400});
 if(requested==='/'||requested.endsWith('/'))requested+='index.html';
 else if(!requested.split('/').pop().includes('.')){const p=requested+'/index.html';if(FILES[p])return Response.redirect(url.origin+requested+'/',308);}
 let file=FILES[requested];let status=200;
 if(!file){file=FILES['/404.html'];status=404;}
 const headers=new Headers({'Content-Type':file.mime,'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()','Content-Security-Policy':POLICY,'X-Scent-Atlas-Source':REV,'Cache-Control':status===404?'no-store':requested.startsWith('/media/')||requested.startsWith('/assets/')?'public, max-age=3600':'public, max-age=120'});
 if(IS_PREVIEW||url.hostname.endsWith('.workers.dev'))headers.set('X-Robots-Tag','noindex, nofollow');
 if(status===200){headers.set('ETag','"'+file.hash.slice(0,24)+'"');if(req.headers.get('If-None-Match')==='"'+file.hash.slice(0,24)+'"')return new Response(null,{status:304,headers});}
 if(!CACHE.has(file.hash))CACHE.set(file.hash,fromBase64(file.data));
 return new Response(req.method==='HEAD'?null:CACHE.get(file.hash),{status,headers});
}
addEventListener('fetch',event=>event.respondWith(serve(event.request)));
`;
await mkdir(output,{recursive:true});await writeFile(path.join(output,'worker.js'),script);await writeFile(path.join(output,'release-manifest.json'),JSON.stringify({source:rev,preview,files:Object.fromEntries(Object.entries(data).map(([p,f])=>[p,{sha256:f.hash,mime:f.mime,bytes:Math.ceil(f.data.length*3/4)}])),worker_sha256:createHash('sha256').update(script).digest('hex')},null,2));
console.log(JSON.stringify({source:rev,preview,paths:files.length,original_bytes:bytes,script_bytes:Buffer.byteLength(script),script_sha256:createHash('sha256').update(script).digest('hex')},null,2));
