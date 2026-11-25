import test from 'node:test';
import assert from 'node:assert/strict';
import {orderRelation,exportReviewedOrderContrast} from '../reviewed-order-contrast.js';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
const ops={lt:(a,b)=>a<b,le:(a,b)=>a<=b,eq:(a,b)=>a===b,ge:(a,b)=>a>=b,gt:(a,b)=>a>b};
const states=['LT','EQ','GT'],sample=[[-1,0],[0,0],[1,0]],state=v=>v?'CONDITIONALLY_SATISFIED':'CONDITIONALLY_REFUTED';
const comp=(op,reverse=false,status='UNRESOLVED',self=false)=>({operandSignatures:self?['a','a']:reverse?['b','a']:['a','b'],targetOperator:op,status,typeBlockers:[]});
test('exhaustive pair truth-table oracle: five comparators, two orientations, three realized orders',()=>{
 let controls=0;
 for(const l of Object.keys(ops))for(const r of Object.keys(ops))for(const reversed of [false,true])for(const [a,b] of sample){
  const rfn=(x,y)=>reversed?ops[r](y,x):ops[r](x,y);
  const actual=orderRelation(comp(l,false,state(ops[l](a,b))),comp(r,reversed,state(rfn(a,b))));
  const left=states.filter((_,i)=>ops[l](...sample[i])),right=states.filter((_,i)=>rfn(...sample[i]));
  assert.deepEqual(actual.leftTrueOrders,left);assert.deepEqual(actual.rightTrueOrders,right);
  assert.deepEqual(actual.overlap,left.filter(s=>right.includes(s)));assert.deepEqual(actual.uncovered,states.filter(s=>!left.includes(s)&&!right.includes(s)));
  const li=sample.every(([x,y])=>!ops[l](x,y)||rfn(x,y)),ri=sample.every(([x,y])=>!rfn(x,y)||ops[l](x,y));
  assert.equal(actual.leftImpliesRight,li);assert.equal(actual.rightImpliesLeft,ri);
  const expected=li&&ri?'EQUIVALENT':sample.every(([x,y])=>ops[l](x,y)!==rfn(x,y))?'COMPLEMENT':sample.every(([x,y])=>!(ops[l](x,y)&&rfn(x,y)))?'MUTUALLY_EXCLUSIVE_NONEXHAUSTIVE':li?'LEFT_IMPLIES_RIGHT':ri?'RIGHT_IMPLIES_LEFT':'OVERLAP';
  assert.equal(actual.relation,expected);assert.deepEqual(actual.compatibleObservedOrders,states.filter((_,i)=>ops[l](...sample[i])===ops[l](a,b)&&rfn(...sample[i])===rfn(a,b)));controls++;
 }
 assert.equal(controls,150);
});
test('self, blocked, unknown, unaligned and contradictory-state boundaries',()=>{
 const a=comp('gt',false,'UNRESOLVED',true),b=comp('eq',false,'UNRESOLVED',true);
 assert.equal(orderRelation(a,b).relation,'COMPLEMENT');assert.deepEqual(orderRelation(a,b).domain,['EQ']);assert.equal(orderRelation(a,b).compatibleObservedOrders,null);
 assert.deepEqual(orderRelation(comp('gt'),{...comp('gt'),operandSignatures:['a','c']}),{status:'UNALIGNED_OPERANDS'});
 assert.deepEqual(orderRelation(comp('gt'),{...comp('gt'),typeBlockers:['x']}),{status:'BLOCKED_TYPE'});
 assert.throws(()=>orderRelation(comp('gt',false,state(true)),comp('le',false,state(true))),/ORDER_CONTRAST_REPLAY_DIVERGENCE/);
});
test('real compiler replay separates strict opposite from complement and reversed equivalent',async()=>{
 const f=await compilerFinanceFixture(),base=JSON.parse(f.proposalText),make=(id,op,reverse=false)=>{const p=structuredClone(base),n=p.nodes.find(n=>n.id===p.targetId);n.op=op;if(reverse)n.args.reverse();return {id,proposalText:JSON.stringify(p)};};
 const b=await exportReviewedOrderContrast(f.contractText,f.pin,JSON.stringify({version:1,contractDigest:f.pin,proposals:[make('a','gt'),make('b','lt',true),make('c','le'),make('d','lt')]}));
 const at=(l,r)=>b.orderRelations.find(x=>x.left===l&&x.right===r);
 assert.equal(at('a','b').relation,'EQUIVALENT');assert.equal(at('a','c').relation,'COMPLEMENT');assert.equal(at('a','d').relation,'MUTUALLY_EXCLUSIVE_NONEXHAUSTIVE');assert.deepEqual(at('a','d').uncovered,['EQ']);
 assert.equal(b.decisionAuthority,'NONE');assert.equal(b.contrast.result.decisionAuthority,'NONE');
});
