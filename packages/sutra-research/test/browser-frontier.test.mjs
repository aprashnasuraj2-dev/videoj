import test from 'node:test';
import assert from 'node:assert/strict';
import {browserFrontierChoices,chooseBrowserFrontier,rankFrontier} from '../source-ranker.js';
const frontier=[{url:'https://a.example.org/1',title:'Unrelated',rank:10,depth:1},{url:'https://b.example.org/2',title:'Battery storage costs',rank:1,depth:0},{url:'https://c.example.org/3',title:'Battery storage costs',rank:1,depth:0}];
test('browser and host rank admitted frontier equivalently; browser sees no URL or raw response',()=>{
 const attempts=new Map([['c.example.org',3]]),choices=browserFrontierChoices(frontier,attempts);
 assert.deepEqual(choices.map(c=>c.id),['candidate_0','candidate_1']);assert.equal(chooseBrowserFrontier(choices,'Compare battery storage costs'),'candidate_1');assert.equal(rankFrontier(frontier.slice(0,2),'Compare battery storage costs',attempts)[0],frontier[1]);assert.ok(choices.every(c=>!Object.hasOwn(c,'url')));
 const mutate=[c=>c[0].url='https://x.invalid/',c=>c[0].attempts=3,c=>c[0].rank=0,c=>c[0].depth=-1,c=>c[0].title='x'.repeat(301),c=>c[0].id='candidate_240',c=>c[1].id=c[0].id];
 for(const m of mutate){const c=choices.map(x=>({...x}));m(c);assert.throws(()=>chooseBrowserFrontier(c,'Compare battery storage costs'),/FRONTIER_SELECTION/);}
 assert.throws(()=>chooseBrowserFrontier([],'Compare battery storage costs'),/FRONTIER_SELECTION/);
});
