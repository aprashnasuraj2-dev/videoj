// Caller-launched offline Chromium workspace. The browser receives three
// operations for one private directory. It never receives a filesystem path.
import {openDurableInvestigationHistory} from '../../packages/sutra-knowledge/durable-investigation-history.mjs';
import {readFile, realpath, stat} from 'node:fs/promises';
import {extname, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {V2_STATIC_CSP} from './static-headers.mjs';

const origin='http://127.0.0.1';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json','.pyz':'application/zip','.sha256':'text/plain'};
export async function attachHistoryHost(page,directory,workspaceURL){
 const host=await openDurableInvestigationHistory(directory);
 await page.exposeBinding('__sutraSavedHistory',async({frame},operation,payload)=>{
  if(frame!==page.mainFrame()||frame.url().split('#')[0]!==workspaceURL)return {ok:false,error:'HISTORY_HOST_ORIGIN'};
  try{
   let snapshot;
   switch(operation){
    case 'initialize_snapshot': snapshot=await host.initializeSnapshot(payload);break;
    case 'append_snapshot': snapshot=await host.appendSnapshot(payload);break;
    case 'read_snapshot': snapshot=await host.read(payload.expectedHistoryPin);break;
    default: return {ok:false,error:'HISTORY_HOST_OPERATION'};
   }
   return {ok:true,snapshot};
  }catch(error){
   const code=error?.message;
   return {ok:false,error:typeof code==='string'&&/^HISTORY_[A-Z0-9_]+$/.test(code)?code:'HISTORY_HOST_IO'};
  }
 });
 await page.addInitScript(url=>{
  if(window===window.top&&location.href.split('#')[0]===url){
   Object.defineProperty(window,'sutraHistoryHost',{value:Object.freeze({version:1,call:(op,payload)=>window.__sutraSavedHistory(op,payload)})});
  }
 },workspaceURL);
}

async function launch(directory){
 if(!directory)throw Error('Pass a private Linux investigation history directory.');
 const dist=await realpath(fileURLToPath(new URL('./dist/',import.meta.url)));
 await stat(resolve(dist,'index.html'));
 const {chromium}=await import('playwright');
 const browser=await chromium.launch({headless:false});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin||route.request().method()!=='GET')return route.abort();
   try{
    const file=await realpath(resolve(dist,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname))));
    const contentType=types[extname(file)];
    if(!file.startsWith(dist+sep)||!contentType)return route.abort();
    await route.fulfill({contentType,headers:{'Content-Security-Policy':V2_STATIC_CSP},body:await readFile(file)});
   }catch{return route.abort();}
  });
  const page=await context.newPage();
  await attachHistoryHost(page,directory,origin+'/');
  await page.goto(origin+'/');
  await page.waitForEvent('close',{timeout:0});
 }finally{await browser.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await launch(process.argv[2]);
