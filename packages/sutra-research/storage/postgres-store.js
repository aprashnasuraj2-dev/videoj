// PostgreSQL persistence with server-owned principals, tenant cost reservations
// and fenced worker leases. The injected pool is a trusted pg-compatible pool.
import {randomUUID} from 'node:crypto';
import {admitManifest,digest,secretLike} from '../research-session.js';
const fail=code=>{throw Object.assign(Error('Research store refused: '+code),{code});};
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,127}$/,SESSION=/^research_[0-9a-f-]{36}$/,PIN=/^sha256:[0-9a-f]{64}$/;
const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
function owner(p){if(!p||typeof p.tenantId!=='string'||!ID.test(p.tenantId)||typeof p.ownerId!=='string'||!ID.test(p.ownerId))fail('PRINCIPAL');return [p.tenantId,p.ownerId];}
function sid(id){if(typeof id!=='string'||!SESSION.test(id))fail('SESSION_ID');return id;}
function leaseArgs(l){if(!l||!int(l.generation,1,2147483647)||typeof l.leaseToken!=='string'||!/^[0-9a-f-]{36}$/.test(l.leaseToken))fail('LEASE');return [sid(l.sessionId),...owner(l),l.generation,l.leaseToken];}
const fence="session_id=$1 AND tenant_id=$2 AND owner_id=$3 AND generation=$4 AND lease_token=$5::uuid AND state='running' AND lease_expires_at>clock_timestamp() AND deadline>clock_timestamp()";
const metadata='session_id AS "sessionId",tenant_id AS "tenantId",owner_id AS "ownerId",plan_pin AS "planPin",state,created_at AS "createdAt",deadline,checkpoint_sequence AS sequence,checkpoint_state AS "checkpointState",checkpoint_pending AS "checkpointPending",failure_code AS "failureCode",report_pin AS "reportPin"';
const workColumns=metadata+',manifest_text AS "manifestText",model_disclosure_approved AS "modelDisclosureApproved",lease_token AS "leaseToken",generation,lease_expires_at AS "leaseExpiresAt",checkpoint_revision AS "checkpointRevision"';
const first=r=>r.rows[0]??null;
function boundedJSON(value,max=32*1024*1024){const raw=JSON.stringify(value);if(typeof raw!=='string'||Buffer.byteLength(raw)>max)fail('PAYLOAD_SIZE');return raw;}
const eventFields=new Set(['sessionId','sequence','kind','planPin','operation','role','wave','status','taskKind','reason','sourceId','passages','vendor','model']);
function eventData(e,id,seq){
 if(!e||e.sessionId!==id||e.sequence!==seq||typeof e.kind!=='string'||!/^[a-z][a-z._]{0,63}$/.test(e.kind)||Object.keys(e).some(k=>!eventFields.has(k)))fail('EVENT');
 for(const [k,v] of Object.entries(e))if(typeof v==='string'&&(v.length>160||secretLike(v)||/[\u0000-\u001f\u007f]/.test(v))||typeof v!=='string'&&!int(v,0,100000))fail('EVENT');
 return boundedJSON(e,4096);
}
export function createPostgresResearchStore(pool,{leaseSeconds=30,maxWorkers=4}={}){
 if(!pool||typeof pool.connect!=='function'||typeof pool.query!=='function'||!int(leaseSeconds,3,300)||!int(maxWorkers,1,32))fail('STORE_CONFIG');
 async function tx(fn){const c=await pool.connect();try{await c.query('BEGIN');const out=await fn(c);await c.query('COMMIT');return out;}catch(e){try{await c.query('ROLLBACK');}catch{}throw e;}finally{c.release();}}
 return Object.freeze({
  leaseSeconds,
  async enqueue(principal,{manifestText,approvedPlanPin,approvePublicContact,approveEstimatedCost,approveModelDisclosure=false}={}){
   const [tenantId,ownerId]=owner(principal),p=admitManifest(manifestText);
   if(approvedPlanPin!==p.planPin||approvePublicContact!==true||approveEstimatedCost!==true||p.plan.modelPolicy&&approveModelDisclosure!==true)fail('APPROVAL');
   const cost=p.plan.budget.maxCostMicros,id='research_'+randomUUID();
   return tx(async c=>{
    // This row lock serializes the reservation and active-session count for one tenant.
    const limit=first(await c.query('SELECT max_active,max_session_cost_micros,max_daily_cost_micros FROM sutra_research.tenant_limits WHERE tenant_id=$1 FOR UPDATE',[tenantId]));
    if(!limit)fail('TENANT_NOT_CONFIGURED');
    if(cost>Number(limit.max_session_cost_micros))fail('TENANT_SESSION_BUDGET');
    const active=first(await c.query("SELECT count(*)::int AS n FROM sutra_research.sessions WHERE tenant_id=$1 AND state IN ('queued','running')",[tenantId])).n;
    if(active>=limit.max_active)fail('TENANT_ACTIVE_LIMIT');
    const reservation=first(await c.query("INSERT INTO sutra_research.daily_reservations AS d(tenant_id,day,reserved_cost_micros) SELECT $1,(clock_timestamp() AT TIME ZONE 'UTC')::date,$2::bigint WHERE $2::bigint<=$3::bigint ON CONFLICT(tenant_id,day) DO UPDATE SET reserved_cost_micros=d.reserved_cost_micros+EXCLUDED.reserved_cost_micros WHERE d.reserved_cost_micros+EXCLUDED.reserved_cost_micros<=$3::bigint RETURNING reserved_cost_micros",[tenantId,cost,limit.max_daily_cost_micros]));
    if(!reservation)fail('TENANT_DAILY_BUDGET');
    return first(await c.query("INSERT INTO sutra_research.sessions(session_id,tenant_id,owner_id,plan_pin,manifest_text,model_disclosure_approved,reserved_cost_micros,state,deadline) VALUES($1,$2,$3,$4,$5,$6,$7,'queued',clock_timestamp()+$8::int*interval '1 second') RETURNING "+metadata,[id,tenantId,ownerId,p.planPin,manifestText,Boolean(p.plan.modelPolicy),cost,p.plan.budget.maxDurationSeconds]));
   });
  },
  async read(principal,id){const [t,o]=owner(principal);return first(await pool.query('SELECT '+metadata+' FROM sutra_research.sessions WHERE session_id=$1 AND tenant_id=$2 AND owner_id=$3',[sid(id),t,o]));},
  async events(principal,id,{after=0,limit=100}={}){
   const [t,o]=owner(principal);if(!int(after,0,100000)||!int(limit,1,200))fail('EVENT_CURSOR');
   const r=await pool.query('SELECT e.event FROM sutra_research.events e JOIN sutra_research.sessions s USING(session_id) WHERE s.session_id=$1 AND s.tenant_id=$2 AND s.owner_id=$3 AND e.sequence>$4 ORDER BY e.sequence LIMIT $5',[sid(id),t,o,after,limit]);
   return r.rows.map(x=>x.event);
  },
  async report(principal,id){
   const [t,o]=owner(principal),r=first(await pool.query("SELECT report_text AS text,report_pin AS pin FROM sutra_research.sessions WHERE session_id=$1 AND tenant_id=$2 AND owner_id=$3 AND state='closed'",[sid(id),t,o]));
   if(!r)return null;if(digest(r.text)!==r.pin)fail('REPORT_INTEGRITY');return r;
  },
  async cancel(principal,id){
   const [t,o]=owner(principal);
   return first(await pool.query("UPDATE sutra_research.sessions SET state='cancelled',generation=generation+1,lease_token=NULL,lease_expires_at=NULL,failure_code='OPERATOR_CANCELLED' WHERE session_id=$1 AND tenant_id=$2 AND owner_id=$3 AND state IN ('queued','running') RETURNING "+metadata,[sid(id),t,o]));
  },
  async sweep(){
   const r=await pool.query("UPDATE sutra_research.sessions SET state=CASE WHEN state='queued' THEN 'expired' ELSE 'reconciliation_required' END,failure_code=CASE WHEN state='queued' THEN 'APPROVAL_EXPIRED' ELSE 'WORKER_LEASE_OR_DEADLINE_EXPIRED' END,generation=generation+1,lease_token=NULL,lease_expires_at=NULL WHERE (state='queued' AND deadline<=clock_timestamp()) OR (state='running' AND (deadline<=clock_timestamp() OR lease_expires_at<=clock_timestamp())) RETURNING session_id AS \"sessionId\",state");
   return r.rows;
  },
  async claimNext(){
   return tx(async c=>{
    // Serialize the global running-worker cap across cooperating worker processes.
    await c.query('SELECT pg_advisory_xact_lock(1398101074,1)');
    const active=first(await c.query("SELECT count(*)::int AS n FROM sutra_research.sessions WHERE state='running'")).n;
    if(active>=maxWorkers)return null;
    const r=await c.query("WITH candidate AS (SELECT session_id FROM sutra_research.sessions WHERE state='queued' AND deadline>clock_timestamp() ORDER BY created_at,session_id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE sutra_research.sessions s SET state='running',generation=s.generation+1,lease_token=$1::uuid,lease_expires_at=LEAST(s.deadline,clock_timestamp()+$2::int*interval '1 second') FROM candidate WHERE s.session_id=candidate.session_id RETURNING "+workColumns.split(',').map(x=>x.replace(/^([a-z_]+)/,'s.$1')).join(','),[randomUUID(),leaseSeconds]);
    return first(r);
   });
  },
  async renew(lease){
   const r=await pool.query('UPDATE sutra_research.sessions SET lease_expires_at=LEAST(deadline,clock_timestamp()+$6::int*interval \'1 second\') WHERE '+fence+' RETURNING lease_expires_at AS "leaseExpiresAt"',[...leaseArgs(lease),leaseSeconds]);return first(r);
  },
  async checkpoint(lease,snapshot,events,expectedRevision){
   const args=leaseArgs(lease);
   if(!snapshot||snapshot.sessionId!==lease.sessionId||snapshot.planPin!==lease.planPin||snapshot.authority!=='NONE'||!['running','closed','paused'].includes(snapshot.state)||!int(snapshot.sequence,1,100000)||!int(expectedRevision,0,2147483646)||!Array.isArray(events)||events.length>256||events.length>snapshot.sequence)fail('CHECKPOINT');
   const priorSequence=snapshot.sequence-events.length,eventJSON=events.map((e,i)=>eventData(e,lease.sessionId,priorSequence+i+1));
   const raw=boundedJSON(snapshot),pin=digest(raw);
   return tx(async c=>{
    const row=first(await c.query('UPDATE sutra_research.sessions SET checkpoint_text=$6,checkpoint_pin=$7,checkpoint_sequence=$8,checkpoint_state=$9,checkpoint_pending=$10,checkpoint_revision=checkpoint_revision+1 WHERE '+fence+' AND checkpoint_revision=$11 AND checkpoint_sequence=$12 RETURNING checkpoint_revision AS revision',[...args,raw,pin,snapshot.sequence,snapshot.state,snapshot.pending!==null,expectedRevision,priorSequence]));
    if(!row)fail('LEASE_LOST');
    for(let i=0;i<eventJSON.length;i++)await c.query('INSERT INTO sutra_research.events(session_id,sequence,event) VALUES($1,$2,$3::jsonb)',[lease.sessionId,priorSequence+i+1,eventJSON[i]]);
    return {revision:row.revision,pin};
   });
  },
  async finish(lease,report,expectedRevision){
   const args=leaseArgs(lease);
   if(!report||report.sessionId!==lease.sessionId||report.planPin!==lease.planPin||report.state!=='closed'||report.authority!=='NONE'||!int(expectedRevision,1,2147483647))fail('REPORT');
   const raw=boundedJSON(report),pin=digest(raw);
   const r=await pool.query("UPDATE sutra_research.sessions SET state='closed',report_text=$6,report_pin=$7,lease_token=NULL,lease_expires_at=NULL WHERE "+fence+" AND checkpoint_revision=$8 AND checkpoint_state='closed' AND checkpoint_pending=false RETURNING "+metadata,[...args,raw,pin,expectedRevision]);
   const row=first(r);if(!row)fail('LEASE_LOST');return row;
  },
  async fail(lease,code,{uncertain=true}={}){
   if(typeof code!=='string'||!/^[A-Z_]{1,60}$/.test(code))fail('FAILURE_CODE');
   const r=await pool.query("UPDATE sutra_research.sessions SET state=CASE WHEN checkpoint_pending OR $7::boolean THEN 'reconciliation_required' ELSE 'failed' END,failure_code=$6,lease_token=NULL,lease_expires_at=NULL WHERE "+fence+" RETURNING "+metadata,[...leaseArgs(lease),code,uncertain]);return first(r);
  }
 });
}
