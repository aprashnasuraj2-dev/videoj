import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditChecklist} from './checklist.mjs';
const read=n=>fs.readFileSync(new URL(n,import.meta.url),'utf8');
const fixture=()=>[read('../CHECKLIST.md'),JSON.parse(read('../progress.json')),JSON.parse(read('../roadmap.json'))];

test('live checklist and machine queues reconcile',()=>assert.deepEqual(auditChecklist(...fixture()).errors,[]));
test('duplicate checklist ID fails',()=>{const f=fixture();f[0]+='\n'+f[0].split('\n').find(l=>l.startsWith('- [')&&l.includes('`V2-'));assert.ok(auditChecklist(...f).errors.some(e=>e.includes('Duplicate task')));});
test('count, stale session and invalid queue fail',()=>{for(const mutate of [f=>f[1].activeChecklist.remainingTasks++,f=>f[2].session='stale-session',f=>f[1].next.push('V2-N001')]){const f=fixture();mutate(f);assert.ok(auditChecklist(...f).errors.length);}});
test('closed item without evidence fails',()=>{const f=fixture();f[1].verified=[];assert.ok(auditChecklist(...f).errors.some(e=>e.includes('lacks source-bound evidence'));});
test('stable lowercase task suffixes accepted, malformed IDs refused',()=>{const f=fixture();for(const id of ['V2-F11b','V2-F12d'])assert.ok(f[0].includes('`'+id+'`'));assert.deepEqual(auditChecklist(...f).errors,[]);for(const id of ['V2-f11b','V2-F11bb','V2--F11b','V2-F11b-']){const g=fixture();g[0]=g[0].replace('`V2-F11b`','`'+id+'`');assert.ok(auditChecklist(...g).errors.some(e=>e.includes('Malformed active checklist item')));}});
test('optional web remains independent, disabled and unregistered',()=>{for(const mutate of [f=>f[1].webAccess.defaultEnabled=true,f=>f[2].webAccess.defaultRegistered=true,f=>f[1].webAccess.tasks[0].dependencies.push('V2-P02-RUNTIME'),f=>f[2].productGates[0].dependencies.push('V2-WEB-004'),f=>f[1].activeChecklist.foundationRemainingIncludingActive++,f=>f[2].webAccess.coreGateDependency=true]){const f=fixture();mutate(f);assert.ok(auditChecklist(...f).errors.some(e=>/web|Optional|foundation/i.test(e)));}});
test('closure authority cannot drift',()=>{const f=fixture();f[2].gateClosurePolicy.authority='invalid';assert.ok(auditChecklist(...f).errors.some(e=>e.includes('closure authority')));});
