import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameDriver} from '../src/frame-driver.js';
function fixture(){
 const pending=new Map();let next=0,visible=true,more=false;const ticks=[];
 const driver=createFrameDriver({request:fn=>{pending.set(++next,fn);return next},cancel:id=>pending.delete(id),visible:()=>visible,onFrame:(now,dt)=>{ticks.push({now,dt});return more;}});
 return {driver,pending,ticks,show:v=>visible=v,animate:v=>more=v,tick(now){const [id,fn]=[...pending][0];pending.delete(id);fn(now);}};
}
test('idle stops, repeated wake coalesces, animation continues only on demand',()=>{
 const f=fixture();assert.equal(f.driver.wake(),true);assert.equal(f.driver.wake(),false);f.tick(100);assert.equal(f.pending.size,0);
 f.animate(true);f.driver.wake();f.tick(500);assert.equal(f.ticks.at(-1).dt,.016);assert.equal(f.pending.size,1);
 f.animate(false);f.tick(516);assert.equal(f.pending.size,0);
});
test('hidden view stops and ignores stale callbacks; resumes with fresh clock',()=>{
 const f=fixture();f.driver.wake();const stale=[...f.pending.values()][0];f.show(false);f.driver.stop();assert.equal(f.pending.size,0);assert.equal(f.driver.wake(),false);
 f.show(true);f.driver.wake();stale(1000);assert.equal(f.ticks.length,0);assert.equal(f.pending.size,1);f.tick(20000);assert.equal(f.ticks[0].dt,.016);
});
