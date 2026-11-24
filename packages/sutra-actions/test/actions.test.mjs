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

test('cancelled, completed and failed identities cannot be reused by a stale confirmation',async()=>{
 for(const outcome of ['cancel','complete','fail']){
  let calls=0;const registry=make({execute:async()=>{calls++;if(outcome==='fail')throw Error('ambiguous');}});
  const first=registry.prepare('save-review-card',{value:'approved',version:1});
  if(outcome==='cancel')registry.cancel(first.id);
  else if(outcome==='fail')await assert.rejects(registry.execute(first.id),/ambiguous/);
  else await registry.execute(first.id);
  assert.throws(()=>registry.prepare('save-review-card',{value:'approved',version:2}),e=>e.code==='PROPOSAL_ID');
  await assert.rejects(registry.execute(first.id),e=>e.code==='PROPOSAL_MISSING');
  assert.equal(calls,outcome==='cancel'?0:1);
 }
});
test('aggregate JSON byte budget rejects shared expansion, escaping, unicode and malformed arrays before handler',()=>{
 const registry=make();
 const shared=Array(100).fill('x'.repeat(200));
 for(const nested of [Array(100).fill(shared),'\\'.repeat(9000),'क'.repeat(6000)]){
  assert.throws(()=>registry.prepare('save-review-card',{value:'approved',nested}),/16 KiB/);
 }
 const sparse=[];sparse.length=100000000;
 const extra=[1];extra.extra='ignored';
 const hole=[1,,3];
 for(const nested of [sparse,extra,hole])assert.throws(()=>registry.prepare('save-review-card',{value:'approved',nested}),/dense arrays/);
 const valid=registry.prepare('save-review-card',{value:'approved',nested:[1,null,true,'क',{a:'b'}]});
 assert.deepEqual(valid.args.nested,[1,null,true,'क',{a:'b'}]);
});
test('bounded session refuses new proposals rather than evicting old confirmation identities',()=>{
 let i=0;const registry=make({idFactory:()=> 'proposal-'+(++i)});
 for(let n=0;n<4096;n++){const p=registry.prepare('save-review-card',{value:'approved'});registry.cancel(p.id);}
 assert.equal(registry.pendingCount(),0);
 assert.throws(()=>registry.prepare('save-review-card',{value:'approved'}),e=>e.code==='PROPOSAL_LIMIT');
});

test('action registration rejects executable descriptors and coercible names without invoking them',()=>{
 let touched=0;
 const definition=()=>({name:'save-review-card',effect:'write_local',destination:'browser',description:'Review',validate:()=>true,execute:()=>{}});
 const bad=[];
 bad.push([{...definition(),name:{toString(){touched++;return 'save-review-card';}}}]);
 for(const key of ['name','effect','destination','description','validate','execute']){
  const d=definition();Object.defineProperty(d,key,{enumerable:true,get(){touched++;return 'bad';}});bad.push([d]);
 }
 const entries=[];Object.defineProperty(entries,'0',{enumerable:true,get(){touched++;return definition();}});bad.push(entries);
 const custom=[definition()];custom[Symbol.iterator]=function*(){touched++;yield definition();};bad.push(custom);
 const extra=definition();Object.defineProperty(extra,'secret',{value:'hidden'});bad.push([extra]);
 bad.push(new Array(1));
 for(const input of bad)assert.throws(()=>createLocalActionRegistry(input),TypeError);
 assert.equal(touched,0);
});
test('validator sees immutable reviewed bytes and cannot silently normalize or mutate them',async()=>{
 let executed;
 const registry=createLocalActionRegistry([{name:'save-review-card',effect:'write_local',destination:'browser',description:'Review',
  validate(args){assert.ok(Object.isFrozen(args));assert.ok(Object.isFrozen(args.nested));Reflect.set(args.nested,'count',99);return true;},
  execute(args){executed=args;return 'done';}}],{idFactory:()=> 'proposal-frozen'});
 const proposal=registry.prepare('save-review-card',{nested:{count:1}});
 assert.equal(proposal.args.nested.count,1);
 assert.equal(await registry.execute(proposal.id),'done');assert.equal(executed.nested.count,1);
});
test('reentrant validator and identity factory cannot exceed proposal ceiling or create hidden proposals',()=>{
 let registry,attempts=0,ids=0;
 const reenter=()=>{attempts++;assert.throws(()=>registry.prepare('save-review-card',{value:'approved'}),e=>e.code==='REENTRANT_PREPARE');};
 registry=createLocalActionRegistry([{name:'save-review-card',effect:'write_local',destination:'browser',description:'Review',
  validate(){reenter();return true;},execute:()=>{}}],{idFactory(){reenter();return 'proposal-'+(++ids);}});
 for(let i=0;i<8;i++)registry.prepare('save-review-card',{value:'approved'});
 assert.equal(attempts,16);assert.equal(ids,8);assert.equal(registry.pendingCount(),8);
 assert.throws(()=>registry.prepare('save-review-card',{value:'approved'}),e=>e.code==='PENDING_LIMIT');
});
