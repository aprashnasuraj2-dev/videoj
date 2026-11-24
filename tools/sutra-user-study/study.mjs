import {createHash} from 'node:crypto';
const ID=/^P\d{2}$/,VARIANT=/^[AB]$/,METHOD=new Set(['sutra','manual']);
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys)=>plain(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const finitePositive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const median=values=>{const a=[...values].sort((x,y)=>x-y),n=a.length,m=Math.floor(n/2);return n%2?a[m]:(a[m-1]+a[m])/2;};
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':plain(value)?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value);
const sha=value=>createHash('sha256').update(canonical(value)).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};

export function makeCounterbalancedPlan({participantCount=10,seed=''}={}){
 if(participantCount!==10||typeof seed!=='string'||seed.length<16||seed.length>128)throw Error('Exactly ten participants and a 16–128 character recorded seed are required.');
 const ids=Array.from({length:10},(_,i)=>'P'+String(i+1).padStart(2,'0'));
 // Deterministic rotation from the seed changes assignment identities without changing 5/5 balance.
 let h=2166136261;for(const c of seed){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}
 const offset=h%10,rotated=[...ids.slice(offset),...ids.slice(0,offset)];
 const rows=rotated.map((participant,index)=>{
  const order=index<5?['sutra','manual']:['manual','sutra'];
  const groupIndex=index%5;const variants=groupIndex%2===0?['A','B']:['B','A'];
  return {participant,order,variants};
 }).sort((a,b)=>a.participant.localeCompare(b.participant));
 const core={schema:1,participantCount:10,seedFingerprint:String(h).padStart(10,'0'),rows};
 return freeze({...core,planHash:sha(core)});
}

function validateObservation(row){
 const keys=['participant','method','variant','success','validEvidence','durationSeconds','assistanceCount','criticalError'];
 if(!exact(row,keys)||!ID.test(row.participant)||!METHOD.has(row.method)||!VARIANT.test(row.variant)||typeof row.success!=='boolean'||typeof row.validEvidence!=='boolean'||
  !finitePositive(row.durationSeconds)||row.durationSeconds>1800||!Number.isInteger(row.assistanceCount)||row.assistanceCount<0||row.assistanceCount>20||
  typeof row.criticalError!=='boolean')throw Error('Invalid observation row.');
 if(row.success&&!row.validEvidence)throw Error('A success cannot lack valid evidence.');
 return row;
}

export function scoreStudy({plan,observations}){
 if(!plain(plan)||plan.schema!==1||plan.participantCount!==10||typeof plan.seedFingerprint!=='string'||!/^\d{10}$/.test(plan.seedFingerprint)||typeof plan.planHash!=='string'||!/^[a-f0-9]{64}$/.test(plan.planHash)||
  !Array.isArray(plan.rows)||plan.rows.length!==10||!Array.isArray(observations)||observations.length!==20)throw Error('Complete ten-participant paired study required.');
 const core={schema:plan.schema,participantCount:plan.participantCount,seedFingerprint:plan.seedFingerprint,rows:plan.rows};
 if(sha(core)!==plan.planHash)throw Error('Study assignment changed after freeze.');
 const planIds=new Set(plan.rows.map(r=>r.participant));if(planIds.size!==10)throw Error('Invalid plan participants.');
 const seen=new Set(),rows=observations.map(raw=>{
  const r=validateObservation(raw),key=r.participant+'|'+r.method;if(!planIds.has(r.participant)||seen.has(key))throw Error('Missing, duplicate or unknown participant-method row.');seen.add(key);return {...r};
 });
 for(const assignment of plan.rows){
  if(!exact(assignment,['participant','order','variants'])||!ID.test(assignment.participant)||!Array.isArray(assignment.order)||!Array.isArray(assignment.variants)||
    assignment.order.length!==2||assignment.variants.length!==2||new Set(assignment.order).size!==2||new Set(assignment.variants).size!==2||
    !assignment.order.every(x=>METHOD.has(x))||!assignment.variants.every(x=>VARIANT.test(x)))throw Error('Invalid assignment row.');
  for(let i=0;i<2;i++){
   const observed=rows.find(r=>r.participant===assignment.participant&&r.method===assignment.order[i]);
   if(!observed||observed.variant!==assignment.variants[i])throw Error('Observation does not match the frozen counterbalanced assignment.');
  }
 }
 const group=method=>rows.filter(r=>r.method===method);
 const summarize=method=>{
  const g=group(method),valid=g.filter(r=>r.validEvidence),successful=g.filter(r=>r.success);
  return {participants:g.length,successes:successful.length,validEvidence:valid.length,criticalErrors:g.filter(r=>r.criticalError).length,
   medianSeconds:median(g.map(r=>r.durationSeconds)),medianValidEvidenceSeconds:valid.length?median(valid.map(r=>r.durationSeconds)):null,
   totalAssistance:g.reduce((s,r)=>s+r.assistanceCount,0),unaidedSuccesses:g.filter(r=>r.success&&r.assistanceCount===0).length};
 };
 const sutra=summarize('sutra'),manual=summarize('manual');
 const paired=plan.rows.map(a=>{
  const s=rows.find(r=>r.participant===a.participant&&r.method==='sutra'),m=rows.find(r=>r.participant===a.participant&&r.method==='manual');
  return {participant:a.participant,order:a.order[0]+'-first',sutraSeconds:s.durationSeconds,manualSeconds:m.durationSeconds,
   deltaSeconds:m.durationSeconds-s.durationSeconds,sutraValid:s.validEvidence,manualValid:m.validEvidence};
 });
 const comparable=sutra.validEvidence===10&&manual.validEvidence===10;
 const improvement=comparable?(manual.medianValidEvidenceSeconds-sutra.medianValidEvidenceSeconds)/manual.medianValidEvidenceSeconds:null;
 const first={sutra:paired.filter(r=>r.order==='sutra-first'),manual:paired.filter(r=>r.order==='manual-first')};
 const observationsHash=sha(rows.sort((a,b)=>(a.participant+'|'+a.method).localeCompare(b.participant+'|'+b.method)));
 return freeze({schema:1,planHash:plan.planHash,observationsHash,sutra,manual,paired,
  evidenceAccuracyComparable:comparable,
  medianTimeReductionFraction:improvement,
  targetResult:{
   unaidedCompletion: sutra.unaidedSuccesses>=8?'pass':'fail',
   noEvidenceAccuracyLoss: comparable?'pass':'fail',
   medianTimeAtLeast30PercentLower: comparable&&improvement>=0.30?'pass':'fail'
  },
  orderCheck:{
   sutraFirstMedianDelta:median(first.sutra.map(r=>r.deltaSeconds)),
   manualFirstMedianDelta:median(first.manual.map(r=>r.deltaSeconds)),
   note:'Order-stratified deltas are descriptive only for n=5/group; do not claim statistical significance.'
  },
  limitation:'This scorer verifies complete paired records and arithmetic. It cannot prove participant eligibility, task equivalence, observer neutrality, consent, or absence of coaching.'});
}
