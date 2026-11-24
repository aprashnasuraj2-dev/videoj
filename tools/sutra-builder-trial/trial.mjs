import {createHash} from 'node:crypto';
const SHA=/^[a-f0-9]{40}$/i,ID=/^B0[12]$/,ARTIFACT=new Set(['evidence','consent','starter']),ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys)=>plain(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':plain(v)?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const sha=v=>createHash('sha256').update(canonical(v)).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};

export function scoreBuilderTrials(input){
 if(!exact(input,['schema','releaseRevision','releaseId','artifact','trials'])||input.schema!==1||!SHA.test(input.releaseRevision)||typeof input.releaseId!=='string'||!input.releaseId.trim()||input.releaseId.length>100||
  !ARTIFACT.has(input.artifact)||!Array.isArray(input.trials)||input.trials.length!==2)throw Error('Exactly two trials against one released artifact are required.');
 const seen=new Set(),trials=input.trials.map(raw=>{
  const keys=['builderId','outsideProjectAttested','attestation','environment','startedAt','completedAt','validResult','interventions','blockers','notes'];
  if(!exact(raw,keys)||!ID.test(raw.builderId)||seen.has(raw.builderId)||raw.outsideProjectAttested!==true||
   raw.attestation!=='I was not part of the SUTRA project team and performed this trial in my own environment using only the released quickstart.'||
   typeof raw.environment!=='string'||raw.environment.trim().length<5||raw.environment.length>300||!ISO.test(raw.startedAt)||!ISO.test(raw.completedAt)||
   typeof raw.validResult!=='boolean'||!Array.isArray(raw.interventions)||raw.interventions.length>20||!Array.isArray(raw.blockers)||raw.blockers.length>20||
   typeof raw.notes!=='string'||raw.notes.length>1000)throw Error('Invalid outside-builder trial row.');
  seen.add(raw.builderId);
  const start=Date.parse(raw.startedAt),end=Date.parse(raw.completedAt),seconds=(end-start)/1000;
  if(!Number.isFinite(seconds)||seconds<=0||seconds>7200)throw Error('Invalid trial interval.');
  const checkItems=(items,label)=>items.map((item,i)=>{
   if(!exact(item,['kind','detail'])||!['maintainer_help','doc_gap','tool_error','environment_issue','other'].includes(item.kind)||typeof item.detail!=='string'||!item.detail.trim()||item.detail.length>500)throw Error('Invalid '+label+'['+i+']');
   return {...item};
  });
  return {builderId:raw.builderId,outsideProjectAttested:true,environment:raw.environment.trim(),startedAt:raw.startedAt,completedAt:raw.completedAt,durationSeconds:seconds,
   validResult:raw.validResult,interventions:checkItems(raw.interventions,'interventions'),blockers:checkItems(raw.blockers,'blockers'),notes:raw.notes};
 });
 const successful=trials.filter(t=>t.validResult),under15=trials.filter(t=>t.validResult&&t.durationSeconds<=900);
 const totalInterventions=trials.reduce((s,t)=>s+t.interventions.length,0),totalBlockers=trials.reduce((s,t)=>s+t.blockers.length,0);
 const identity=sha({releaseRevision:input.releaseRevision,releaseId:input.releaseId,artifact:input.artifact,trials});
 return freeze({schema:1,releaseRevision:input.releaseRevision,releaseId:input.releaseId,artifact:input.artifact,trials,recordHash:identity,
  summary:{trials:2,validResults:successful.length,validWithin15Minutes:under15.length,totalInterventions,totalBlockers,
   targetResult:successful.length===2&&under15.length===2?'pass':'fail'},
  limitation:'The scorer validates complete de-identified records and arithmetic. It cannot prove builder independence, that coaching was fully disclosed, release authenticity, or environment ownership.'});
}
