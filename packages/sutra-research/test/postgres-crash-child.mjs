// Spawned only by disposable database integration test; never dispatches real providers.
import pg from 'pg';
import {createPostgresResearchStore} from '../storage/postgres-store.js';
import {runNextResearchJob} from '../research-worker.js';
const phase=process.argv[2],url=process.env.SUTRA_TEST_POSTGRES;
if(!['before','after'].includes(phase)||!url||new URL(url).pathname!=='/sutra_ci'||!['127.0.0.1','localhost'].includes(new URL(url).hostname)||!process.send)throw Error('TEST_CHILD_CONFIG');
const pool=new pg.Pool({connectionString:url,max:2});
const store=createPostgresResearchStore(pool,{leaseSeconds:10,maxWorkers:2});
if(phase==='before'){
 const lease=await store.claimNext();if(!lease)throw Error('NO_LEASE');
 process.send({sessionId:lease.sessionId,phase});setInterval(()=>{},1000);
}else{
 await runNextResearchJob({store,allowManifest:async()=>true,configure:async()=>({providers:{brave:{search:async()=>{
  const row=(await pool.query("SELECT session_id,checkpoint_pending FROM sutra_research.sessions WHERE state='running'")).rows[0];
  if(!row?.checkpoint_pending)throw Error('MISSING_DURABLE_FENCE');
  process.send({sessionId:row.session_id,phase});return new Promise(()=>{});
 }}},readDocument:async()=>{throw Error('UNEXPECTED_DOCUMENT');}})});
 await pool.end();throw Error('UNEXPECTED_COMPLETION');
}
