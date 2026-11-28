const SHA=/^[a-f0-9]{40}$/i,ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/,ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys,required=keys)=>plain(o)&&Object.keys(o).every(k=>keys.includes(k))&&required.every(k=>Object.hasOwn(o,k));
// Generous explicit ceilings prevent overflow and imprecise integer token arithmetic.
const finitePrice=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1_000_000;
const tokens=v=>Number.isSafeInteger(v)&&v>=0&&v<=10_000_000;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const percentile=(values,p)=>{const s=[...values].sort((a,b)=>a-b);return s[Math.max(0,Math.ceil(p*s.length)-1)];};
export function buildProviderCostReport(input){
 const v2=input?.schema===2,top=v2?['schema','sourceRevision','provider','model','backend','routerPath','currency','priceBasis','monthlyRunScenario','runs']:['schema','sourceRevision','provider','model','currency','priceBasis','monthlyRunScenario','runs'];
 if(!exact(input,top)||![1,2].includes(input.schema)||!SHA.test(input.sourceRevision)||
  typeof input.provider!=='string'||!ID.test(input.provider)||typeof input.model!=='string'||!ID.test(input.model)||(v2&&(!['hosted','self_hosted'].includes(input.backend)||input.routerPath!=='/api/v1/chat/completions'))||input.currency!=='USD'||
  !Number.isInteger(input.monthlyRunScenario)||input.monthlyRunScenario<1||input.monthlyRunScenario>1_000_000)throw Error('Invalid measurement envelope.');
 const price=input.priceBasis;
 if(!exact(price,['promptPerMillion','completionPerMillion','effectiveAt','source'])||!finitePrice(price.promptPerMillion)||!finitePrice(price.completionPerMillion)||
  !ISO.test(price.effectiveAt)||!Number.isFinite(Date.parse(price.effectiveAt))||typeof price.source!=='string'||price.source.trim().length<4||price.source.length>500)throw Error('Invalid price basis.');
 if(!Array.isArray(input.runs)||!input.runs.length||input.runs.length>100)throw Error('One to 100 observed runs required.');
 const runIds=new Set(),runs=[];let incompleteRequests=0,totalRequests=0,totalRetries=0;const latencies=[];
 for(const raw of input.runs){
  if(!exact(raw,['id','outcome','observedAt','requests'])||typeof raw.id!=='string'||!ID.test(raw.id)||runIds.has(raw.id)||
   !['completed','failed','cancelled'].includes(raw.outcome)||!ISO.test(raw.observedAt)||!Number.isFinite(Date.parse(raw.observedAt))||Date.parse(raw.observedAt)<Date.parse(price.effectiveAt)||!Array.isArray(raw.requests)||!raw.requests.length||raw.requests.length>32)throw Error('Invalid observed run.');
  runIds.add(raw.id);let prompt=0,completion=0,knownCost=0,complete=true,retries=0;
  const sequences=new Set();
  const requests=[];
  for(const [index,req] of raw.requests.entries()){
   const keys=v2?['sequence','outcome','retry','latencyMs','usage']:['sequence','outcome','retry','usage'];
   if(!exact(req,keys)||!Number.isSafeInteger(req.sequence)||req.sequence!==index+1||sequences.has(req.sequence)||!['completed','failed','cancelled'].includes(req.outcome)||typeof req.retry!=='boolean'||index===0&&req.retry||
    v2&&(!Number.isSafeInteger(req.latencyMs)||req.latencyMs<0||req.latencyMs>120000))throw Error('Invalid provider request.');
   sequences.add(req.sequence);totalRequests++;if(req.retry){totalRetries++;retries++;}if(v2)latencies.push(req.latencyMs);
   let requestCost=0;
   if(req.usage===null){complete=false;incompleteRequests++;}
   else{
    if(!exact(req.usage,['promptTokens','completionTokens'])||!tokens(req.usage.promptTokens)||!tokens(req.usage.completionTokens))throw Error('Invalid token usage.');
    prompt+=req.usage.promptTokens;completion+=req.usage.completionTokens;requestCost=req.usage.promptTokens/1_000_000*price.promptPerMillion+req.usage.completionTokens/1_000_000*price.completionPerMillion;knownCost+=requestCost;
   }
   requests.push({sequence:req.sequence,outcome:req.outcome,retry:req.retry,latencyMs:v2?req.latencyMs:null,usageComplete:req.usage!==null,promptTokens:req.usage?.promptTokens??0,completionTokens:req.usage?.completionTokens??0,costUsd:req.usage!==null?requestCost:null,knownPartialCostUsd:requestCost});
  }
  runs.push({id:raw.id,outcome:raw.outcome,observedAt:raw.observedAt,requestCount:raw.requests.length,retries,promptTokens:prompt,completionTokens:completion,
   usageComplete:complete,costUsd:complete?knownCost:null,knownPartialCostUsd:knownCost,requests});
 }
 const completed=runs.filter(r=>r.outcome==='completed'),allCosts=runs.filter(r=>r.usageComplete).map(r=>r.costUsd),completedCosts=completed.filter(r=>r.usageComplete).map(r=>r.costUsd);
 const costComplete=incompleteRequests===0&&allCosts.length===runs.length;
 const allMean=costComplete?allCosts.reduce((a,b)=>a+b,0)/allCosts.length:null;
 const allP95=costComplete?percentile(allCosts,.95):null;
 const completedMean=costComplete&&completed.length?completedCosts.reduce((a,b)=>a+b,0)/completedCosts.length:null;
 const completedP95=costComplete&&completed.length?percentile(completedCosts,.95):null;
 const promptMean=costComplete?runs.reduce((s,r)=>s+r.promptTokens,0)/runs.length:null;
 const sensitivity=costComplete?{
  doubledPromptObservedRunMeanUsd:allMean+(promptMean/1_000_000*price.promptPerMillion),
  oneFullObservedRunRetryUsd:allMean*2
 }:null;
 const latencyComplete=v2&&latencies.length===totalRequests,requestLatencyMeanMs=latencyComplete?latencies.reduce((a,b)=>a+b,0)/latencies.length:null,requestLatencyP95Ms=latencyComplete?percentile(latencies,.95):null;
 return freeze({schema:v2?2:1,inputSchema:input.schema,sourceRevision:input.sourceRevision,provider:input.provider,model:input.model,backend:v2?input.backend:null,routerPath:v2?input.routerPath:null,currency:'USD',priceBasis:{...price},
  observed:{runs:runs.length,completedRuns:completed.length,failedRuns:runs.filter(r=>r.outcome==='failed').length,cancelledRuns:runs.filter(r=>r.outcome==='cancelled').length,
   providerRequests:totalRequests,retries:totalRetries,incompleteUsageRequests:incompleteRequests},
  costComplete,latencyComplete,requestLatencyMeanMs,requestLatencyP95Ms,observedRunMeanUsd:allMean,observedRunP95Usd:allP95,completedRunMeanUsd:completedMean,completedRunP95Usd:completedP95,
  monthlyRunScenario:input.monthlyRunScenario,projectedMonthlyUsd:costComplete?allMean*input.monthlyRunScenario:null,sensitivity,runs,
  limitation:costComplete?'Cost arithmetic uses the supplied dated provider price basis; it is not a billing guarantee.':'Cost metrics are intentionally null because at least one observed provider request lacks token usage.'});
}
