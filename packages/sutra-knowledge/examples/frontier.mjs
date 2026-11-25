import {beamGraph} from './beam.mjs';
import {evaluateFrontier} from '../frontier.js';
// Hypotheses and costs are synthetic, not measurements or engineering prices.
export function frontierCase(){
 const worlds=[];
 for(const [s,E] of [['low','2500000000'],['high','10000000000']])for(const [l,load] of [['light','5000'],['heavy','20000']]){
  const g=JSON.parse(beamGraph(E));g.nodes.find(n=>n.id==='load').value=load;
  worlds.push({id:s+'_'+l,graphText:JSON.stringify(g),constraintId:'deflection_limit'});
 }
 const obs=(id,cost,fn)=>({id,cost,outcomes:Object.fromEntries(worlds.map(w=>[w.id,fn(w.id)]))});
 return JSON.stringify({version:1,decisionId:'beam_limit',costUnit:'synthetic_effort',worlds,observations:[
  obs('measure_stiffness',2,x=>x.split('_')[0]),obs('measure_load',5,x=>x.split('_')[1]),
  obs('direct_deflection',9,x=>x==='high_light'?'within':'exceeds')
 ]});
}
export async function demonstrateFrontier(){
 const result=await evaluateFrontier(frontierCase());
 if(result.status!=='conditional_observation_plan'||result.plan.observationId!=='measure_stiffness'||result.plan.worstCost!==7||result.plan.bestCost!==2)throw Error('FRONTIER_ORACLE_FAILED');
 const c=JSON.parse(frontierCase());c.observations=c.observations.filter(o=>o.id==='measure_stiffness');
 const insufficient=await evaluateFrontier(JSON.stringify(c));
 if(insufficient.status!=='insufficient_observations'||!insufficient.witness)throw Error('FRONTIER_ABSTENTION_FAILED');
 return {result,insufficient};
}
