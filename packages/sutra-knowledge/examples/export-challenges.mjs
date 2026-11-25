import {createVerifier} from '../index.js';
import {beamGraph} from './beam.mjs';
const v=createVerifier(),a=beamGraph(),b=beamGraph('2500000000');
const r=await v.evaluate(a),s=await v.evaluate(b);
const cases=[
 {id:'baseline',graph:a,report:r.reportText,expected:true},
 {id:'revision',graph:b,report:s.reportText,expected:true},
 {id:'stale',graph:b,report:r.reportText,expected:false},
 {id:'forged-result',graph:a,report:r.reportText.replace('constraint_satisfied','constraint_refuted'),expected:false},
 {id:'forged-digest',graph:a,report:r.reportText.replace(/sha256:[a-f0-9]{64}/,'sha256:'+'0'.repeat(64)),expected:false},
 {id:'reordered-nodes',graph:JSON.stringify({...JSON.parse(a),nodes:JSON.parse(a).nodes.reverse()}),report:r.reportText,expected:true},
 {id:'ambiguous-json',graph:a.replace('"schemaVersion":1','"schemaVersion":1,"schemaVersion":1'),report:r.reportText,expected:false}
];
const input=(id,value,dimension)=>({id,kind:'input',value,dimension,basis:'Independent fixture — परीक्षण 🧪'});
const graph=JSON.stringify({schemaVersion:1,nodes:[input('a','-2/3',[1,0,0]),input('b','1/3',[1,0,0]),input('mass','4',[0,1,0]),
 {id:'sum',kind:'derive',op:'add',args:['a','b']},{id:'wrong',kind:'constraint',op:'eq',args:['a','mass']},
 {id:'square',kind:'derive',op:'mul',args:['sum','sum']}]});
const other=await createVerifier().evaluate(graph);
cases.push({id:'unicode-rational-and-incompatible',graph,report:other.reportText,expected:true});
console.log(JSON.stringify({cases}));
