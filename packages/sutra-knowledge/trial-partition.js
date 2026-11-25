// Exact descriptive partition audit, NOT a clinical decision system or meta-analysis.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {createVerifier} from './index.js';
export const VERSION='sutra-trial-partition/v2';
const QUAL='Descriptive observed event proportions and source-reported adjusted interval positions only. No adjusted model reconstruction, significance test, causal effect, equivalence, individual applicability, current guideline or treatment advice. Declared partitions and source lineage are not independently validated. Normalized extract pins are not original document authentication.';
const METRIC='age_adjusted_rate_ratio';
const keys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
const fail=code=>{throw TypeError(code);};
const id=x=>typeof x==='string'&&/^[a-z][a-z0-9_]{0,63}$/.test(x);
const str=x=>typeof x==='string'&&x.length>0&&x.length<=160&&!/[\u0000-\u001f\u007f]/.test(x)&&! /[\ud800-\udfff]/u.test(x);
const int=x=>Number.isSafeInteger(x)&&!Object.is(x,-0)&&x>=0&&x<=1e9;
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
function admit(text){
 const c=parseUniqueJson(text,{maxChars:65536,maxDepth:8});
 if(!keys(c,['version','studyId','sourceVersion','sourceLocator','population','endpoint','intervention','comparator','partition','aggregate','strata'])||c.version!==1||!id(c.studyId)||!id(c.sourceVersion)||![c.sourceLocator,c.population,c.endpoint,c.intervention,c.comparator,c.partition].every(str)||!Array.isArray(c.strata)||c.strata.length<2||c.strata.length>8)fail('TRIAL_SCHEMA');
 const rows=[c.aggregate,...c.strata];
 for(const r of rows){
  if(!keys(r,['id','treatedEvents','treatedTotal','controlEvents','controlTotal','adjusted'])||!id(r.id)||![r.treatedEvents,r.treatedTotal,r.controlEvents,r.controlTotal].every(int)||!r.treatedTotal||!r.controlTotal||r.treatedEvents>r.treatedTotal||r.controlEvents>r.controlTotal)fail('TRIAL_COUNTS');
  const a=r.adjusted;
  if(!keys(a,['metric','point','lower','upper','confidencePct'])||a.metric!==METRIC||a.confidencePct!==95||![a.point,a.lower,a.upper].every(int)||!a.point||!a.lower||a.lower>a.point||a.point>a.upper)fail('TRIAL_INTERVAL');
 }
 if(c.aggregate.id!=='aggregate'||c.strata.some(x=>x.id==='aggregate')||new Set(rows.map(r=>r.id)).size!==rows.length)fail('TRIAL_PARTITION');
 return c;
}
function graph(pin,r){
 // Exact normalized source bytes and row identity are part of every input receipt.
 const dim=[0,0,0],basis='trial '+pin+' '+r.id;
 const input=(id,v)=>({id,kind:'input',value:String(v),dimension:dim,basis});
 const derive=(id,op,a,b)=>({id,kind:'derive',op,args:[a,b]});
 const check=(id,op,a,b)=>({id,kind:'constraint',op,args:[a,b]});
 const nodes=[input('te',r.treatedEvents,'treated events'),input('tn',r.treatedTotal,'treated participants'),input('ce',r.controlEvents,'control events'),input('cn',r.controlTotal,'control participants'),input('adjusted_lower',r.adjusted.lower+'/100','reported adjusted lower bound'),input('adjusted_point',r.adjusted.point+'/100','reported adjusted point estimate'),input('adjusted_upper',r.adjusted.upper+'/100','reported adjusted upper bound'),input('one',1,'ratio null'),
 derive('treated_risk','div','te','tn'),derive('control_risk','div','ce','cn'),derive('risk_difference','sub','treated_risk','control_risk'),derive('crude_risk_ratio','div','treated_risk','control_risk'),
 check('strictly_lower','lt','treated_risk','control_risk'),check('strictly_higher','gt','treated_risk','control_risk'),check('upper_below_null','lt','adjusted_upper','one'),check('lower_above_null','gt','adjusted_lower','one')];
 return JSON.stringify({schemaVersion:1,nodes});
}
const yes=r=>r.outcome.status==='constraint_satisfied';
async function rowAudit(pin,r){
 const graphText=graph(pin,r),run=await createVerifier().evaluate(graphText),by=new Map(run.report.receipts.map(x=>[x.id,x]));
 const outcome=id=>by.get(id).outcome;
 const lower=yes(by.get('strictly_lower')),higher=yes(by.get('strictly_higher'));
 const interval= yes(by.get('upper_below_null'))?'BELOW_NULL':yes(by.get('lower_above_null'))?'ABOVE_NULL':'INCLUDES_NULL';
 return {id:r.id,counts:{treatedEvents:r.treatedEvents,treatedTotal:r.treatedTotal,controlEvents:r.controlEvents,controlTotal:r.controlTotal},observedDirection:lower?'LOWER':higher?'HIGHER':'EQUAL',treatedRisk:outcome('treated_risk').value,controlRisk:outcome('control_risk').value,riskDifference:outcome('risk_difference').value,crudeRiskRatio:outcome('crude_risk_ratio').value??null,crudeRiskRatioStatus:outcome('crude_risk_ratio').status,reportedAdjusted:{metric:METRIC,point:outcome('adjusted_point').value,lower:outcome('adjusted_lower').value,upper:outcome('adjusted_upper').value,confidencePct:95,intervalPosition:interval},graphText,report:run.report};
}
export async function auditTrialPartition(sourceText,expectedPin,mode){
 if(!['aggregate','partition'].includes(mode))fail('TRIAL_MODE');
 if(await casePin(sourceText)!==expectedPin)fail('TRIAL_PIN_MISMATCH');
 const c=admit(sourceText);
 const rows=[await rowAudit(expectedPin,c.aggregate)];
 let conservation=null;
 if(mode==='partition'){
  const fields=['treatedEvents','treatedTotal','controlEvents','controlTotal'];
  conservation=Object.fromEntries(fields.map(f=>[f,{aggregate:c.aggregate[f],sum:c.strata.reduce((n,r)=>n+r[f],0)}]));
  if(Object.values(conservation).some(x=>x.aggregate!==x.sum))fail('TRIAL_PARTITION_TOTALS');
  for(const r of c.strata)rows.push(await rowAudit(expectedPin,r));
 }
 const counters=rows.slice(1).filter(r=>r.observedDirection!=='LOWER').map(r=>r.id);
 const intervalNotBelow=rows.slice(1).filter(r=>r.reportedAdjusted.intervalPosition!=='BELOW_NULL').map(r=>r.id);
 return freeze({version:VERSION,sourceDigest:expectedPin,studyId:c.studyId,sourceVersion:c.sourceVersion,sourceLocator:c.sourceLocator,population:c.population,endpoint:c.endpoint,intervention:c.intervention,comparator:c.comparator,partition:c.partition,mode,rows,conservation,universalObservedLower:mode==='aggregate'?'NOT_TESTED':counters.length?'REFUTED_IN_DECLARED_PARTITION':'SUPPORTED_IN_DECLARED_PARTITION',descriptiveCounterexamples:mode==='aggregate'?null:counters,reportedIntervalsNotBelowNull:mode==='aggregate'?null:intervalNotBelow,universalCausalBenefit:'NOT_ESTABLISHED',qualification:QUAL});
}
export async function exportTrialPartition(sourceText,pin,mode){return freeze({version:VERSION,kind:'partition',sourceText,result:await auditTrialPartition(sourceText,pin,mode)});}
export async function compareTrialVersions(beforeText,beforePin,afterText,afterPin){
 const before=await auditTrialPartition(beforeText,beforePin,'partition'),after=await auditTrialPartition(afterText,afterPin,'partition');
 for(const k of ['studyId','population','endpoint','intervention','comparator','partition'])if(before[k]!==after[k])fail('TRIAL_VERSION_SCOPE');
 if(before.sourceVersion===after.sourceVersion||before.sourceDigest===after.sourceDigest)fail('TRIAL_VERSION_IDENTITY');
 const bm=new Map(before.rows.map(r=>[r.id,r])),am=new Map(after.rows.map(r=>[r.id,r]));
 if(bm.size!==am.size||[...bm.keys()].some(id=>!am.has(id)))fail('TRIAL_VERSION_PARTITION');
 const changes=[];
 for(const id of [...bm.keys()].sort()){
  const a=bm.get(id),b=am.get(id);
  for(const [group,fields] of [['counts',['treatedEvents','treatedTotal','controlEvents','controlTotal']],['reportedAdjusted',['point','lower','upper','intervalPosition']]])for(const field of fields)if(a[group][field]!==b[group][field])changes.push({id,field:group+'.'+field,before:a[group][field],after:b[group][field]});
 }
 return freeze({version:VERSION,kind:'comparison',beforeText,afterText,result:{studyId:before.studyId,beforeDigest:before.sourceDigest,afterDigest:after.sourceDigest,beforeVersion:before.sourceVersion,afterVersion:after.sourceVersion,declaredStudyRoots:1,changes,independentReplication:'NOT_ESTABLISHED',beforeUniversal:before.universalObservedLower,afterUniversal:after.universalObservedLower,qualification:QUAL}});
}
// Manually transcribed numerical facts, not article text or figure reproduction.
// Final and preliminary reports share the RECOVERY study; do not pool them.
export async function recoveryTrialFixture(version='final'){
 if(!['preliminary','final'].includes(version))fail('TRIAL_VERSION');
 const row=(id,te,tn,ce,cn,p,l,u)=>({id,treatedEvents:te,treatedTotal:tn,controlEvents:ce,controlTotal:cn,adjusted:{metric:METRIC,point:p,lower:l,upper:u,confidencePct:95}});
 const sourceText=JSON.stringify({version:1,studyId:'recovery_nct04381936',sourceVersion:version,sourceLocator:version==='final'?'NEJM 384:693-704 (2021), Fig 3; DOI 10.1056/NEJMoa2021436':'NEJM preliminary report (2020), Fig 3; PMC7383595',population:'Hospitalized COVID-19 trial participants',endpoint:'Death within 28 days after randomization',intervention:'Randomized dexamethasone assignment',comparator:'Randomized usual care assignment',partition:'Respiratory support at randomization',aggregate:row('aggregate',482,2104,1110,4321,83,75,93),strata:[row('invasive_ventilation',95,324,283,683,64,51,81),row('oxygen_only',298,1279,682,2604,82,72,94),row('no_respiratory_support',89,501,145,1034,119,version==='final'?92:91,155)]});
 return freeze({sourceText,pin:await casePin(sourceText)});
}
