// Synthetic worked examples with identical source review and local compiler paths.
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function guidedLivingCase(domain,corrected=false){
 if(!['finance','engineering'].includes(domain)||typeof corrected!=='boolean')throw TypeError('GUIDED_CASE');
 const finance=domain==='finance',question=finance?'Did cash generation improve after capital spending?':'Can the network sustain peak demand if one shared route fails?';
 const type=finance?{kind:'currency_amount',unit:'USD_million',scope:'synthetic_same_entity_periods',dimension:[0,0,0]}:{kind:'capacity',unit:'Mbps',scope:'synthetic_same_peak_condition',dimension:[0,0,0]};
 const specs=finance?[
 ['cash_report','issuer',[['ocf_before','Earlier operating cash','120'],['ocf_now','Current operating cash','150']]],
 ['investment_report','issuer',[['capex_before','Earlier capital spending','30'],['capex_now','Current capital spending',corrected?'70':'50']]]
 ]:[
 ['load_report','load_test',[['nominal','Nominal capacity','100'],['peak','Peak demand','80']]],
 ['route_report','route_audit',[['surviving','Capacity after shared-route failure',corrected?'60':'90']]]
 ];
 const sources=[],bindings=[];
 for(const [sourceId,lineage,fields] of specs){
  let text='';
  for(const [id,label,value] of fields){
   text+=label+': ';const start=text.length;text+=value;
   bindings.push({id,sourceId,start,end:text.length,type});text+='; ';
  }
  sources.push({id:sourceId,lineage,text});
 }
 const draft={version:1,question,sources,bindings}, {contractText,pin}=await sealReviewedDraft(JSON.stringify(draft));
 const candidates=(finance?[
 ['operating_cash','Operating cash alone increased','ocf_now','[ocf_now] > [ocf_before]'],
 ['after_capital','Operating cash minus capital spending increased','capex_now','([ocf_now]-[capex_now]) > ([ocf_before]-[capex_before])']
 ]:[
 ['normal_capacity','Nominal capacity exceeds peak demand','nominal','[nominal] >= [peak]'],
 ['failure_capacity','Surviving capacity exceeds peak demand after shared-route failure','surviving','[surviving] >= [peak]']
 ]).map(([id,meaning,binding,formula])=>({id,meaning,binding,formula}));
 const proposals=[];
 for(const a of candidates){const r=await compileReviewedExpression(contractText,pin,a.formula);proposals.push({id:a.id,proposalText:r.proposalText});}
 return freeze({domain,corrected,draft,contractText,pin,proposals,candidates,
 title:finance?'Cash generation and capital spending':'Shared-route capacity and resilience',
 change:finance?'Corrected current capital spending: 50 to 70 synthetic USD million.':'Corrected surviving capacity: 90 to 60 synthetic Mbps.',
 qualification:'Synthetic worked example with predefined selections and expressions. No actual company, network, independent source review or professional conclusion.'});
}
