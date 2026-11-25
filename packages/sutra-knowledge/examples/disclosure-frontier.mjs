import {casePin} from '../pinned-investigation.js';
import {economicsFixture} from './source-economics.mjs';
import {disclosureFrontierExport} from '../disclosure-frontier.js';
export async function disclosureFixture(budget,events=[],mutate=p=>p){
 const f=await economicsFixture(),c=JSON.parse(f.caseText),eventText=JSON.stringify(events);
 const action=(id,sourceId,observationIds,readCost,exposure)=>({id,sourceId,observationIds,readCost,exposure});
 const policyText=JSON.stringify(mutate({version:1,caseDigest:f.pin,eventDigest:await casePin(eventText),costUnit:c.costUnit,exposureUnit:'synthetic_exposure',exposureBudget:budget,sourceCosts:c.sources.map(s=>({id:s.id,cost:s.id==='bundle'?3:2})),initiallyAcquired:[],actions:[
 action('bundle_both','bundle',['bundle_load','bundle_capacity'],0,4),
 action('single_load','meter',['read_meter'],0,1),
 action('single_capacity','capacity_record',['read_capacity'],0,1)
 ]}));
 return disclosureFrontierExport(f.caseText,f.pin,eventText,policyText,await casePin(policyText));
}
