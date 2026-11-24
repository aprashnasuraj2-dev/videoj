import test from 'node:test';
import assert from 'node:assert/strict';
import {applyScreenState,learnerScreenStates} from '../src/status-state.js';

function node(){
 return {dataset:{},attrs:{},textContent:'before',
  setAttribute(name,value){this.attrs[name]=String(value);}
 };
}

test('learner state contract explicitly defines required visible outcomes',()=>{
 for(const state of ['loading','empty','denied','error','completed'])assert.ok(learnerScreenStates[state],state);
 assert.equal(learnerScreenStates.loading.busy,true);
 assert.equal(learnerScreenStates.completed.busy,false);
});

test('state application exposes machine-readable state, tone and busy semantics without markup injection',()=>{
 const target=node();
 applyScreenState(target,'loading','Loading exact source…');
 assert.equal(target.dataset.state,'loading');
 assert.equal(target.dataset.tone,'progress');
 assert.equal(target.attrs['aria-busy'],'true');
 assert.equal(target.textContent,'Loading exact source…');
 applyScreenState(target,'completed','Complete.');
 assert.equal(target.attrs['aria-busy'],'false');
 assert.equal(target.textContent,'Complete.');
});

test('unknown states and non-text messages fail instead of silently inventing UI semantics',()=>{
 assert.throws(()=>applyScreenState(node(),'almost_done','x'),/Unknown/);
 assert.throws(()=>applyScreenState(node(),'error',{message:'x'}),/text/);
});
