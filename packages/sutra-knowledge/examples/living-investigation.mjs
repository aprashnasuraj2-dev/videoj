import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft,draftComparisonProposal} from '../reviewed-draft.js';
import {FACETS} from '../semantic-investigation.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
// Two domain fixtures use exactly the same compiler, semantic and version path.
// Values are synthetic, no empirical claim.
export async function livingFixture(domain='finance',{revised=false,withdraw=false,previousDigest=null,irrelevant=false}={}){
 if(!['finance','engineering'].includes(domain))throw Error('FIXTURE_DOMAIN');
 const finance=domain==='finance',question=finance?'Did performance improve?':'Is the revised network resilient?';
 const type={kind:finance?'currency_amount':'capacity',unit:finance?'USD_million':'Mbps',scope:finance?'same_company_periods':'same_load_condition',dimension:[0,0,0]};
 const data=finance?
  [{id:'primary',lineage:'report',text:'Revenue before: 100; revenue after: 120'},{id:'secondary',lineage:'report',text:'Cash before: 30; cash after: '+(revised?'20':'40')}]:
  [{id:'primary',lineage:'measurements',text:'Nominal capacity: 100; demand: 80'},{id:'secondary',lineage:'route_audit',text:'Surviving capacity: '+(revised?'60':'90')+'; demand: 80'}];
 data.push({id:'context',lineage:'context_note',text:irrelevant?'Context revised':'Context original'});
 const sources=data.filter(s=>!(withdraw&&s.id==='secondary'));
 const tokens=finance?[['first','primary','120'],['baseline','primary','100'],['second','secondary',revised?'20':'40'],['other','secondary','30']]:
  [['first','primary','100'],['baseline','primary','80'],['second','secondary',revised?'60':'90'],['other','secondary','80']];
 const bindings=tokens.filter(([,s])=>sources.some(x=>x.id===s)).map(([id,sourceId,token])=>{
  const text=sources.find(s=>s.id===sourceId).text,start=text.indexOf(token);return {id,sourceId,start,end:start+token.length,type};
 });
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources,bindings}));
 const a=await draftComparisonProposal(contractText,pin,'first','baseline','gt');
 let b;
 if(withdraw){const p=JSON.parse(a);p.nodes[0]={id:'left_value',kind:'unknown',type,reason:'Secondary source withdrawn; no reviewed replacement.'};p.nodes[1]={id:'right_value',kind:'unknown',type,reason:'Secondary comparison baseline withdrawn.'};b=JSON.stringify(p);}
 else b=await draftComparisonProposal(contractText,pin,'second','other','gt');
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals:[{id:'primary_view',proposalText:a},{id:'secondary_view',proposalText:b}]});
 const facet=()=>Object.fromEntries(FACETS.map(k=>[k,null]));
 const candidates=[{id:'primary_view',meaning:finance?'Revenue growth':'Nominal capacity exceeds demand',facets:facet()},{id:'secondary_view',meaning:finance?'Cash generation growth':'Surviving capacity exceeds demand after failure',facets:facet()}];
 candidates[0].facets.definition={statement:candidates[0].meaning,references:[{kind:'binding',id:'first'},{kind:'binding',id:'baseline'}]};
 candidates[1].facets.definition={statement:candidates[1].meaning,references:withdraw?[]:[{kind:'binding',id:'second'},{kind:'binding',id:'other'}]};
 const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 return sealInvestigationVersion({previousDigest,contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
}
