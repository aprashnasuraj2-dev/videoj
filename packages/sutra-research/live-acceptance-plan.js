// Fixed public benchmark objectives, never prompts containing private information.
// These are operational acceptance targets; independent factual scoring is separate.
export const LIVE_ACCEPTANCE_CASES=Object.freeze([
 ['n01','no_web','Without external evidence, compute 7/20 as a percentage and show the fraction conversion.'],
 ['n02','no_web','Without external evidence, compute the percentage point change from 12 percent to 15 percent.'],
 ['e01','evidence','Find public source evidence for the definition of one astronomical unit in metres.'],
 ['e02','evidence','Find public source evidence for the definition of an SI second.'],
 ['e03','evidence','Find published evidence for the structure of the DNA double helix and identify its historical source.'],
 ['e04','evidence','Find public source evidence for what the ozone layer absorbs and where it is concentrated.'],
 ['e05','evidence','Find public source evidence distinguishing IPv4 and IPv6 address lengths.'],
 ['e06','evidence','Find a public reference explaining the distinction between energy and power in electrical engineering.'],
 ['t01','comparison','Compare published US battery storage capacity additions planned for 2024 with subsequently reported additions; preserve forecast and actual distinctions.'],
 ['t02','comparison','Compare dated estimates of global mean temperature anomalies; distinguish the temperature baseline and reporting period.'],
 ['t03','comparison','Compare public measures of nominal and real gross domestic product and identify their price bases.'],
 ['t04','comparison','Compare definitions of installed photovoltaic capacity and annual electricity generation; preserve units and time periods.'],
 ['t05','comparison','Compare public definitions of unemployment rate and labor force participation rate; identify denominators.'],
 ['t06','comparison','Compare public definitions of infant mortality and under-five mortality; retain population, interval and units.'],
 ['c01','comparison','Find published evidence about the effectiveness and limitations of randomized versus observational studies for causal inference.'],
 ['c02','comparison','Find competing public evidence about the benefits and limitations of using citation counts to evaluate scientific research.'],
 ['c03','comparison','Find public evidence comparing precision and recall, including a counterexample to using accuracy alone on imbalanced datasets.'],
 ['c04','comparison','Find public evidence comparing battery energy storage efficiency and round-trip efficiency; report scope rather than treating metrics as interchangeable.'],
 ['m01','evidence','Find public evidence on how confidence intervals differ from prediction intervals; identify conditions of the interpretation.'],
 ['m02','evidence','Find public evidence describing Simpson paradox and why aggregation can reverse an apparent association.']
].map(([id,target,objective])=>Object.freeze({id,target,objective})));
const exact=(x,keys)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const bound=(x,lo,hi)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const fail=code=>{throw Object.assign(Error('Live acceptance refused: '+code),{code});};
export function buildLiveAcceptancePlan(config){
 if(!exact(config,['mode','caseIds','models','maxEstimatedCostMicros'])||!['discovery','model'].includes(config.mode)||!Array.isArray(config.caseIds)||!config.caseIds.length||config.caseIds.length>20||new Set(config.caseIds).size!==config.caseIds.length||!Array.isArray(config.models)||!bound(config.maxEstimatedCostMicros,1,20000000))fail('SUITE_CONFIG');
 const modelMode=config.mode==='model';
 if(config.models.length<(modelMode?1:0)||config.models.length>(modelMode?2:0)||config.models.some(m=>!exact(m,['vendor','model','estimatedMaxCostMicros'])||!['gemini','groq','openai','anthropic','openrouter'].includes(m.vendor)||typeof m.model!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(m.model)||['openrouter/auto','openrouter/free'].includes(m.model)||!bound(m.estimatedMaxCostMicros,1,166666))||new Set(config.models.map(m=>m.vendor+'\0'+m.model)).size!==config.models.length)fail('SUITE_MODELS');
 const selected=config.caseIds.map(id=>LIVE_ACCEPTANCE_CASES.find(c=>c.id===id));
 if(selected.some(c=>!c)||!modelMode&&selected.some(c=>c.target==='no_web'))fail('SUITE_CASES');
 const maxModelCost=Math.max(0,...config.models.map(m=>m.estimatedMaxCostMicros));
 const cases=selected.map(c=>{
  const providers=c.target==='no_web'?[]:['wikipedia','crossref','europepmc'].map(id=>({id,estimatedMaxCostMicros:1}));
  const budget={maxSearches:3,maxDocuments:4,maxLinkDepth:1,maxDurationSeconds:90,maxDownloadBytes:5*1024*1024,maxCostMicros:3+(modelMode?6*maxModelCost:0),...(modelMode?{maxModelCalls:6}:{})};
  const manifest={schema:'sutra-autonomous-research/v1',objective:c.objective,scope:{publicWeb:true,queryDisclosureAllowed:true,allowPrivateNetworks:false,allowAuthentication:false,allowExternalWrites:false,privateEvidenceDisclosureAllowed:false,allowCrossOriginLinks:true,allowRedirects:true,allowPublicQueryParameters:false,allowModelPublicUrls:false,allowPdf:false},budget,providers,...(modelMode?{modelPolicy:{allowPublicEvidenceDisclosure:true,webAccess:'on_demand',models:config.models.map(m=>({...m,maxInputBytes:32768,maxOutputTokens:512}))}}:{})};
  return {id:c.id,target:c.target,manifestText:JSON.stringify(manifest),budget};
 });
 const aggregate={cases:cases.length,maxSearches:cases.reduce((n,c)=>n+(c.target==='no_web'?0:c.budget.maxSearches),0),maxDocuments:cases.reduce((n,c)=>n+(c.target==='no_web'?0:c.budget.maxDocuments),0),maxModelCalls:modelMode?cases.length*6:0,maxEstimatedCostMicros:cases.reduce((n,c)=>n+c.budget.maxCostMicros,0),maxDownloadBytes:cases.length*5*1024*1024,maxDurationSeconds:cases.length*90};
 if(aggregate.maxEstimatedCostMicros>config.maxEstimatedCostMicros)fail('SUITE_COST_CAP');
 return {schema:'sutra-live-acceptance-plan/v1',mode:config.mode,models:config.models.map(m=>({...m})),approvedMaximumEstimatedCostMicros:config.maxEstimatedCostMicros,aggregate,cases,authority:'NONE',qualification:'Estimates are reservation limits, not actual vendor prices or invoice guarantees. Public endpoints may reject or throttle. No automatic fallback or retry.'};
}
export function acceptanceOutcome({target,mode,searches,documents,passages,distinctHosts,modelCalls,receiptCount,noWebAnswer,reviewedClaims,integrity}){
 if(integrity!==true)return 'INTEGRITY_FAILURE';
 if(target==='no_web')return mode==='model'&&noWebAnswer&&searches===0&&documents===0&&receiptCount>0?'NO_WEB_OPERATIONAL_PASS':'NO_WEB_REQUIREMENT_UNMET';
 if(searches===0||documents===0||passages===0)return 'LIVE_EVIDENCE_REQUIREMENT_UNMET';
 if(target==='comparison'&&distinctHosts<2)return 'MULTI_ORIGIN_REQUIREMENT_UNMET';
 if(mode==='model'&&(modelCalls===0||receiptCount===0||reviewedClaims===0))return 'MODEL_REVIEW_REQUIREMENT_UNMET';
 return 'OPERATIONAL_PASS_REQUIRES_FACTUAL_REVIEW';
}
