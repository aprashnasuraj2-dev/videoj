// Synthetic worked examples with identical source review and local compiler paths.
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function guidedLivingCase(domain,corrected=false){
 if(!['finance','engineering','statistics','two-groups'].includes(domain)||typeof corrected!=='boolean')throw TypeError('GUIDED_CASE');
 if(domain==='statistics')return statisticalCase(corrected);
 if(domain==='two-groups')return twoGroupCase(corrected);
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

async function statisticalCase(corrected){
 const question='Under a declared binomial null, does the observed success count exceed the threshold?',type={kind:'count',unit:'trials',scope:'synthetic_fixed_sample',dimension:[0,0,0]},sources=[],bindings=[];
 let text='';for(const [id,label,value] of [['success','Successes',corrected?'8':'9'],['trials','Trials','10'],['failure','Failures',corrected?'2':'1']]){text+=label+': ';const start=text.length;text+=value;bindings.push({id,sourceId:'sample',start,end:text.length,type});text+='; ';}
 sources.push({id:'sample',lineage:'synthetic',text});
 const draft={version:1,question,sources,bindings},{contractText,pin}=await sealReviewedDraft(JSON.stringify(draft));
 const candidates=[{id:'count_consistency',meaning:'Success count does not exceed trial count',binding:'trials',formula:'[success]<=[trials]'},{id:'observed_majority',meaning:'Observed successes exceed failures',binding:'success',formula:'[success]>[failure]'}],proposals=[];
 for(const a of candidates){const r=await compileReviewedExpression(contractText,pin,a.formula);proposals.push({id:a.id,proposalText:r.proposalText});}
 return freeze({domain:'statistics',corrected,draft,contractText,pin,proposals,candidates,title:'Synthetic binary outcome audit',change:'Corrected successes from 9 to 8 and failures from 1 to 2 in 10 trials.',qualification:'Synthetic counts only. Fixed sample, common probability, independence, sampling, missingness and prespecification are not established.'});
}

async function twoGroupCase(corrected){
 const question='Under a declared equal-odds null, how do the two synthetic binary outcome groups compare?',sources=[],bindings=[];
 for(const [sourceId,scope,fields] of [['group_a','synthetic_group_a',[['as','Group A successes',corrected?'6':'8'],['an','Group A trials','10']]],['group_b','synthetic_group_b',[['bs','Group B successes','2'],['bn','Group B trials','10']]]]){
  let text='';for(const [id,label,value] of fields){text+=label+': ';const start=text.length;text+=value;bindings.push({id,sourceId,start,end:text.length,type:{kind:'count',unit:'trials',scope,dimension:[0,0,0]}});text+='; ';}
  sources.push({id:sourceId,lineage:'synthetic_same_record',text});
 }
 const draft={version:1,question,sources,bindings},{contractText,pin}=await sealReviewedDraft(JSON.stringify(draft));
 const candidates=[{id:'a_counts',meaning:'Group A count does not exceed its trial count',binding:'an',formula:'[as]<=[an]'},{id:'b_counts',meaning:'Group B count does not exceed its trial count',binding:'bn',formula:'[bs]<=[bn]'}],proposals=[];
 for(const a of candidates){const r=await compileReviewedExpression(contractText,pin,a.formula);proposals.push({id:a.id,proposalText:r.proposalText});}
 return freeze({domain:'two-groups',corrected,draft,contractText,pin,proposals,candidates,title:'Synthetic comparison of two binary outcome groups',change:'Corrected group A successes from 8 to 6 of 10; group B unchanged at 2 of 10.',qualification:'Predefined synthetic counts. Separate group scopes do not establish independence, comparable outcomes, assignment or absence of confounding.'});
}
