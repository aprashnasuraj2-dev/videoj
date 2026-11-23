const HASH=/^(?:[a-f0-9]{64}|sha256-[A-Za-z0-9+/]{43}=)$/i;
const COMMIT=/^[a-f0-9]{7,64}$/i;
const NAME=/^[A-Za-z0-9_.:@/# -]{1,160}$/;
const ERROR=/^[A-Z][A-Z0-9_]{1,63}$/;
const LIMIT_KEYS=['maxDepth','maxAgents','maxModelCalls','maxSteps','concurrency','timeoutMs','maxOutputChars','maxRemoteCalls','maxCallsPerPeer'];

function cleanText(value,fallback='unknown'){
 const text=String(value??'').trim();
 return NAME.test(text)?text:fallback;
}
function cleanCommit(value){const text=String(value??'');return COMMIT.test(text)?text:'unknown';}
function cleanHash(value){const text=String(value??'');return HASH.test(text)?text:'unknown';}
function cleanOrigin(value){
 try{const url=new URL(String(value));return url.origin;}catch{return null;}
}
function unique(values,max=32){return [...new Set(values.filter(Boolean))].sort().slice(0,max);}
function cleanLimits(input={}){
 const out={};
 for(const key of LIMIT_KEYS){const value=input?.[key];if(Number.isInteger(value)&&value>=0&&value<=1000000)out[key]=value;}
 return out;
}
function safeConsent(events=[]){
 const out=[];
 for(const event of events){
  if(out.length>=32||event?.type!=='decision')continue;
  const origin=cleanOrigin(event.origin);
  const kind=cleanText(event.contactKind,'unknown');
  const decision=['allow','deny'].includes(event.decision)?event.decision:'unknown';
  const scope=['once','session'].includes(event.scope)?event.scope:'once';
  out.push({origin,kind,decision,scope,remembered:Boolean(event.remembered)});
 }
 return out;
}
function safeRuntimeEvents(events=[]){
 const agents=[],tools=[],limits=[];
 for(const event of events){
  if(event?.phase==='start'&&event.kind==='agent'&&NAME.test(String(event.agent??'')))agents.push(event.agent);
  if(event?.phase==='start'&&event.kind==='tool'&&NAME.test(String(event.tool??'')))tools.push(event.tool);
  if(event?.kind==='composition_limit'&&NAME.test(String(event.limit??'')))limits.push(event.limit);
 }
 return {agents:unique(agents),tools:unique(tools),limitStops:unique(limits,8)};
}
function safeActionOutcomes(receipts=[]){
 return receipts.slice(0,16).map(receipt=>{
  const resultOutcome=receipt?.result?.outcome;
  const status=resultOutcome==='rejected'?'rejected':['succeeded','rejected','unknown','not_started'].includes(receipt?.status)?receipt.status:'unknown';
  return {action:cleanText(receipt?.action,'unknown'),requestId:cleanText(receipt?.requestId,'none'),status};
 });
}
function clone(value){return JSON.parse(JSON.stringify(value));}
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}

export function createProvenanceStore({specCommit,runtimeSha,buildSha,maxRuns=12,clock=()=>Date.now()}={}){
 if(!Number.isInteger(maxRuns)||maxRuns<1||maxRuns>32)throw new TypeError('maxRuns must be 1–32.');
 const fixed=freeze({specCommit:cleanCommit(specCommit),runtimeSha:cleanCommit(runtimeSha),buildSha:cleanCommit(buildSha)});
 const runs=[];let sequence=0,active=null;
 function begin({kind='run',graphSha='unknown',modelId='unknown',router='unknown',limits={}}={}){
  const startedAt=clock();if(!Number.isFinite(startedAt))throw new TypeError('clock must return a finite number.');
  active={id:`run-${++sequence}`,kind:cleanText(kind,'run'),startedAt,graphSha:cleanHash(graphSha),modelId:cleanText(modelId),router:cleanText(router),limits:cleanLimits(limits)};
  return active.id;
 }
 function finish({graphSha,modelId,router,origins=[],consentEvents=[],runtimeEvents=[],agentCalls=0,modelCalls=0,remoteCalls=0,errorCode='none',status='complete',actionReceipts=[]}={}){
  if(!active)throw new Error('No active provenance run.');
  const endedAt=clock(),runtime=safeRuntimeEvents(runtimeEvents);
  const run=freeze({
   ...fixed,id:active.id,kind:active.kind,status:['complete','failed','cancelled','partial'].includes(status)?status:'failed',
   graphSha:cleanHash(graphSha??active.graphSha),modelId:cleanText(modelId??active.modelId),router:cleanText(router??active.router),
   origins:unique(origins.map(cleanOrigin),16),consent:safeConsent(consentEvents),agents:runtime.agents,tools:runtime.tools,limitStops:runtime.limitStops,
   calls:{agent:Number.isInteger(agentCalls)&&agentCalls>=0?Math.min(agentCalls,1000):0,model:Number.isInteger(modelCalls)&&modelCalls>=0?Math.min(modelCalls,1000):0,remote:Number.isInteger(remoteCalls)&&remoteCalls>=0?Math.min(remoteCalls,1000):0},
   limits:active.limits,elapsedMs:Number.isFinite(endedAt)?Math.max(0,Math.min(3600000,Math.round(endedAt-active.startedAt))):0,
   error:ERROR.test(String(errorCode??''))?String(errorCode):'none',
   actions:safeActionOutcomes(actionReceipts)
  });
  runs.push(run);while(runs.length>maxRuns)runs.shift();active=null;return clone(run);
 }
 function recordAction(receipts=[]){
  const latest=runs.at(-1);if(!latest)return null;
  const updated=freeze({...clone(latest),actions:safeActionOutcomes(receipts)});
  runs[runs.length-1]=updated;return clone(updated);
 }
 function latest(){return runs.length?clone(runs.at(-1)):null;}
 function exportData(){return freeze({version:1,generatedAt:new Date(clock()).toISOString(),runs:clone(runs)});}
 return Object.freeze({begin,finish,recordAction,latest,exportData,size:()=>runs.length});
}
