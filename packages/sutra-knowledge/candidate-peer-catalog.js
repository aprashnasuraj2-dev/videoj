import {fetchJsonWithConsent, pinConsentInspector} from '../sutra-consent/index.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {openCandidateCapsule, CANDIDATE_CAPSULE_VERSION} from './candidate-capsule.js';
import {openCandidateRangeCapsule, RANGE_CAPSULE_VERSION} from './candidate-range-capsule.js';

export const CANDIDATE_CATALOG = 'sutra-peer-candidate-catalog/v1';
export const CALCULATION_DIRECTORY = '/agents/calculations/';
const PIN = /^sha256:[a-f0-9]{64}$/;
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const MAX = 65536;
const parse = (text, limit=MAX) => parseUniqueJson(text, {maxChars: limit, maxDepth: 12});
const keys = (value, names) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const holder = new WeakSet();
const isPin = value => typeof value === 'string' && PIN.test(value);
const fail = code => { throw new TypeError('CANDIDATE_PEER_' + code); };
const bytes = text => new TextEncoder().encode(text).length;

function originOf(input) {
  if (typeof input !== 'string' || input.length > 256) fail('ORIGIN');
  let url;
  try { url = new URL(input); } catch { fail('ORIGIN'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (input !== url.origin || url.protocol !== 'https:' && !(local && url.protocol === 'http:')) fail('ORIGIN');
  return url.origin;
}
function admitRows(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 16) fail('ENTRIES');
  const names = new Set(), pins = new Set();
  return Object.freeze(rows.map(row => {
    if (!keys(row, ['id', 'pin', 'bytes']) || typeof row.id !== 'string' || !ID.test(row.id) || !isPin(row.pin) ||
        names.has(row.id) || pins.has(row.pin) || !Number.isSafeInteger(row.bytes) || row.bytes < 1 || row.bytes > 32768) fail('ROW');
    names.add(row.id);
    pins.add(row.pin);
    return Object.freeze({...row});
  }));
}
async function openCalculation(text, pin, verifyPrivate) {
  const wrapper = parse(text, 32768);
  const version = wrapper?.version;
  if (keys(wrapper, ['statementText', 'programText', 'proof']) &&
      typeof verifyPrivate === 'function') return verifyPrivate(text,pin);
  if (version === CANDIDATE_CAPSULE_VERSION) return openCandidateCapsule(text, pin);
  if (version === RANGE_CAPSULE_VERSION) return openCandidateRangeCapsule(text, pin);
  fail('PROFILE');
}

export async function packagePeerCalculations(entries, {verifyPrivate} = {}) {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 16) fail('ENTRIES');
  const rows = await Promise.all(entries.map(async entry => {
    if (!keys(entry, ['id', 'text', 'pin']) || typeof entry.text !== 'string') fail('ENTRY');
    await openCalculation(entry.text, entry.pin, verifyPrivate);
    return {id: entry.id, pin: entry.pin, bytes: bytes(entry.text)};
  }));
  admitRows(rows);
  const catalogText = JSON.stringify({version: CANDIDATE_CATALOG, entries: rows});
  const files = entries.map(entry => {
    const wire = JSON.stringify({capsuleText: entry.text});
    if (bytes(wire) > MAX) fail('FILE_SIZE');
    return Object.freeze({name: entry.pin.slice(7) + '.json', text: wire});
  });
  files.push(Object.freeze({name: 'index.json', text: JSON.stringify({catalogText})}));
  return Object.freeze({pin: await casePin(catalogText), files: Object.freeze(files)});
}

function get({origin, filename, inspector, fetchImpl, signal, maxBytes, kind, purpose}) {
  const url = origin + CALCULATION_DIRECTORY + filename;
  return fetchJsonWithConsent({
    inspector: pinConsentInspector(inspector), url, signal, fetchImpl, maxBytes,
    contact: {origin, kind, purpose, resource: url, disclosure: ['Requested resource'], preview: {'Requested resource': CALCULATION_DIRECTORY + filename}}
  });
}

export async function discoverPeerCalculations({origin, expectedPin, inspector, fetchImpl, signal}={}) {
  origin = originOf(origin);
  if (!isPin(expectedPin)) fail('CATALOG_PIN');
  const wrapper = await get({origin, filename: 'index.json', inspector, fetchImpl, signal, maxBytes: 8192,
    kind: 'peer_manifest', purpose: 'Read the peer’s calculation catalog'});
  if (!keys(wrapper, ['catalogText']) || typeof wrapper.catalogText !== 'string' ||
      await casePin(wrapper.catalogText) !== expectedPin) fail('CATALOG_PIN');
  const data = parse(wrapper.catalogText, 8192);
  if (!keys(data, ['version', 'entries']) || data.version !== CANDIDATE_CATALOG) fail('CATALOG');
  if (signal?.aborted) fail('CANCELLED');
  const catalog = Object.freeze({origin, pin: expectedPin, entries: admitRows(data.entries)});
  holder.add(catalog);
  return catalog;
}

export async function readPeerCalculation({catalog, id, inspector, fetchImpl, signal, verifyPrivate}={}) {
  if (!holder.has(catalog)) fail('CATALOG_AUTHORITY');
  const item = catalog.entries.find(row => row.id === id);
  if (!item) fail('ENTRY');
  const wrapped = await get({origin:catalog.origin, filename:item.pin.slice(7) + '.json', inspector, fetchImpl, signal, maxBytes:MAX,
    kind:'peer_graph', purpose:'Read only this calculation capsule'});
  if (!keys(wrapped, ['capsuleText']) || typeof wrapped.capsuleText !== 'string' || bytes(wrapped.capsuleText) !== item.bytes) fail('BODY');
  const replay = await openCalculation(wrapped.capsuleText, item.pin, verifyPrivate);
  if (signal?.aborted) fail('CANCELLED');
  return Object.freeze({origin:catalog.origin, catalogPin:catalog.pin, capsuleText:wrapped.capsuleText, pin:item.pin, replay});
}
