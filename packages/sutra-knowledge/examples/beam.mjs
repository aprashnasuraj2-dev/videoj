// Demonstration only: idealized simply supported beam, NOT a safety assessment.
// Dimensions are [length, mass, time], SI base units; numeric inputs are declarations.
const input=(id,value,dimension,basis)=>({id,kind:'input',value,dimension,basis});
const derive=(id,op,a,b)=>({id,kind:'derive',op,args:[a,b]});
const constraint=(id,op,a,b)=>({id,kind:'constraint',op,args:[a,b]});
export function beamGraph(modulus='10000000000'){
 return JSON.stringify({schemaVersion:1,nodes:[
  input('span','4',[1,0,0],'Declared idealized span, metres'),
  input('load','5000',[0,1,-2],'Declared uniformly distributed load, N/m'),
  input('E',modulus,[-1,1,-2],'Synthetic material stiffness assumption, Pa'),
  input('I','9/20000',[4,0,0],'Declared rectangular-section second moment, m^4'),
  input('five','5',[0,0,0],'Formula coefficient'),input('c384','384',[0,0,0],'Formula coefficient'),
  input('c360','360',[0,0,0],'Illustrative deflection limit divisor'),
  derive('span2','mul','span','span'),derive('span4','mul','span2','span2'),
  derive('wL4','mul','load','span4'),derive('numerator','mul','five','wL4'),
  derive('EI','mul','E','I'),derive('denominator','mul','c384','EI'),
  derive('deflection','div','numerator','denominator'),
  derive('limit','div','span','c360'),constraint('deflection_limit','le','deflection','limit')
 ]});
}
