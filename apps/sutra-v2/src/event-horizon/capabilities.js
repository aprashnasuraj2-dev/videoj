// Bounded host-owned workflow recommendations. This is a presentation planner,
// not the runtime admission authority. A route can be inspected/opened, never
// executed by a composition proposal. Definitions and capabilities are separate.
const list=(...v)=>Object.freeze(v);
const descriptor=(id,title,capabilities,kind,conditions,details,agentDefinitions)=>Object.freeze({id,title,capabilities:Object.freeze(capabilities),kind,conditions:Object.freeze(conditions),details,agentDefinitions});
export const capabilityCatalog=Object.freeze([
 {id:'exact_quantity',label:'Exact quantity computation',detail:'Normalize declared units and retain exact computation receipts.'},
 {id:'semantic_intake',label:'Semantic interpretation',detail:'Review materially different meanings before computation.'},
 {id:'candidate_plan',label:'Candidate investigation plan',detail:'Propose bounded investigation steps; not a verified answer.'},
 {id:'challenge',label:'Challenge a claim or plan',detail:'Identify limitations, disconfirming observations or alternative explanations.'},
 {id:'public_sources',label:'Public-source acquisition',detail:'Acquire sources only through a separately approved bounded host.'},
 {id:'source_interpretation',label:'Interpret an exact source span',detail:'Inspect the explicitly selected local evidence span; external disclosure requires approval.'},
 {id:'revision',label:'Revise or withdraw evidence',detail:'Preview downstream effects and explicitly apply a versioned change.'},
 {id:'proof_replay',label:'Inspect and replay a proof',detail:'Use existing local or independently implemented replay within their documented scopes.'},
 {id:'peer_critique',label:'Consult a published peer',detail:'Separate authorized public artifact contact, then bounded caller-side execution.'}
].map(Object.freeze));
export const workflowRegistry=Object.freeze([
 descriptor('direct_compute','Direct quantity kernel',list('exact_quantity'),'deterministic',list(),'Exact local quantity conversion; no model or agent required.',0),
 descriptor('semantic_workspace','Reviewed semantic workspace',list('semantic_intake','source_interpretation'),'deterministic',list('Reviewed or manually supplied source and semantic confirmation'),'Existing semantic intake and reviewed evidence tools; meaning is not automatically verified.',0),
 descriptor('local_revision','Local evidence revision',list('revision'),'deterministic',list('An evaluated retained investigation'),'Preview, compare and explicitly apply through the existing workspace.',0),
 descriptor('proof','Proof inspection and replay',list('proof_replay'),'deterministic',list('Supported proof artifact or current result'),'Existing browser replay and separate Python verifier; factual truth is outside replay scope.',0),
 descriptor('browser_plan','Published browser investigation',list('candidate_plan','challenge'),'model',list('Configured and approved publisher model route','Exact objective approval'),'Existing published local planner/critic graph; neither actor is mandatory for unrelated workflows.',2),
 descriptor('reviewed_browser','Published reviewed-evidence investigation',list('candidate_plan','challenge','source_interpretation'),'model',list('Exact selected evidence span','Configured and approved model route','Explicit source disclosure'),'Existing reviewed graph with one selected evidence capability.',2),
 descriptor('local_research','Bounded host-mediated research',list('public_sources'),'host',list('Trusted local research host','Approved public retrieval and available providers'),'Keyless direct/native research where supported; general discovery quality and availability are not guaranteed.',null),
 descriptor('local_model_research','Host-mediated research with model review',list('candidate_plan','public_sources','challenge'),'hybrid',list('Trusted local research host','Approved model and public web access'),'Existing bounded host planning and review. Browser scheduling and native retrieval remain distinct.',null),
 descriptor('peer_browser','Published peer investigation',list('candidate_plan','challenge','peer_critique'),'model',list('Configured and approved caller model route','Separate exact peer artifact consent'),'Caller-side execution of the existing guide graph. Peer availability and independence are not established.',null)
]);
const validCapabilities=new Set(capabilityCatalog.map(c=>c.id));
const countBits=n=>{let c=0;while(n){n&=n-1;c++;}return c;};
function normalizeRequirements(required){
 if(!Array.isArray(required)||required.length>capabilityCatalog.length||new Set(required).size!==required.length||required.some(x=>!validCapabilities.has(x)))throw Error('CAPABILITY_REQUIREMENTS');
 return [...required].sort();
}
// Enumerate the small registry exactly. Coverage is a hard condition. Avoid
// invented costs/latencies: deterministic-only versus model/host and number of
// distinct workflows are structural comparisons, not empirical quality estimates.
export function composeAlternatives(required,{allowModel=true,allowHost=true,allowPeer=true,maxAlternatives=8}={}){
 const wanted=normalizeRequirements(required);
 if(!Number.isInteger(maxAlternatives)||maxAlternatives<1||maxAlternatives>16)throw Error('CAPABILITY_LIMIT');
 if(!wanted.length)return {requirements:wanted,missing:[],alternatives:[],qualification:'Choose explicit required capabilities. No workflow or agent is mandatory.'};
 const candidates=workflowRegistry.filter(w=>(allowModel||!['model','hybrid'].includes(w.kind))&&(allowHost||!['host','hybrid'].includes(w.kind))&&(allowPeer||!w.capabilities.includes('peer_critique'))&&w.capabilities.some(c=>wanted.includes(c)));
 const covered=new Set(candidates.flatMap(w=>w.capabilities));
 const missing=wanted.filter(c=>!covered.has(c)),coverable=wanted.filter(c=>covered.has(c));
 const target=(1<<coverable.length)-1;
 if(!target)return {requirements:wanted,missing,alternatives:[],qualification:'No supported route covers these requirements under the selected boundaries.'};
 const masks=candidates.map(w=>w.capabilities.reduce((m,c)=>{const i=coverable.indexOf(c);return i<0?m:m|(1<<i);},0));
 const choices=[];
 for(let subset=1;subset<(1<<candidates.length);subset++){
  let union=0;const members=[];
  for(let i=0;i<candidates.length;i++)if(subset&(1<<i)){union|=masks[i];members.push(i);}
  if(union!==target)continue;
  // Inclusion minimality: do not recommend a workflow whose requirements
  // are entirely covered by the other selected workflows.
  if(members.some(j=>members.filter(i=>i!==j).reduce((m,i)=>m|masks[i],0)===target))continue;
  const workflows=members.map(i=>candidates[i]);
  const modelRoutes=workflows.filter(w=>['model','hybrid'].includes(w.kind)).length,hostRoutes=workflows.filter(w=>['host','hybrid'].includes(w.kind)).length;
  const externalPeer=workflows.some(w=>w.capabilities.includes('peer_critique'));
  const definitionCounts=workflows.map(w=>w.agentDefinitions);
  choices.push({id:workflows.map(w=>w.id).join('+'),workflows,modelRoutes,hostRoutes,externalPeer,definitions:definitionCounts.every(n=>n!==null)?definitionCounts.reduce((a,b)=>a+b,0):null,
   capabilityCount:countBits(union),coverage:missing.length?'partial':'complete',
   conditions:[...new Set(workflows.flatMap(w=>w.conditions))],cost:modelRoutes||hostRoutes?'Unknown; inspect actual approved plan':'No model cost; local computation only'});
 }
 choices.sort((a,b)=>Number(a.externalPeer)-Number(b.externalPeer)||a.modelRoutes-b.modelRoutes||a.hostRoutes-b.hostRoutes||a.workflows.length-b.workflows.length||a.id.localeCompare(b.id));
 return {requirements:wanted,missing,alternatives:choices.slice(0,maxAlternatives),qualification:'Advisory coverage of selected capabilities using existing supported workflow entrypoints. Conditions and availability are not satisfied by this preview. Definitions are not runtime instances. Opening a workflow does not authorize it.'};
}
