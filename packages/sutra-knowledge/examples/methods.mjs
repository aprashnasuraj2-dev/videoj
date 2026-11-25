import {beamGraph} from './beam.mjs';
// Same idealized beam assumptions, two explicit derivations of I. This is
// method diversity, not independent empirical confirmation or formula proof.
export function derivedSectionGraph(modulus='10000000000'){
 const graph=JSON.parse(beamGraph(modulus));
 const q=(id,value,dimension,basis)=>({id,kind:'input',value,dimension,basis});
 const d=(id,op,a,b)=>({id,kind:'derive',op,args:[a,b]});
 graph.nodes=graph.nodes.filter(n=>n.id!=='I');
 graph.nodes.push(q('width','1/5',[1,0,0],'Declared section width, metres'),
  q('height','3/10',[1,0,0],'Declared section height, metres'),
  q('c12','12',[0,0,0],'Rectangular second moment coefficient'),
  d('h2','mul','height','height'),d('h3','mul','h2','height'),
  d('bh3','mul','width','h3'),d('I','div','bh3','c12'));
 return JSON.stringify(graph);
}
export function beamCase(modulus='10000000000'){
 return JSON.stringify({obligationId:'beam_deflection',methods:[
  {id:'section_declared',constraintId:'deflection_limit',graphText:beamGraph(modulus)},
  {id:'section_derived',constraintId:'deflection_limit',graphText:derivedSectionGraph(modulus)}
 ]});
}
