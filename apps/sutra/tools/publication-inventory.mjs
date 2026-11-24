import {readFile,readdir,writeFile,lstat,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const app=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const localOrigin='https://publication.invalid';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const validPath=path=>/^\/(?:agents|assets|runtime)\/[A-Za-z0-9._/-]+$/.test(path)&&!path.split('/').some(x=>x==='.'||x==='..'||x.startsWith('.'));
export async function createInventory(root=join(app,'dist')){
 const canonicalRoot=await realpath(root),entries=new Map();
 async function add(path,kind){
  if(!validPath(path)||entries.has(path))throw Error('Invalid or duplicate public artifact path: '+path);
  const disk=join(canonicalRoot,...path.slice(1).split('/')),stat=await lstat(disk),canonical=await realpath(disk);
  if(!stat.isFile()||canonical!==disk||!canonical.startsWith(canonicalRoot+sep))throw Error('Non-regular or escaped publication file');
  const bytes=await readFile(disk);entries.set(path,{path,kind,bytes:bytes.length,sha256:digest(bytes)});return bytes;
 }
 const manifest=JSON.parse(await add('/agents/agent-manifest.json','manifest'));
 const links=JSON.parse(await add('/agents/links.json','links'));
 if(!Array.isArray(manifest.networks)||!manifest.networks.length||new Set(manifest.networks.map(n=>n.name)).size!==manifest.networks.length||links.version!==1)throw Error('Invalid publication index');
 const networks=[];
 for(const n of manifest.networks){
  if(!/^[A-Za-z][A-Za-z0-9_]{0,59}$/.test(n.name)||typeof n.front_man!=='string')throw Error('Invalid network identity');
  const graph=new URL(n.hocon,localOrigin+'/agents/');
  if(graph.origin!==localOrigin||graph.search||graph.hash||!graph.pathname.startsWith('/agents/v/'))throw Error('Non-versioned graph publication');
  await add(graph.pathname,'versioned_graph');const canonical='/agents/'+n.name+'.network.json';
  await add(canonical,'graph_alias');
  if(entries.get(graph.pathname).sha256!==entries.get(canonical).sha256)throw Error('Graph alias/version drift');
  networks.push({name:n.name,frontMan:n.front_man,networkPath:'/agents/'+n.name,graphPath:graph.pathname,aliasPath:canonical});
 }
 await add('/runtime/sutra-runtime.js','browser_runtime');
 const names=await readdir(join(canonicalRoot,'assets'),{withFileTypes:true});
 for(const name of names.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
  if(/\.(?:js|css)$/.test(name.name))await add('/assets/'+name.name,name.name.endsWith('.js')?'browser_module':'style');
 }
 const html=await readFile(join(canonicalRoot,'index.html'),'utf8');
 const runtimePaths=[...new Set([...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+\.(?:js|css))"/g)].map(m=>'/'+m[1]))].sort();
 if(!runtimePaths.some(p=>p.endsWith('.js'))||runtimePaths.some(p=>!entries.has(p)))throw Error('Built HTML runtime entry missing');
 return {schema:1,profile:'development-build',manifestPath:'/agents/agent-manifest.json',linksPath:'/agents/links.json',publicRuntimePath:'/runtime/sutra-runtime.js',runtimePaths,networks,artifacts:[...entries.values()].sort((a,b)=>a.path<b.path?-1:1),inferenceDiscoveryPath:'/api/status',truthStatus:'unverified'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=join(app,'dist'),inventory=await createInventory(root);
 await writeFile(join(root,'agents','artifact-inventory.json'),JSON.stringify(inventory,null,2)+'\n');
 console.log('SUTRA publication inventory: '+inventory.artifacts.length+' byte-bound public files, '+inventory.networks.length+' exact network identities');
}
