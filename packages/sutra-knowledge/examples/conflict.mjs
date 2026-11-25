import {evaluateEvidenceSession,sourceDigest} from '../evidence-session.js';
// Fictional records deliberately conflict. No empirical measurements claimed.
const input=(id,value)=>({id,kind:'input',value:String(value),dimension:[0,0,0],basis:'Synthetic binary assumption'});
function graph(a,b){
 return JSON.stringify({schemaVersion:1,nodes:[input('a',a),input('b',b),input('one',1),
  {id:'sum',kind:'derive',op:'add',args:['a','b']},{id:'target',kind:'constraint',op:'le',args:['sum','one']}]});
}
export async function conflictFixture(){
 const scope='synthetic_binary_models',sources=[],texts={};
 for(const [id,node,value,lineage] of [['lab_a','a','0/1','sample_one'],['lab_copy','a','0/1','sample_one'],['lab_b','a','1/1','sample_two'],['lab_c','b','1/1','sample_three']]){
  const text=JSON.stringify({version:1,sourceId:id,sourceVersion:'v1',scope,values:{[node]:{value,dimension:[0,0,0]}}});
  texts[id]=text;sources.push({id,version:'v1',digest:await sourceDigest(text),lineage});
 }
 const worlds=[];
 for(let a=0;a<=1;a++)for(let b=0;b<=1;b++)worlds.push({id:'w'+a+b,graphText:graph(a,b),constraintId:'target'});
 const offers=[['read_a','a','lab_a',1],['read_copy','a','lab_copy',2],['read_b','a','lab_b',1],['read_c','b','lab_c',3]].map(([id,nodeId,sourceId,cost])=>({id,nodeId,sourceId,cost,dimension:[0,0,0]}));
 const caseText=JSON.stringify({version:1,decisionId:'sum_at_most_one',scope,costUnit:'synthetic_effort',worlds,sources,offers});
 const read=(id,source)=>({type:'read',observationId:id,sourceText:texts[source]});
 return {caseText,texts,read};
}
export async function demonstrateConflict(){
 const {caseText,read}=await conflictFixture();
 const events=[read('read_a','lab_a'),read('read_copy','lab_copy'),read('read_b','lab_b')];
 const conflict=await evaluateEvidenceSession(caseText,JSON.stringify(events));
 const withdrawn=await evaluateEvidenceSession(caseText,JSON.stringify([...events,{type:'withdraw_lineage',lineage:'sample_one'}]));
 const restored=await evaluateEvidenceSession(caseText,JSON.stringify([...events,{type:'withdraw_lineage',lineage:'sample_one'},{type:'restore_lineage',lineage:'sample_one'}]));
 if(conflict.status!=='inconsistent_observations'||JSON.stringify(conflict.conflict)!=='["read_a","read_b"]'||
 JSON.stringify(withdrawn.survivingWorlds)!=='["w10","w11"]'||withdrawn.activeEvidence.length!==1||
 restored.activeEvidence.length!==1)throw Error('EVIDENCE_SESSION_ORACLE_FAILED');
 return {caseText,events,conflict,withdrawn,restored};
}
