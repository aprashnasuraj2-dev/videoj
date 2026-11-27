const SHA=/^[a-f0-9]{40}$/i,ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/,ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys,required=keys)=>plain(o)&&Object.keys(o).every(k=>keys.includes(k))&&required.every(k=>Object.hasOwn(o,k));
// Generous explicit ceilings prevent overflow and imprecise integer token arithmetic.
const finitePrice=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1_000_000;
const tokens=v=>Number.isSafeInteger(v)&&v>=0&&v<=10_000_000;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const percentile=(values,p)=>{const s=[...values].sort((a,b)=>a-b);return s[Math.max(0,Math.ceil(p*s.length)-1)];};
export function buildProviderCostReport(input){
 if(!exact(input,['schema','sourceRevision','provider','model','currency','priceBasis','monthlyRunScenario','runs'])||input.schema!==1||!SHA.test(input.sourceRevision)||
  typeof input.provider!=='string'||!ID.test(input.provider)||typeof input.model!=='string'||!ID.test(input.model)||input.currency!=='USD'||
  !Number.isInteger(input.monthlyRunScenario)||input.monthlyRunScenario<1||input.monthlyRunScenario>1_000_000)throw Error('Invalid measurement envelope.');
 const price=input.priceBasis;
 if(!exact(price,['promptPerMillion','completionPerMillion','effectiveAt','source'])||!finitePrice(price.promptPerMillion)||!finitePrice(price.completionPerMillion)||
  !ISO.test(price.effectiveAt)||!Number.isFinite(Date.parse(price.effectiveAt))||typeof price.source!=='string'||price.source.trim().length<4||price.source.length>500)throw Error('Invalid price basis.');
 if(!Array.isArray(input.runs)||!input.runs.length||input.runs.length>100)throw Error('One to 100 observed runs required.');
 const runIds=new Set(),runs=[];let incompleteRequests=0,totalRequests=0,totalRetries=0;
 for(const raw of input.runs){
  if(!exact(raw,['id','outcome','observedAt','requests'])||typeof raw.id!=='string'||!ID.test(raw.id)||runIds.has(raw.id)||
   !['completed','failed','cancelled'].includes(raw.outcome)||!ISO.test(raw.observedAt)||!Number.isFinite(Date.parse(raw.observedAt))||Date.parse(raw.observedAt)<Date.parse(price.effectiveAt)||!Array.isArray(raw.requests)||!raw.requests.length||raw.requests.length>32)throw Error('Invalid observed run.');
  runIds.add(raw.id);let prompt=0,completion=0,knownCost=0,complete=true,retries=0;
  const sequences=new Set();
  for(const [index,req] of raw.requests.entries()){
   if(!exact(req,['sequence','outcome','retry','usage'])||!Number.isSafeInteger(req.sequence)||req.sequence!==index+1||sequences.has(req.sequence)||!['completed','failed','cancelled'].includes(req.outcome)||typeof req.retry!=='boolean'||index===0&&req.retry)throw Error('Invalid provider request.');
   sequences.add(req.sequence);totalRequests++;if(req.retry){totalRetries++;retries++;}
   if(req.usage===null){complete=false;incompleteRequests++;continue;}
   if(!exact(req.usage,['promptTokens','completionTokens'])||!tokens(req.usage.promptTokens)||!tokens(req.usage.completionTokens))throw Error('Invalid token usage.');
   prompt+=req.usage.promptTokens;completion+=req.usage.completionTokens;
   knownCost+=req.usage.promptTokens/1_000_000*price.promptPerMillion+req.usage.completionTokens/1_000_000*price.completionPerMillion;
  }
  runs.push({id:raw.id,outcome:raw.outcome,observedAt:raw.observedAt,requestCount:raw.requests.length,retries,promptTokens:prompt,completionTokens:completion,
   usageComplete:complete,costUsd:complete?knownCost:null,knownPartialCostUsd:knownCost});
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
 return freeze({schema:1,sourceRevision:input.sourceRevision,provider:input.provider,model:input.model,currency:'USD',priceBasis:{...price},
  observed:{runs:runs.length,completedRuns:completed.length,failedRuns:runs.filter(r=>r.outcome==='failed').length,cancelledRuns:runs.filter(r=>r.outcome==='cancelled').length,
   providerRequests:totalRequests,retries:totalRetries,incompleteUsageRequests:incompleteRequests},
  costComplete,observedRunMeanUsd:allMean,observedRunP95Usd:allP95,completedRunMeanUsd:completedMean,completedRunP95Usd:completedP95,
  monthlyRunScenario:input.monthlyRunScenario,projectedMonthlyUsd:costComplete?allMean*input.monthlyRunScenario:null,sensitivity,runs,
  limitation:costComplete?'Cost arithmetic uses the supplied dated provider price basis; it is not a billing guarantee.':'Cost metrics are intentionally null because at least one observed provider request lacks token usage.'});
}
