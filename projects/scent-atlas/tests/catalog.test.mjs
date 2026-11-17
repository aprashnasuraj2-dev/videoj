import test from 'node:test';
import assert from 'node:assert/strict';
import {samples,scenes,kits,validateCatalog} from '../src/catalog.ts';
test('six profiles, three scenes, three unique three-vial kits',()=>{assert.equal(samples.length,6);assert.equal(scenes.length,3);assert.equal(kits.length,3);assert.doesNotThrow(()=>validateCatalog());});
test('rejects duplicated profile IDs',()=>{assert.throws(()=>validateCatalog([...samples,samples[0]],scenes,kits),/Expected six|Duplicate/);});
test('rejects duplicate vials within a kit',()=>{const bad=[{...kits[0],samples:[kits[0].samples[0],kits[0].samples[0],kits[0].samples[2]]},...kits.slice(1)];assert.throws(()=>validateCatalog(samples,scenes,bad),/three distinct/);});
test('rejects missing sample reference',()=>{const bad=[{...kits[0],samples:['nonexistent',...kits[0].samples.slice(1)]},...kits.slice(1)];assert.throws(()=>validateCatalog(samples,scenes,bad),/Unknown sample|Lead sample/);});
test('rejects wrong scene lead',()=>{const bad=[{...kits[0],samples:[kits[0].samples[1],kits[0].samples[0],kits[0].samples[2]]},...kits.slice(1)];assert.throws(()=>validateCatalog(samples,scenes,bad),/Lead sample mismatch/);});
test('rejects two kits mapped to one scene',()=>{const bad=[kits[0],{...kits[1],scene:kits[0].scene},kits[2]];assert.throws(()=>validateCatalog(samples,scenes,bad),/Each scene|Lead sample mismatch/);});
