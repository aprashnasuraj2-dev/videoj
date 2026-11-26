import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
const enc=new TextEncoder();
function locate(text,quote){const i=text.indexOf(quote);if(i<0||text.indexOf(quote,i+quote.length)!==-1)throw Error('PUBLIC_SOURCE_SPAN');const start=enc.encode(text.slice(0,i)).length;return {start,end:start+enc.encode(quote).length};}
const FINANCE_TEXT='SEC Apple 2025 Form 10-K fact card. Services net sales: 2025=109158 USD million; 2024=96169 USD million; reported change=14%; Total net sales: 2025=416161 USD million; 2024=391035 USD million; reported change=6%;';
const ENGINEERING_TEXT='FHWA-HIF-22-025 fact card. Iteration 3: phiVn=338 kip; Vu(DC)=213.4 kip; Vu(PS)=-1.1 kip; Vum(inv)=92.1 kip; reported shear load rating factor=1.36;';
const FINANCE_PIN='sha256:67e99e05e03e509da9cb8abc7da8d01f54d2f24eb6804e14bd6a21021a8837b5';
const ENGINEERING_PIN='sha256:e8e2d10f2fc6086052d11fb5b1a7ee94de6afb3bd013baac0a7f47a35ca1815e';
const financeSource={id:'sec_apple_2025',lineage:'sec_accession_000032019325000079',url:'https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm',locator:'2025 Form 10-K page 23; net sales by category table',retrieved:'2026-11-26',factCardText:FINANCE_TEXT,factCardPin:FINANCE_PIN};
const engineeringSource={id:'fhwa_hif_22_025',lineage:'fhwa_publication_hif_22_025',url:'https://www.fhwa.dot.gov/bridge/loadrating/pubs/hif22025.pdf',locator:'printed page 57, Table 2 and iteration 3 calculation; PDF page index 70 in repository verification',retrieved:'2026-11-26',factCardText:ENGINEERING_TEXT,factCardPin:ENGINEERING_PIN};
const money={kind:'currency_amount',unit:'USD_million',scope:'apple_fy2024_2025',dimension:[0,0,0]},ratio={kind:'ratio',unit:'one',scope:'apple_fy2024_2025',dimension:[0,0,0]},force={kind:'force',unit:'kip',scope:'fhwa_hif_22_025_iteration_3',dimension:[1,1,-2]};
async function contract(question,source,defs){
 if(await casePin(source.factCardText)!==source.factCardPin)throw Error('PUBLIC_SOURCE_PIN');
 const bindings=defs.map(([id,quote,type])=>({id,sourceId:source.id,...locate(source.factCardText,quote),type}));
 const sealed=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:source.id,lineage:source.lineage,text:source.factCardText}],bindings}));
 return {...sealed,source};
}
export async function financePublicSourceFixture(){
 const c=await contract('Did Services net sales grow faster than total net sales from 2024 to 2025?',financeSource,[['services25','109158',money],['services24','96169',money],['services_reported','14%',ratio],['total25','416161',money],['total24','391035',money],['total_reported','6%',ratio]]);
 const expressions={reported:'[services_reported]>[total_reported]',recomputed:'([services25]-[services24])/[services24] > ([total25]-[total24])/[total24]'},compiled={};
 for(const [id,e] of Object.entries(expressions))compiled[id]=await compileReviewedExpression(c.contractText,c.pin,e);
 return {...c,expressions,compiled,expected:{reported:'constraint_satisfied',recomputed:'constraint_satisfied'}};
}
export async function engineeringPublicSourceFixture(){
 const c=await contract('Does the FHWA iteration-3 shear margin imply a load rating factor above one?',engineeringSource,[['phiVn','338',force],['dead','213.4',force],['prestress','-1.1',force],['live','92.1',force],['reported_rf','1.36',{kind:'ratio',unit:'one',scope:'fhwa_hif_22_025_iteration_3',dimension:[0,0,0]}]]);
 const expressions={margin:'([phiVn]-[dead]-[prestress])>[live]',reported:'[reported_rf]>[reported_rf]-[reported_rf]'},compiled={};
 for(const [id,e] of Object.entries(expressions))compiled[id]=await compileReviewedExpression(c.contractText,c.pin,e);
 return {...c,expressions,compiled,expected:{margin:'constraint_satisfied',reported:'constraint_satisfied'}};
}
export const publicSourceSpecialistManifest=Object.freeze({version:1,sources:[financeSource,engineeringSource].map(x=>Object.freeze({...x})),qualification:'Compact manually transcribed fact cards from immutable government archival locators. The repository pins the fact-card bytes, not the entire external document. Arithmetic replay does not independently authenticate the external host or establish professional advice.'});
