// Disposable loopback PostgreSQL only. Never point at production.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {createPostgresResearchStore} from '../storage/postgres-store.js';
import {admitManifest,digest} from '../research-session.js';
import {runNextResearchJob} from '../research-worker.js';
const url=process.env.SUTRA_TEST_POSTGRES;
if(!url||new URL(url).pathname!=='/sutra_ci'||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw Error('Disposable loopback sutra_ci required');
const pool=new pg.Pool({connectionString:url,max:16});
const a={tenantId:'tenant-a',ownerId:'alice'},b={tenantId:'tenant-a',ownerId:'bob'},other={tenantId:'tenant-b',ownerId:'alice'};
const manifestText=JSON.stringify({schema:'sutra-autonomous-research/v1',objective:'Compare battery costs',scope:{publicWeb:true,queryDisclosureAllowed:true,allowPrivateNetworks:false,allowAuthentication:false,allowExternalWrites:false,privateEvidenceDisclosureAllowed:false},budget:{maxSearches:2,maxDocuments:2,maxLinkDepth:0,maxDurationSeconds:60,maxDownloadBytes:2097152,maxCostMicros:10000},providers:[{id:'brave',estimatedMaxCostMicros:1000}]});
const approvedPlanPin=admitManifest(manifestText).planPin;
const approval={manifestText,approvedPlanPin,approvePublicContact:true,approveEstimatedCost:true};
const store=createPostgresResearchStore(pool,{leaseSeconds:10,maxWorkers:2});
const snap=(l,sequence,state='running',pending=null)=>({sessionId:l.sessionId,planPin:l.planPin,authority:'NONE',sequence,state,pending});
const evt=(l,sequence)=>({sessionId:l.sessionId,sequence,kind:'session.open'});
const clear=()=>pool.query('TRUNCATE sutra_research.events,sutra_research.sessions,sutra_research.daily_reservations');
test('real PostgreSQL migration, concurrency, fenced recovery, atomic events and tenant isolation',async()=>{
 try{
  await pool.query(await readFile(new URL('../storage/postgres-schema.sql',import.meta.url),'utf8'));
  await clear();await pool.query("INSERT INTO sutra_research.tenant_limits VALUES ('tenant-a',10,10000,30000),('tenant-b',10,10000,30000) ON CONFLICT(tenant_id) DO NOTHING");
  const outcomes=await Promise.allSettled(Array.from({length:8},()=>store.enqueue(a,approval)));
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,3);assert.equal(outcomes.filter(x=>x.status==='rejected'&&x.reason.code==='TENANT_DAILY_BUDGET').length,5);
  assert.equal(Number((await pool.query("SELECT reserved_cost_micros FROM sutra_research.daily_reservations WHERE tenant_id='tenant-a'")).rows[0].reserved_cost_micros),30000);
  const claims=(await Promise.all(Array.from({length:6},()=>store.claimNext()))).filter(Boolean);
  assert.equal(claims.length,2);assert.equal(new Set(claims.map(x=>x.sessionId)).size,2);
  const [l,m]=claims;assert.equal(await store.read(b,l.sessionId),null);assert.equal(await store.read(other,l.sessionId),null);assert.deepEqual(await store.events(b,l.sessionId),[]);assert.equal(await store.cancel(other,l.sessionId),null);
  const results=await Promise.allSettled([store.checkpoint(l,snap(l,1),[evt(l,1)],0),store.checkpoint(l,snap(l,1),[evt(l,1)],0)]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.filter(x=>x.status==='rejected'&&x.reason.code==='LEASE_LOST').length,1);
  assert.equal((await store.events(a,l.sessionId)).length,1);
  await assert.rejects(store.checkpoint(l,snap(l,2),[evt(l,1)],1),/EVENT/);
  await store.checkpoint(l,snap(l,2,'closed'),[evt(l,2)],1);
  const report={sessionId:l.sessionId,planPin:l.planPin,state:'closed',authority:'NONE',documents:[]};
  await store.finish(l,report,2);assert.equal((await store.report(a,l.sessionId)).pin,digest(JSON.stringify(report)));assert.equal(await store.report(b,l.sessionId),null);
  await pool.query("UPDATE sutra_research.sessions SET report_text='tampered' WHERE session_id=$1",[l.sessionId]);await assert.rejects(store.report(a,l.sessionId),/REPORT_INTEGRITY/);
  await store.checkpoint(m,snap(m,1,'running',{state:'dispatch_unknown'}),[evt(m,1)],0);
  await pool.query("UPDATE sutra_research.sessions SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE session_id=$1",[m.sessionId]);
  assert.equal((await store.sweep()).find(x=>x.sessionId===m.sessionId).state,'reconciliation_required');assert.equal(await store.renew(m),null);await assert.rejects(store.checkpoint(m,snap(m,2),[evt(m,2)],1),/LEASE_LOST/);
  const n=await store.claimNext();assert.notEqual(n.sessionId,m.sessionId);
  await pool.query("UPDATE sutra_research.sessions SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE session_id=$1",[n.sessionId]);
  assert.equal((await store.sweep()).find(x=>x.sessionId===n.sessionId).state,'reconciliation_required');assert.equal(await store.claimNext(),null);
  await clear();
  const q=await store.enqueue(a,approval),lease=await store.claimNext();assert.equal(lease.sessionId,q.sessionId);await store.cancel(a,q.sessionId);assert.equal(await store.renew(lease),null);
  // Actual killed child, not a mocked SQL store or a simulated thrown exception.
  for(const phase of ['before','after']){
   await clear();const row=await store.enqueue(a,approval);
   const child=fork(fileURLToPath(new URL('./postgres-crash-child.mjs',import.meta.url)),[phase],{stdio:['ignore','ignore','pipe','ipc']});
   const exited=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
   let timeout;
   try{
    const received=await new Promise((resolve,reject)=>{
     timeout=setTimeout(()=>reject(Error('child did not reach dispatch boundary')),15000);
     child.once('message',resolve);child.once('error',reject);child.once('exit',()=>reject(Error('worker exited before ready')));
    });
    assert.equal(received.sessionId,row.sessionId);assert.equal(received.phase,phase);
    const persisted=(await pool.query('SELECT checkpoint_pending,state,generation,lease_token FROM sutra_research.sessions WHERE session_id=$1',[row.sessionId])).rows[0];
    assert.equal(persisted.state,'running');assert.equal(persisted.checkpoint_pending,phase==='after');
    child.kill('SIGKILL');assert.equal((await exited).signal,'SIGKILL');
    assert.equal(await store.claimNext(),null,'killed worker must not be resumed');
    await pool.query("UPDATE sutra_research.sessions SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE session_id=$1",[row.sessionId]);
    assert.equal((await store.sweep()).find(x=>x.sessionId===row.sessionId).state,'reconciliation_required');
    assert.equal(await store.claimNext(),null,'expired running work cannot be reclaimed');
    const current=await store.read(a,row.sessionId);assert.equal(current.state,'reconciliation_required');assert.equal(await store.report(a,row.sessionId),null);
   }finally{clearTimeout(timeout);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');await exited;}
  }
  await clear();const job=await store.enqueue(a,approval);let calls=0;
  const result=await runNextResearchJob({store,allowManifest:async()=>true,configure:async auth=>({providers:{brave:{search:async()=>{calls++;return [{url:'https://example.org/report'}];}}},readDocument:async url=>{auth.reserve('document',{bytes:100});const text='Battery costs were USD 100 million in 2025.';return {url,text,textDigest:digest(text),rawDigest:digest(text),links:[],mediaType:'text/plain'};}})});
  assert.equal(result.state,'closed',JSON.stringify(result));assert.equal(result.sessionId,job.sessionId);assert.ok(calls>=1&&calls<=2);assert.ok(await store.report(a,job.sessionId));assert.equal(await store.claimNext(),null);
 }finally{await pool.end();}
});
