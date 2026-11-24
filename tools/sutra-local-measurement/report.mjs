const SHA40=/^[a-f0-9]{40}$/i,SHA256=/^[a-f0-9]{64}$/,ID=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/,ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys,required=keys)=>plain(o)&&Object.keys(o).every(k=>keys.includes(k))&&required.every(k=>Object.hasOwn(o,k));
const finite=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const integer=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const percentile=(values,p)=>{const s=[...values].sort((a,b)=>a-b);return s[Math.max(0,Math.ceil(p*s.length)-1)];};
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};

export function buildSelfHostedResourceReport(input){
 if(!exact(input,['schema','sourceRevision','backend','model','gatewaySha256','engine','weights','hardware','costBasis','monthlyRunScenario','batches'])||
  input.schema!==1||!SHA40.test(input.sourceRevision)||input.backend!=='self_hosted'||typeof input.model!=='string'||!ID.test(input.model)||!SHA256.test(input.gatewaySha256)||
  !integer(input.monthlyRunScenario,1,1_000_000)||!Array.isArray(input.batches)||!input.batches.length||input.batches.length>100)throw Error('Invalid self-hosted measurement envelope.');
 const engine=input.engine;
 if(!exact(engine,['name','version'])||typeof engine.name!=='string'||!engine.name.trim()||engine.name.length>100||typeof engine.version!=='string'||!engine.version.trim()||engine.version.length>100)throw Error('Invalid engine identity.');
 const weights=input.weights;
 if(!exact(weights,['sha256','license','source'])||!SHA256.test(weights.sha256)||typeof weights.license!=='string'||weights.license.trim().length<2||weights.license.length>200||typeof weights.source!=='string'||weights.source.trim().length<4||weights.source.length>500)throw Error('Invalid model weights evidence.');
 const hardware=input.hardware;
 if(!exact(hardware,['gpuModel','vramGiB','systemRamGiB'])||typeof hardware.gpuModel!=='string'||hardware.gpuModel.trim().length<2||hardware.gpuModel.length>160||!finite(hardware.vramGiB,.1,1024)||!finite(hardware.systemRamGiB,.1,4096))throw Error('Invalid hardware evidence.');
 const cost=input.costBasis;
 if(!exact(cost,['electricityUsdPerKwh','hardwareAmortizationUsdPerHour','effectiveAt','source'])||!finite(cost.electricityUsdPerKwh,0,100)||!finite(cost.hardwareAmortizationUsdPerHour,0,10000)||!ISO.test(cost.effectiveAt)||!Number.isFinite(Date.parse(cost.effectiveAt))||typeof cost.source!=='string'||cost.source.trim().length<4||cost.source.length>500)throw Error('Invalid self-hosted cost basis.');
 const batchIds=new Set(),requestIds=new Set(),runs=[],latencies=[],completedLatencies=[],byConcurrency=new Map();
 let attempts=0,completed=0,failed=0,cancelled=0,modelCalls=0,retries=0,promptTokens=0,completionTokens=0,unknownUsage=0,totalEnergyWh=0,totalWallMs=0;
 for(const raw of input.batches){
  if(!exact(raw,['id','observedAt','concurrency','durationMs','energyWh','requests'])||typeof raw.id!=='string'||!ID.test(raw.id)||batchIds.has(raw.id)||!ISO.test(raw.observedAt)||!Number.isFinite(Date.parse(raw.observedAt))||!integer(raw.concurrency,1,16)||!finite(raw.durationMs,1,3_600_000)||!finite(raw.energyWh,0,100_000)||!Array.isArray(raw.requests)||raw.requests.length!==raw.concurrency)throw Error('Invalid self-hosted batch.');
  batchIds.add(raw.id);totalEnergyWh+=raw.energyWh;totalWallMs+=raw.durationMs;
  const row={id:raw.id,observedAt:raw.observedAt,concurrency:raw.concurrency,durationMs:raw.durationMs,energyWh:raw.energyWh,attempts:raw.requests.length,completed:0,failed:0,cancelled:0};
  const group=byConcurrency.get(raw.concurrency)??{concurrency:raw.concurrency,latencies:[],completed:0,failed:0,cancelled:0,batches:0};group.batches++;
  for(const req of raw.requests){
   if(!exact(req,['id','outcome','latencyMs','modelCalls','retryCount','usage'])||typeof req.id!=='string'||!ID.test(req.id)||requestIds.has(req.id)||!['completed','failed','cancelled'].includes(req.outcome)||!finite(req.latencyMs,0,3_600_000)||!integer(req.modelCalls,0,32)||!integer(req.retryCount,0,32))throw Error('Invalid self-hosted request.');
   requestIds.add(req.id);attempts++;modelCalls+=req.modelCalls;retries+=req.retryCount;latencies.push(req.latencyMs);group.latencies.push(req.latencyMs);row[req.outcome]++;group[req.outcome]++;
   if(req.outcome==='completed'){completed++;completedLatencies.push(req.latencyMs);}else if(req.outcome==='failed')failed++;else cancelled++;
   if(req.usage===null){unknownUsage++;continue;}
   if(!exact(req.usage,['promptTokens','completionTokens'])||!integer(req.usage.promptTokens,0,10_000_000)||!integer(req.usage.completionTokens,0,10_000_000))throw Error('Invalid token usage.');
   promptTokens+=req.usage.promptTokens;completionTokens+=req.usage.completionTokens;
  }
  byConcurrency.set(raw.concurrency,group);runs.push(row);
 }
 const energyCostUsd=totalEnergyWh/1000*cost.electricityUsdPerKwh;
 const hardwareTimeCostUsd=totalWallMs/3_600_000*cost.hardwareAmortizationUsdPerHour;
 const operationalCostUsd=energyCostUsd+hardwareTimeCostUsd;
 const concurrency=[...byConcurrency.values()].sort((a,b)=>a.concurrency-b.concurrency).map(g=>({concurrency:g.concurrency,batches:g.batches,attempts:g.latencies.length,completed:g.completed,failed:g.failed,cancelled:g.cancelled,latencyP50Ms:percentile(g.latencies,.5),latencyP95Ms:percentile(g.latencies,.95)}));
 const usageComplete=unknownUsage===0;
 const meanCost=operationalCostUsd/attempts;
 return freeze({schema:1,kind:'self_hosted_resource',sourceRevision:input.sourceRevision,backend:'self_hosted',model:input.model,gatewaySha256:input.gatewaySha256,engine:{...engine},weights:{...weights},hardware:{...hardware},costBasis:{...cost},
  observed:{batches:runs.length,attempts,completed,failed,cancelled,modelCalls,retries,unknownUsageRequests:unknownUsage,totalEnergyWh,totalWallMs,promptTokens,completionTokens},
  usageComplete,latencyP50Ms:percentile(latencies,.5),latencyP95Ms:percentile(latencies,.95),completedLatencyP50Ms:completedLatencies.length?percentile(completedLatencies,.5):null,completedLatencyP95Ms:completedLatencies.length?percentile(completedLatencies,.95):null,
  energyWhPerAttempt:totalEnergyWh/attempts,energyCostUsd,hardwareTimeCostUsd,observedOperationalCostUsd:operationalCostUsd,observedAttemptMeanUsd:meanCost,monthlyRunScenario:input.monthlyRunScenario,projectedMonthlyOperationalUsd:meanCost*input.monthlyRunScenario,
  concurrency,runs,
  limitation:'Operational cost covers only the supplied electricity and hardware-amortization basis. It excludes network, tunnel, labor, taxes, replacement risk and any unobserved infrastructure cost. Synthetic input cannot establish real hardware performance.'
 });
}
