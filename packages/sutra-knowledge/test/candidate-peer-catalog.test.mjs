import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import test from 'node:test';
import {createConsentInspector} from '../../sutra-consent/index.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {exportCandidateCapsule} from '../candidate-capsule.js';
import {CALCULATION_DIRECTORY, discoverPeerCalculations, packagePeerCalculations, readPeerCalculation} from '../candidate-peer-catalog.js';

test('a real independent HTTP publisher supports exact discovery and retrieval with separate consent', async t => {
  const v = await livingFixture();
  const capsule = await exportCandidateCapsule(v.versionText, v.digest, 'primary_view');
  const catalog = await packagePeerCalculations([{id:'sample', ...capsule}]);
  const files = new Map(catalog.files.map(f => [CALCULATION_DIRECTORY + f.name, f.text]));
  const calls = [];
  const server = createServer((req,res) => {
    calls.push({url:req.url, method:req.method, cookie:req.headers.cookie, referer:req.headers.referer});
    res.writeHead(files.has(req.url) ? 200 : 404, {'Content-Type':'application/json'});
    res.end(files.get(req.url) ?? '{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const deny = createConsentInspector({decide: async () => 'deny'});
  const approved = [];
  const allow = createConsentInspector({decide: async contact => { approved.push(contact.kind); return 'allow'; }});
  const entry = CALCULATION_DIRECTORY + capsule.pin.slice(7) + '.json';

  await assert.rejects(discoverPeerCalculations({origin,expectedPin:catalog.pin,inspector:deny}), error => error.code === 'CONSENT_DENIED');
  assert.equal(calls.length, 0);
  const admitted = await discoverPeerCalculations({origin,expectedPin:catalog.pin,inspector:allow});
  assert.deepEqual(calls.map(x => x.url), [CALCULATION_DIRECTORY + 'index.json']);
  await assert.rejects(readPeerCalculation({catalog:admitted,id:'sample',inspector:deny}), error => error.code === 'CONSENT_DENIED');
  await assert.rejects(readPeerCalculation({catalog:{...admitted},id:'sample',inspector:allow}), /CATALOG_AUTHORITY/);
  assert.equal(calls.length, 1);
  const result = await readPeerCalculation({catalog:admitted,id:'sample',inspector:allow});
  assert.equal(result.pin, capsule.pin);
  assert.equal(result.replay.outcome,'CONDITIONALLY_SATISFIED');
  assert.deepEqual(approved,['peer_manifest','peer_graph']);
  assert.deepEqual(calls.map(x => [x.url,x.method,x.cookie,x.referer]), [
    [CALCULATION_DIRECTORY+'index.json','GET',undefined,undefined],
    [entry,'GET',undefined,undefined]
  ]);
  files.set(entry, JSON.stringify({capsuleText:capsule.text.replace('120/1','121/1')}));
  await assert.rejects(readPeerCalculation({catalog:admitted,id:'sample',inspector:allow}), /CAPSULE_PIN/);
  await assert.rejects(discoverPeerCalculations({origin,expectedPin:'sha256:'+'0'.repeat(64),inspector:allow}), /CATALOG_PIN/);
});
