import {PRIVATE_WASM_SHA256} from './generated-private-pin.js';

const MAX_MODULE = 524288;
const MAX_IO = 4096;
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

export async function instantiatePrivateEngine(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_MODULE ||
      hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))) !== PRIVATE_WASM_SHA256) throw new Error('PRIVATE_MODULE_PIN');
  const module = await WebAssembly.compile(bytes);
  const imports = WebAssembly.Module.imports(module);
  if (imports.length !== 1 || imports[0].module !== 'sutra_entropy' || imports[0].name !== 'fill_random' ||
      imports[0].kind !== 'function') throw new Error('PRIVATE_MODULE_IMPORTS');
  let instance;
  instance = await WebAssembly.instantiate(module, {sutra_entropy:{fill_random(pointer,length) {
    crypto.getRandomValues(new Uint8Array(instance.exports.memory.buffer,pointer,length));
  }}});
  const engine = instance.exports;
  function run(mode,input) {
    if (!(input instanceof Uint8Array) || !input.length || input.length > MAX_IO) throw new Error('PRIVATE_MODULE_INPUT');
    new Uint8Array(engine.memory.buffer,engine.private_input_pointer(),input.length).set(input);
    const size = engine.private_run(mode,input.length) >>> 0;
    if (mode === 2) return size === 1;
    if (size > 2048) throw new Error('PRIVATE_MODULE_OUTPUT');
    if (!size) return null;
    return new Uint8Array(engine.memory.buffer,engine.private_output_pointer(),size).slice();
  }
  return Object.freeze({prove:input => run(1,input),verify:input => run(2,input)});
}

let active;
export function loadPrivateEngine() {
  if (!active) active = (async () => {
    const url = new URL('./private-affine.wasm',document.baseURI);
    if (url.origin !== location.origin) throw new Error('PRIVATE_MODULE_ORIGIN');
    const response = await fetch(url.href,{credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(5000)});
    if (response.status !== 200 || response.url !== url.href || response.headers.has('content-range') ||
        !/^application\/wasm(?:\s*;|$)/i.test(response.headers.get('Content-Type') ?? '') ||
        Number(response.headers.get('Content-Length')) > MAX_MODULE || !response.body) {
      await response.body?.cancel();
      throw new Error('PRIVATE_MODULE_RESPONSE');
    }
    const bytes = new Uint8Array(MAX_MODULE);
    const reader = response.body.getReader();
    let total = 0, fragments = 0;
    try {
      for (;;) {
        const {done,value} = await reader.read();
        if (done) break;
        if (value.length > MAX_MODULE-total || ++fragments > 8192) throw new Error('PRIVATE_MODULE_SIZE');
        bytes.set(value,total);
        total += value.length;
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    return instantiatePrivateEngine(bytes.subarray(0,total));
  })().catch(error => { active = undefined; throw error; });
  return active;
}
