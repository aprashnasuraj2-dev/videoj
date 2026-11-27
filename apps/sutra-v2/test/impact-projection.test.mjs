import test from 'node:test';
import assert from 'node:assert/strict';
import {impactProjection} from '../src/impact-projection.js';
import {livingFixture} from '../../../packages/sutra-knowledge/examples/living-investigation.mjs';
import {compareInvestigationVersions} from '../../../packages/sutra-knowledge/investigation-revision.js';
const view=v=>({digest:v.digest,graph:v.report.graph});
test('real selective withdrawal highlights only canonical affected paths and keeps unaffected result visible',async()=>{
 const a=await livingFixture('engineering'),b=await livingFixture('engineering',{withdraw:true,previousDigest:a.digest});
 const impact=await compareInvestigationVersions(a.versionText,a.digest,b.versionText,b.digest),p=impactProjection({before:view(a),after:view(b),impact});
 assert.ok(p.nodes.some(n=>n.id==='source:secondary'&&n.root&&n.state==='before-only'));
 assert.ok(p.edges.some(e=>e.dependent==='candidate:secondary_view'));
 assert.ok(p.candidates.some(c=>c.id==='secondary_view'&&c.after==='BLOCKED_MISSING_INPUT'&&c.dependencyAffected));
 assert.ok(p.candidates.some(c=>c.id==='primary_view'&&!c.dependencyAffected));
 assert.ok(!p.edges.some(e=>e.dependent==='candidate:primary_view'));
 assert.throws(()=>impactProjection({before:view(b),after:view(a),impact}),/IMPACT_VERSION_MISMATCH/);
});
test('never manufacture cross-version paths by merging old and new edges',()=>{
 const e=(dependency,dependent)=>({dependency,dependent,relation:'actual',authority:'COMPILER_ADMISSION'}),n=id=>({id,kind:'evidence'});
 const before={digest:'b',graph:{nodes:['source:a','binding:x','candidate:c','candidate:d'].map(n),edges:[e('source:a','binding:x'),e('binding:x','candidate:c')]}};
 const after={digest:'a',graph:{nodes:['binding:x','candidate:c','candidate:d'].map(n),edges:[e('binding:x','candidate:d')]}};
 const impact={beforeDigest:'b',afterDigest:'a',sourceChanges:[{id:'a'}],bindingChanges:[],questionChanged:false,affectedDependencyNodes:['source:a','binding:x','candidate:c','candidate:d'],candidates:[]};
 const p=impactProjection({before,after,impact});
 assert.equal(p.edges.length,2);assert.ok(p.edges.every(e=>e.state==='before-only'));assert.ok(!p.edges.some(e=>e.dependent==='candidate:d'));
});
