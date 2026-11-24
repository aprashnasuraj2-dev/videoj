import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalActionRegistry,LocalActionError} from '../index.js';

const make=({execute=async args=>args,idFactory=()=> 'proposal-1'}={})=>createLocalActionRegistry([
 {name:'save-review-card',effect:'write_local',destination:'browser local storage',
  description:'Save an explicitly reviewed card in this browser.',
  validate:args=>args&&typeof args==='object'&&args.value==='approved',execute},
 {name:'export-receipt',effect:'download',destination:'user-selected download',
  description:'Create a bounded receipt download after explicit user action.',
  validate:args=>args&&typeof args==='object'&&typeof args.id==='string',execute:async args=>JSON.stringify(args)}
],{idFactory});

test('registry exposes only public effect metadata, never handlers',()=>{
 const list=make().list();
 assert.deepEqual(list.map(item=>[item.name,item.effect]),[
  ['save-review-card','write_local'],['export-receipt','download']
 ]);
 assert.equal('execute' in list[0],false);assert.equal(Object.isFrozen(list[0]),true);
});

test('prepared arguments are snapshotted and execution uses exactly the reviewed snapshot',async()=>{
 let observed;
 const original={value:'approved',nested:{count:1}};
 const registry=make({execute:async args=>{observed=args;return 'ok';}});
 const proposal=registry.prepare('save-review-card',original);
 original.nested.count=99;
 assert.equal(proposal.args.nested.count,1);
 assert.throws(()=>{proposal.args.nested.count=7;},TypeError);
 assert.equal(await registry.execute(proposal.id),'ok');
 assert.equal(observed.nested.count,1);
 assert.equal(registry.pendingCount(),0);
});

test('cancel changes no state and a consumed proposal cannot execute again',async()=>{
 let calls=0;const registry=make({execute:async()=>{calls++;}});
 const proposal=registry.prepare('save-review-card',{value:'approved'});
 assert.equal(registry.cancel(proposal.id),true);
 await assert.rejects(()=>registry.execute(proposal.id),error=>error instanceof LocalActionError&&error.code==='PROPOSAL_MISSING');
 assert.equal(calls,0);
});

test('changed arguments require a fresh proposal and confirmation identity',()=>{
 let i=0;const registry=make({idFactory:()=> 'proposal-'+(++i)});
 const first=registry.prepare('save-review-card',{value:'approved',version:1});
 const second=registry.prepare('save-review-card',{value:'approved',version:2});
 assert.notEqual(first.id,second.id);
 assert.equal(first.args.version,1);assert.equal(second.args.version,2);
});

test('handler failure consumes the proposal before the ambiguous outcome',async()=>{
 let calls=0;const registry=make({execute:async()=>{calls++;throw Error('unknown after side effect');}});
 const proposal=registry.prepare('save-review-card',{value:'approved'});
 await assert.rejects(()=>registry.execute(proposal.id),/unknown after side effect/);
 await assert.rejects(()=>registry.execute(proposal.id),error=>error.code==='PROPOSAL_MISSING');
 assert.equal(calls,1);
});

test('unsafe getters, cycles, oversized arguments and invalid definitions fail before handler code',()=>{
 let getterCalls=0;const args={value:'approved'};Object.defineProperty(args,'secret',{enumerable:true,get(){getterCalls++;return 'x';}});
 const registry=make();
 assert.throws(()=>registry.prepare('save-review-card',args),/Executable/);assert.equal(getterCalls,0);
 const cycle={value:'approved'};cycle.self=cycle;assert.throws(()=>registry.prepare('save-review-card',cycle),/bounded plain JSON/);
 assert.throws(()=>registry.prepare('save-review-card',{value:'approved',big:'x'.repeat(17000)}),/16 KiB/);
 assert.throws(()=>createLocalActionRegistry([{name:'bad',effect:'network_write',destination:'x',description:'x',validate:()=>true,execute:()=>{}}]),/Invalid/);
});

test('validation and pending ceilings are fail-closed',()=>{
 let i=0;const registry=make({idFactory:()=> 'proposal-'+(++i)});
 assert.throws(()=>registry.prepare('save-review-card',{value:'changed'}),error=>error.code==='ARGUMENTS');
 for(let n=0;n<8;n++)registry.prepare('save-review-card',{value:'approved'});
 assert.throws(()=>registry.prepare('save-review-card',{value:'approved'}),error=>error.code==='PENDING_LIMIT');
});
