// Reported historical inputs from manually transcribed SEC filings; no live retrieval.
// A hash binds the normalized extract, NOT the publisher's original HTML or empirical truth.
import {casePin} from './pinned-investigation.js';
import {sourceDigest} from './evidence-session.js';
import {alignedInvestigationExport} from './aligned-investigation.js';
import {createVerifier} from './index.js';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const scope='microsoft_cashflow_fy25_fy26_usd_million',dimension=[0,0,0];
export const CASH_FLOW_SOURCES=freeze([
 {id:'fy25_filing',version:'sec_000095017025100235',url:'https://www.sec.gov/Archives/edgar/data/789019/000095017025100235/msft-20250630.htm',fields:{ocf25:136162,ppe25:64551}},
 {id:'fy26_filing',version:'sec_000119312526323660',url:'https://www.sec.gov/Archives/edgar/data/789019/000119312526323660/msft-20260630.htm',fields:{ocf25:136162,ppe25:64551,ocf26:182935,ppe26:115948}}
]);
export const CASH_FLOW_QUALIFICATION='Historical consolidated cash-flow amounts in USD millions for fiscal years ended June 30. Manually transcribed numeric facts from Part II Item 8 cash flow statements, accessed 2026-11-25. PPE is the positive magnitude of cash additions to property and equipment. Proxy = operating cash flow minus these cash additions only; not a standardized GAAP metric, all investment outflows, enterprise free cash flow, future cash flow or valuation. Hypothetical candidate combinations are not other reported FY2026 outcomes. Currency and fiscal scope are declared in basis; kernel only checks physical dimensions, not currencies or accounting semantics. Both filings share a conservative declared issuer root, not independently authenticated evidence. Normalized extract digests do not verify original filing HTML. Effort units are illustrative per-field reads, not acquisition costs. No investment advice.';
export async function microsoftCashFlowExample(){
 const worlds=[],sources=[],offers=[],reads={};
 const input=(id,v,basis)=>({id,kind:'input',value:String(v),dimension,basis});
 for(const ocf of [136162,182935])for(const ppe of [64551,115948]){
  const nodes=[input('ocf25',136162,'FY2025 operating cash flow, USD million'),input('ppe25',64551,'FY2025 cash PPE additions magnitude, USD million'),input('ocf26',ocf,'FY2026 operating cash flow candidate, USD million'),input('ppe26',ppe,'FY2026 cash PPE additions magnitude candidate, USD million'),
   {id:'proxy25',kind:'derive',op:'sub',args:['ocf25','ppe25']},{id:'proxy26',kind:'derive',op:'sub',args:['ocf26','ppe26']},{id:'delta',kind:'derive',op:'sub',args:['proxy26','proxy25']},{id:'ppe_limit',kind:'derive',op:'sub',args:['ocf26','proxy25']},{id:'target',kind:'constraint',op:'ge',args:['proxy26','proxy25']}];
  worlds.push({id:'ocf_'+ocf+'_ppe_'+ppe,graphText:JSON.stringify({schemaVersion:1,nodes}),constraintId:'target'});
 }
 for(const s of CASH_FLOW_SOURCES){
  const values=Object.fromEntries(Object.entries(s.fields).map(([node,v])=>[node,{value:v+'/1',dimension}]));
  const sourceText=JSON.stringify({version:1,sourceId:s.id,sourceVersion:s.version,scope,values});
  sources.push({id:s.id,version:s.version,digest:await sourceDigest(sourceText),lineage:'microsoft_issuer'});
  for(const node of Object.keys(s.fields)){
   const id='read_'+s.id+'_'+node;
   offers.push({id,nodeId:node,sourceId:s.id,cost:1,dimension});reads[id]={type:'read',observationId:id,sourceText};
  }
 }
 const caseText=JSON.stringify({version:1,decisionId:'cashflow_proxy_nondecreasing',scope,costUnit:'illustrative_field_read',worlds,sources,offers});
 const operatingOnly=[reads.read_fy25_filing_ocf25,reads.read_fy25_filing_ppe25,reads.read_fy26_filing_ocf26];
 const full=[...operatingOnly,reads.read_fy26_filing_ppe26,reads.read_fy26_filing_ocf25,reads.read_fy26_filing_ppe25];
 const withdrawn=[...full,{type:'withdraw_lineage',lineage:'microsoft_issuer'}];
 return freeze({caseText,pin:await casePin(caseText),operatingOnly,full,withdrawn,sources:CASH_FLOW_SOURCES,qualification:CASH_FLOW_QUALIFICATION});
}

// Recompute numeric diagnostics from the exact fixture and current history.
// Do not trust a UI stage label or prewritten expected answer.
export async function diagnoseMicrosoftCashFlow(caseText,pin,eventText='[]'){
 const f=await microsoftCashFlowExample();
 if(pin!==f.pin||caseText!==f.caseText)throw TypeError('FINANCE_FIXTURE_MISMATCH');
 const {result}=await alignedInvestigationExport(caseText,pin,eventText);
 const c=JSON.parse(caseText),worlds=[];
 for(const w of c.worlds.filter(w=>result.report.survivingWorlds.includes(w.id))){
  const run=await createVerifier().evaluate(w.graphText),by=new Map(run.report.receipts.map(r=>[r.id,r]));
  const verified=result.report.worlds.find(x=>x.id===w.id);
  if(verified.graphDigest!==run.report.graphDigest||verified.receiptDigest!==by.get(w.constraintId).receiptDigest)throw Error('FINANCE_RECEIPT_MISMATCH');
  const quantities=Object.fromEntries(['ocf25','ppe25','ocf26','ppe26','proxy25','proxy26','delta','ppe_limit'].map(id=>{
   const r=by.get(id),value=r?.outcome?.value;
   if(typeof value!=='string'||!/^(-?\d+)\/1$/.test(value))throw Error('FINANCE_EXPECTED_INTEGER');
   return [id,{value,receiptDigest:r.receiptDigest}];
  }));
  if(BigInt(quantities.delta.value.split('/')[0])!==BigInt(quantities.ppe_limit.value.split('/')[0])-BigInt(quantities.ppe26.value.split('/')[0]))throw Error('FINANCE_THRESHOLD_MISMATCH');
  worlds.push({id:w.id,decision:verified.decision,quantities});
 }
 return freeze({version:'sutra-cashflow-diagnostics/v1',caseDigest:pin,eventDigest:result.eventDigest,state:result.state,activeEvidence:result.report.activeEvidence,declaredRoots:result.rootSummary,priorReads:result.report.history.filter(h=>h.type==='read').length,worlds,qualification:CASH_FLOW_QUALIFICATION});
}
