import {casePin,capacityExample} from '../pinned-investigation.js';
import {sourceDigest} from '../evidence-session.js';
import {sourceEconomicsExport} from '../source-economics.js';
export async function economicsFixture(){
 const old=await capacityExample(),c=JSON.parse(old.caseText);
 c.worlds=c.worlds.filter(w=>!w.id.startsWith('load_20_'));
 c.sources=c.sources.filter(s=>['meter','capacity_record'].includes(s.id));
 c.offers=c.offers.filter(o=>['read_meter','read_capacity'].includes(o.id)).map(o=>({...o,cost:2}));
 const dimension=[0,0,0],sourceText=JSON.stringify({version:1,sourceId:'bundle',sourceVersion:'v1',scope:c.scope,values:{load:{value:'30/1',dimension},capacity:{value:'20/1',dimension}}});
 c.sources.push({id:'bundle',version:'v1',digest:await sourceDigest(sourceText),lineage:'bundle_root'});
 c.offers.push({id:'bundle_load',nodeId:'load',sourceId:'bundle',cost:3,dimension},{id:'bundle_capacity',nodeId:'capacity',sourceId:'bundle',cost:3,dimension});
 const caseText=JSON.stringify(c),pin=await casePin(caseText);
 async function run(events=[],acquired=[],mutate=e=>e){
  const eventText=JSON.stringify(events),economicText=JSON.stringify(mutate({version:1,caseDigest:pin,eventDigest:await casePin(eventText),costUnit:c.costUnit,sourceCosts:c.sources.map(s=>({id:s.id,cost:s.id==='bundle'?3:2})),fieldCosts:c.offers.map(o=>({id:o.id,cost:0})),initiallyAcquired:acquired}));
  return sourceEconomicsExport(caseText,pin,eventText,economicText,await casePin(economicText));
 }
 return {caseText,pin,run,sourceText,reads:old.reads};
}
