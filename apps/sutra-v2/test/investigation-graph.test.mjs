import test from 'node:test';
import assert from 'node:assert/strict';
import {investigationGraph,traceDependencies} from '../src/investigation-graph.js';
test('canonical graph wins; no draft recomputation or authority changes',()=>{
 const graph={nodes:[],edges:[],qualification:'canonical'};
 assert.equal(investigationGraph({current:{report:{graph}}}),graph);
});
test('draft ancestry and reviewed spans remain distinct declarations',()=>{
 const g=investigationGraph({question:'Q',sources:[{id:'a',lineage:'same',text:'12 units'},{id:'b',lineage:'same',text:'15 units'}],bindings:[{id:'v',sourceId:'a',start:0,end:2}]});
 assert.equal(g.nodes.filter(n=>n.kind==='declared_lineage').length,1);
 assert.equal(g.nodes.find(n=>n.id==='binding:v').identity,'12');
 assert.deepEqual([...traceDependencies(g,'binding:v')].sort(),['lineage:same','source:a']);
 assert.deepEqual([...traceDependencies(g,'lineage:same',true)].sort(),['binding:v','source:a','source:b']);
 assert.equal(g.edges.find(e=>e.dependent==='binding:v').authority,'DRAFT_DECLARATION');
});
test('cycles terminate; unrelated nodes stay excluded; long dependency chains work',()=>{
 const g={edges:[{dependent:'c',dependency:'q'},{dependent:'q',dependency:'s'},{dependent:'s',dependency:'q'},{dependent:'x',dependency:'z'}]};
 assert.deepEqual([...traceDependencies(g,'c')].sort(),['q','s']);
 assert.deepEqual([...traceDependencies(g,'s',true)].sort(),['c','q']);
 assert.equal(traceDependencies(g,'missing').size,0);
 assert.equal(traceDependencies(g,'q').has('q'),false);
 const many={edges:Array.from({length:5000},(_,i)=>({dependent:String(i+1),dependency:String(i)}))};
 assert.equal(traceDependencies(many,'5000').size,5000);
});
