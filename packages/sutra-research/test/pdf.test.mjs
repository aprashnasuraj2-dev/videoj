import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {extractPdfDocument,runSandboxedPdf,probePdfSandbox} from '../pdf-parser.js';
import {extractPassages,verifyPassage} from '../research-supervisor.js';
const body=Buffer.from('%PDF-1.7 fixture bytes');
test('PDF output retains page locators and rejects forged page',async()=>{
 const d=await extractPdfDocument(body,'https://primary.org/report.pdf',{parse:async()=> 'Battery costs were USD 100 million in 2025.\fBattery storage grew in 2026.\f'});
 const doc={...d,id:'source_1'},p=extractPassages(doc,'battery storage costs');assert.equal(d.pageMap.length,2);assert.ok(p.some(x=>x.locator.page===1));assert.ok(p.some(x=>x.locator.page===2));assert.ok(p.every(x=>verifyPassage(x,doc)));
 assert.equal(verifyPassage({...p[0],locator:{...p[0].locator,page:99}},doc),false);
 await assert.rejects(extractPdfDocument(Buffer.from('not a pdf'),'https://primary.org/a',{parse:async()=> 'text'}),/PDF_INPUT/);
});
test('PDF invocation is fixed, credential-free, namespace-isolated and fails closed on sandbox failure',async()=>{
 let invocation;const fake=(command,args,options)=>{invocation={command,args,options};const child=new EventEmitter();child.stdin=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};child.stdin.end=()=>queueMicrotask(()=>{child.stdout.emit('data',Buffer.from('text\f'));child.emit('close',0,null);});return child;};
 assert.equal(await runSandboxedPdf(body,{platform:'linux',spawnProcess:fake}),'text\f');assert.equal(invocation.command,'/usr/bin/prlimit');assert.ok(invocation.args.includes('--unshare-net'));assert.ok(invocation.args.includes('--disable-userns'));assert.ok(invocation.args.includes('--clearenv'));assert.equal(invocation.options.shell,false);assert.deepEqual(Object.keys(invocation.options.env).sort(),['LANG','PATH']);assert.ok(!invocation.args.includes('/home'));
 assert.throws(()=>runSandboxedPdf(body,{platform:'win32'}),/PDF_SANDBOX_UNAVAILABLE/);
 await assert.rejects(runSandboxedPdf(body,{platform:'linux',spawnProcess:()=>{throw Error('missing');}}),/PDF_SANDBOX_UNAVAILABLE/);
});

test('explicit PDF scope preflight requires successful sandbox probe; no fallback',async()=>{
 assert.equal(await probePdfSandbox({parse:async bytes=>{assert.ok(bytes.subarray(0,5).equals(Buffer.from('%PDF-')));assert.ok(bytes.includes(Buffer.from('startxref')));return 'SUTRA PDF sandbox probe';}}),true);
 await assert.rejects(probePdfSandbox({parse:async()=> 'wrong output'}),/PDF_SANDBOX_UNAVAILABLE/);
 await assert.rejects(probePdfSandbox({parse:async()=>{throw Error('namespace denied');}}),/PDF_SANDBOX_UNAVAILABLE/);
});
