// Offline assumptions only; never invoke a provider or mutate configuration.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {quotaLimits,sourceQuotaLimits,MAX_INPUT_BYTES,MAX_OUTPUT_TOKENS} from '../../services/sutra-api/quota.js';
export const GROUPS=Object.freeze(['01-strategy','02-foundations','03-browser-runtime','04-peer-trust','05-learner-experience','06-grounding-community','07-resilience-cost','08-validation','09-public-release','10-submission']);
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function effortBaseline(groups,reservePercent=15){
 if(!groups||typeof groups!=='object'||Object.keys(groups).length!==10||!GROUPS.every(k=>Object.hasOwn(groups,k))||!int(reservePercent,0,100))throw Error('Invalid effort input');
 let total=0;const owner={E:0,P:0,'E+P':0},workstreams=[];
 for(const [index,name] of GROUPS.entries()){
  const source=groups[name];if(typeof source!=='string')throw Error('Invalid checklist');
  const rows=[...source.matchAll(/^## Phase (\d{3}) - [^\n]+\n/gm)];
  if(rows.length!==10||source.split('\n').filter(l=>l.includes('**Baseline effort:**')).length!==10)throw Error('Expected ten estimates: '+name);
  let sum=0;
  for(const [offset,row] of rows.entries()){
   if(Number(row[1])!==index*10+offset+1)throw Error('Unexpected phase: '+row[1]);
   const section=source.slice(row.index,offset<9?rows[offset+1].index:source.length);
   const estimates=[...section.matchAll(/^- \*\*Baseline effort:\*\* (\d+(?:\.\d{1,2})?) person-hours; \*\*owner:\*\* (E\+P|P\+E|E|P)\.[ \t]*$/gm)];
   if(estimates.length!==1)throw Error('Malformed estimate: '+row[1]);
   const hours=Math.round(Number(estimates[0][1])*100);if(!int(hours,1,100000))throw Error('Invalid phase hours');
   sum+=hours;owner[estimates[0][2]==='P+E'?'E+P':estimates[0][2]]+=hours;
  }
  total+=sum;workstreams.push({name,phases:10,basePersonHours:sum/100});
 }
 const includingContingency=total*(100+reservePercent)/10000;
 return {phases:100,basePersonHours:total/100,reservePercent,contingencyPersonHours:total*reservePercent/10000,includingContingency,ownerPersonHours:Object.fromEntries(Object.entries(owner).map(([k,v])=>[k,v/100])),workstreams,availabilityScenarios:[2,4,6].map(combinedHoursPerDay=>({combinedHoursPerDay,daysForEntireOriginalBaseline:Math.ceil(includingContingency/combinedHoursPerDay)})),actualRemainingHours:null,actualDailyAvailability:null};
}
export function reservationCapacity(limits,{callsPerAttempt,inputBytesPerCall,requestedOutputPerCall,attemptsPerTask=1}){
 if(!limits||!int(limits.max,1,1000)||!int(limits.perClient,1,limits.max)||!int(limits.maxConcurrent,1,Math.min(10,limits.max))||!int(limits.maxInput,1,limits.max*MAX_INPUT_BYTES)||!int(limits.maxOutput,1,limits.max*MAX_OUTPUT_TOKENS)||!int(callsPerAttempt,1,8)||!int(attemptsPerTask,1,2)||!int(inputBytesPerCall,1,MAX_INPUT_BYTES)||!int(requestedOutputPerCall,64,MAX_OUTPUT_TOKENS))throw Error('Invalid scenario');
 const callsPerTask=callsPerAttempt*attemptsPerTask,maxReservations=Math.min(limits.max,Math.floor(limits.maxInput/inputBytesPerCall),Math.floor(limits.maxOutput/requestedOutputPerCall)),perClientReservations=Math.min(maxReservations,limits.perClient);
 return {callsPerAttempt,attemptsPerTask,callsPerTask,inputBytesPerCall,requestedOutputPerCall,maxReservations,perClientReservations,wholeTasksGlobal:Math.floor(maxReservations/callsPerTask),wholeTasksPerClient:Math.floor(perClientReservations/callsPerTask),unusedGlobalReservations:maxReservations%callsPerTask};
}
function configCapacity(vars){
 if(!vars||typeof vars!=='object')throw Error('Missing vars');
 const limits=quotaLimits(vars),output=Number(vars.SUTRA_MAX_OUTPUT_TOKENS),sourceLimits=sourceQuotaLimits(vars);
 if(!limits||!int(output,64,MAX_OUTPUT_TOKENS))throw Error('Invalid quota or output');
 if(vars.SUTRA_ENABLE_INFERENCE!=='false'||vars.SUTRA_MODELS!=='')throw Error('Requires disabled, unapproved inference');
 if((Object.hasOwn(vars,'SUTRA_MAX_DAILY_SOURCE_READS')||Object.hasOwn(vars,'SUTRA_MAX_CLIENT_SOURCE_READS'))&&!sourceLimits)throw Error('Invalid source quota');
 const base={inputBytesPerCall:Math.floor(MAX_INPUT_BYTES/2),requestedOutputPerCall:output};
 const scenario=(name,opts)=>({name,...reservationCapacity(limits,{...base,...opts})});
 const scenarios=[scenario('four-call-task',{callsPerAttempt:4}),scenario('eight-call-task',{callsPerAttempt:8}),scenario('four-call-doubled-json-bytes',{callsPerAttempt:4,inputBytesPerCall:MAX_INPUT_BYTES}),scenario('four-call-one-explicit-full-retry',{callsPerAttempt:4,attemptsPerTask:2})];
 if(output*2<=MAX_OUTPUT_TOKENS)scenarios.push(scenario('eight-call-doubled-output-reservation',{callsPerAttempt:8,requestedOutputPerCall:output*2}));
 return {inferenceEnabled:false,modelApproved:false,limits,sourceLimits,configuredRequestedOutputPerCall:output,scenarios};
}
export function buildCapacityWorksheet({groups,privateVars,assetWorkerVars,reservePercent=15}){
 const assumptions={callsPerAttempt:4,promptTokensPerCall:2000,completionTokensPerCall:400};
 const tokenScenarios=[['baseline',1,1],['doubled-context',2,1],['one-explicit-full-retry',1,2],['both',2,2]].map(([name,promptMultiplier,attempts])=>({name,modelCalls:4*attempts,assumedPromptTokens:8000*attempts*promptMultiplier,assumedCompletionTokens:1600*attempts,estimatedUsd:null}));
 return {schema:1,kind:'offline-planning-not-live-measurement',effort:effortBaseline(groups,reservePercent),privateWorker:configCapacity(privateVars),assetWorker:configCapacity(assetWorkerVars),tokenAssumptions:assumptions,tokenScenarios,actualProviderPrices:null,approvedSpendUsd:null,confirmedJudgingReserveUsd:null,actualHostingAndMediaCostUsd:null,limitations:['No automatic retry; retry scenario is one separate explicit full attempt.','Reservations include ambiguous and failed calls. Concurrency and latency may reduce throughput.','No price, actual tokens, billing headroom or hardware measurement is established.','Input bytes are not prompt tokens.','Original effort is not remaining work or available time.']};
}
export function readCapacityWorksheet(root=ROOT){
 const groups=Object.fromEntries(GROUPS.map(name=>[name,readFileSync(resolve(root,'docs/sutra/checklists',name+'.md'),'utf8')]));
 const vars=name=>JSON.parse(readFileSync(resolve(root,'services/sutra-api',name),'utf8')).vars;
 return buildCapacityWorksheet({groups,privateVars:vars('wrangler.private.jsonc'),assetWorkerVars:vars('wrangler.jsonc')});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)process.stdout.write(JSON.stringify(readCapacityWorksheet(),null,2)+'\n');
