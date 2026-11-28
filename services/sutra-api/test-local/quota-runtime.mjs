// Loopback-only Wrangler/Miniflare/workerd test, with a fresh SQLite DO.
// Run explicitly from CI or a local checkout. No Cloudflare login or deploy.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {createServer} from 'node:net';
import {setTimeout as sleep} from 'node:timers/promises';
import {admissionWindow,ADMISSION_MS,LEASE_MS} from '../quota.js';
const port=await new Promise((resolve,reject)=>{
 const probe=createServer();probe.once('error',reject);
 probe.listen(0,'127.0.0.1',()=>{const value=probe.address().port;probe.close(error=>error?reject(error):resolve(value));});
});
const dir=dirname(fileURLToPath(import.meta.url)),state=await mkdtemp(join(tmpdir(),'sutra-quota-workerd-'));
const origin='http://127.0.0.1:'+port,detached=process.platform!=='win32';
let log='',exited=false;
const child=spawn(process.platform==='win32'?'npx.cmd':'npx',['--yes','wrangler@4.166.0','dev','--local','--config',join(dir,'wrangler.jsonc'),'--ip','127.0.0.1','--port',String(port),'--persist-to',state],{
 cwd:dir,stdio:['ignore','pipe','pipe'],detached,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false',NO_COLOR:'1'}
});
for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{log=(log+data.toString()).slice(-12000);});
child.on('exit',()=>{exited=true;});child.on('error',error=>{exited=true;log+=String(error);});
try{
 let ready=false;
 for(let i=0;i<180;i++){
  if(exited)throw Error('Local Wrangler exited before readiness: '+log);
  try{const response=await fetch(origin+'/health',{signal:AbortSignal.timeout(400)});
   if(response.ok&&(await response.json()).localFixture===true){ready=true;break;}
  }catch{}
  await sleep(500);
 }
 if(!ready)throw Error('Local Wrangler did not become ready: '+log);
 const post=async(path,body,which='main')=>{
  const response=await fetch(origin+path+'?case='+which,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  return {status:response.status,body:await response.json()};
 };
 const reserve=(key,window=admissionWindow())=>({clientKey:key.repeat(64),inputBytes:100,outputTokens:64,...window});
 const release=lease=>post('/release',{lease});
 const source=(key,window=admissionWindow())=>post('/source-read',{clientKey:key.repeat(64),...window},'source');
 assert.equal((await post('/reserve',reserve('a',{...admissionWindow(),admitUntil:Date.now()-1}))).status,503);
 assert.equal((await post('/reserve',reserve('a',{...admissionWindow(),admitUntil:Date.now()+ADMISSION_MS+10000}))).status,503);
 const previousDay=new Date(Date.now()-86400000).toISOString().slice(0,10);
 assert.equal((await post('/reserve',reserve('a',{...admissionWindow(),day:previousDay}))).status,503);
 assert.equal((await source('a',{...admissionWindow(),day:previousDay})).status,503);
 const dropped=await post('/drop-reservation',reserve('a'));
 assert.deepEqual(dropped,{status:503,body:{lostReply:true}});
 const lostAt=Date.now();
 // The actual local durable state, not a fake map, must retain concurrency.
 const denied=await Promise.all(Array.from({length:8},()=>post('/reserve',reserve('b'))));
 assert.ok(denied.every(result=>result.status===429),'no extra concurrent leases');
 assert.equal((await source('a')).status,200);
 assert.equal((await source('a')).status,200);
 assert.equal((await source('a')).status,429);
 assert.equal((await source('b')).status,200);
 assert.equal((await source('c')).status,429);
 // Wait for the actual 45-second lease window, not an accelerated fake clock.
 const remaining=LEASE_MS+300-(Date.now()-lostAt);
 if(remaining>0)await sleep(remaining);
 const next=await post('/reserve',reserve('a'));assert.equal(next.status,200);
 assert.equal((await release(next.body.lease)).status,200);
 assert.equal((await release(next.body.lease)).status,200,'release is idempotent');
 assert.equal((await post('/reserve',reserve('a'))).status,429,'first lost reservation remains in per-client budget');
 const third=await post('/reserve',reserve('b'));assert.equal(third.status,200);
 assert.equal((await release(third.body.lease)).status,200);
 assert.equal((await post('/reserve',reserve('c'))).status,429,'daily count remains charged after release and expiry');
 const model=async(scenario,client='192.0.2.1')=>{
  const response=await fetch(origin+'/test-inference?scenario='+scenario,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client}),signal:AbortSignal.timeout(10000)});
  return {status:response.status,contacts:Number(response.headers.get('X-Local-Provider-Contacts')),text:await response.text(),location:response.headers.get('location')};
 };
 const disabled=await model('disabled');assert.equal(disabled.status,503);assert.equal(disabled.contacts,0);
 const success=await model('success');assert.equal(success.status,200);assert.equal(success.contacts,1);assert.match(success.text,/local workerd fixture/);assert.match(success.text,/data: \[DONE\]/);assert.doesNotMatch(success.text,/PRIVATE_PROVIDER_CANARY|LOCAL_SYNTHETIC_KEY/);
 const redirect=await model('redirect');assert.equal(redirect.status,502);assert.equal(redirect.contacts,1);assert.equal(redirect.location,null);assert.doesNotMatch(redirect.text,/not-contacted|PRIVATE_PROVIDER_CANARY/);
 const capped=await model('success');assert.equal(capped.status,429);assert.equal(capped.contacts,0);
 const malformed=await model('malformed','192.0.2.2');assert.equal(malformed.status,200);assert.equal(malformed.contacts,1);assert.match(malformed.text,/INCOMPLETE_STREAM/);assert.doesNotMatch(malformed.text,/\[DONE\]/);
 const globalCap=await model('success','192.0.2.3');assert.equal(globalCap.status,429);assert.equal(globalCap.contacts,0);
 // Separate actual SQLite quota object: 20 concurrent unique client addresses,
 // with the fixture's real 3/day, 2/client, 1-concurrent limits.
 // Do not retry any rejected/ambiguous request; later stop probes are new clients.
 const load=await Promise.all(Array.from({length:20},async(_,i)=>{
  const start=performance.now(),result=await model('load','192.0.2.'+(i+20));
  return {...result,ms:Math.round((performance.now()-start)*100)/100};
 }));
 const admitted=load.filter(x=>x.status===200),refused=load.filter(x=>x.status===429);
 assert.equal(admitted.length+refused.length,20);
 assert.ok(admitted.length>=1&&admitted.length<=3);
 assert.ok(admitted.every(x=>x.contacts===1&&/data: \[DONE\]/.test(x.text)));
 assert.ok(refused.every(x=>x.contacts===0));
 assert.ok(load.every(x=>!x.text.includes('PRIVATE_PROVIDER_CANARY')&&!x.text.includes('LOCAL_SYNTHETIC_KEY')));
 let stopProbeContacts=0,stopProbeAdmitted=0;
 for(let i=0;i<3-admitted.length;i++){
  const fresh=await model('load','192.0.2.'+(100+i));assert.equal(fresh.status,200);assert.equal(fresh.contacts,1);stopProbeContacts+=fresh.contacts;stopProbeAdmitted++;
 }
 const stop=await model('load','192.0.2.120');assert.equal(stop.status,429);assert.equal(stop.contacts,0);
 const percentile=(rows,p)=>rows.length?rows.map(x=>x.ms).sort((a,b)=>a-b)[Math.ceil(rows.length*p)-1]:null;
 console.log('WORKERD_LOAD '+JSON.stringify({scope:'actual loopback Workerd HTTP + SQLite DO; injected provider only; no production CDN/Worker metrics',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),concurrentClients:20,statusCounts:{200:admitted.length,429:refused.length},providerContacts:load.reduce((n,x)=>n+x.contacts,0),p50Ms:percentile(load,.5),p95Ms:percentile(load,.95),admittedP50Ms:percentile(admitted,.5),admittedP95Ms:percentile(admitted,.95),refusedP50Ms:percentile(refused,.5),refusedP95Ms:percentile(refused,.95),freshStopProbeContacts:stopProbeContacts,stopProbeAdmitted,finalStatus:stop.status,finalContacts:stop.contacts,dailyCeiling:3,perClientCeiling:2,concurrentCeiling:1}));
 console.log('WORKERD_INFERENCE '+JSON.stringify({localOnly:true,simulatedUpstream:true,realDurableStorage:true,disabledContacts:0,completeSse:true,redirectRefused:true,malformedIncomplete:true,perClientAndGlobalCap:true,privateFieldsAbsent:true}));
 console.log('WORKERD_QUOTA '+JSON.stringify({localOnly:true,sqlite:true,wrangler:'4.166.0',oldDayRefused:true,expiredRefused:true,concurrencyDenials:denied.length,sourceCap:true,unknownLeaseRecovered:true,elapsedSinceLostReplyMs:Date.now()-lostAt,perClientAndDailyChargeRetained:true,releaseIdempotent:true}));
}catch(error){console.error(log);throw error;}
finally{
 if(!exited){try{if(detached)process.kill(-child.pid,'SIGTERM');else child.kill('SIGTERM');}catch{}
  for(let i=0;i<30&&!exited;i++)await sleep(100);
  if(!exited){try{if(detached)process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{}}
 }
 await rm(state,{recursive:true,force:true});
}
