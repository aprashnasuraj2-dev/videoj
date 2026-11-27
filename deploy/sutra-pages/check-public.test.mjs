import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {observePublic} from './check-public.mjs';
import {V2_STATIC_CSP,GUIDE_ORIGIN} from '../../apps/sutra-v2/static-headers.mjs';
test('fixed credential-free GETs verify exact files and refuse drift, CORS and unexpected router',async()=>{
 const root=await mkdtemp(join(tmpdir(),'sutra-public-'));const candidate=join(root,'candidate'),guide=join(root,'guide');
 try{
  for(const [dir,names] of [[candidate,['agent-manifest','investigation.network','reviewed-investigation.network','peer-investigation.network','links']],[guide,['agent-manifest','checklist.network','links']]]){await mkdir(join(dir,'agents'),{recursive:true});for(const name of names)await writeFile(join(dir,'agents',name+'.json'),'{"fixture":true}');}
  await writeFile(join(candidate,'index.html'),'<html>fixture</html>');
  let mode='ok',calls=0;
  const fetchImpl=async (url,init)=>{
   calls++;assert.equal(init.method,'GET');assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');assert.equal(init.headers.Authorization,undefined);
   const u=new URL(url);let bytes,headers;
   assert.ok(['https://sutra.aafnaipatro.com',GUIDE_ORIGIN].includes(u.origin));
   if(u.pathname==='/api/status'){bytes=JSON.stringify(mode==='router'?{inference:'configured'}:{inference:'disabled'});headers={'content-type':'application/json'};}
   else if(u.pathname==='/'){bytes=await readFile(join(candidate,'index.html'));headers={'content-type':'text/html','content-security-policy':V2_STATIC_CSP.replace("connect-src 'self';","connect-src 'self' "+GUIDE_ORIGIN+";")};}
   else{bytes=mode==='drift'?'{"changed":true}':await readFile(join(u.origin===GUIDE_ORIGIN?guide:candidate,u.pathname.slice(1)));headers={'content-type':'application/json','access-control-allow-origin':mode==='cors'?'https://wrong.invalid':'*'};}
   const response=new Response(bytes,{headers});Object.defineProperty(response,'url',{value:url});return response;
  };
  let report=await observePublic({candidate,guide,fetchImpl});assert.equal(report.status,'matched');assert.equal(calls,10);assert.equal(report.releaseAuthority,'NONE');
  for(const [m,code] of [['drift','ARTIFACT_DRIFT'],['cors','PUBLIC_CORS'],['router','UNEXPECTED_INFERENCE_CONFIGURATION']]){mode=m;report=await observePublic({candidate,guide,fetchImpl});assert.equal(report.status,'not_verified');assert.ok(report.checks.some(c=>c.reason===code));}
 }finally{await rm(root,{recursive:true,force:true});}
});
