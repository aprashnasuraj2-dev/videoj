// Actual Linux namespace / prlimit / Poppler integration, no network acquisition.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {stat,readFile} from 'node:fs/promises';
import {createServer,createConnection} from 'node:net';
import {fileURLToPath} from 'node:url';
import {probePdfSandbox,runSandboxedPdf,extractPdfDocument,PDF_INPUT_BYTES} from '../pdf-parser.js';
function hostileFixture(){
 const stream='BT /F1 12 Tf 72 720 Td (Visible synthetic evidence) Tj ET\n';
 const objects=['<< /Type /Catalog /Pages 2 0 R /OpenAction << /S /JavaScript /JS (SUTRA_JS_CANARY) >> >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'endstream'];
 let text='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(text));text+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const xref=Buffer.byteLength(text);text+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';return Buffer.from(text);
}
test('actual isolated PDF sandbox probe and active-content fixture extraction',async()=>{
 // Diagnostics are restricted to the known synthetic probe, never a fetched PDF.
 const diagnostics=[];const parse=(body,{signal}={})=>runSandboxedPdf(body,{signal,spawnProcess:(cmd,args,options)=>{const child=spawn(cmd,args,options);child.stderr.on('data',b=>{if(diagnostics.join('').length<2048)diagnostics.push(b.toString().slice(0,2048));});return child;}});
 try{assert.equal(await probePdfSandbox({parse}),true);}catch(e){console.error('Synthetic sandbox probe diagnostics: '+diagnostics.join('').slice(0,2048));throw e;}
 const body=hostileFixture(),doc=await extractPdfDocument(body,'https://example.org/fixture.pdf');
 assert.match(doc.text,/Visible synthetic evidence/);assert.doesNotMatch(doc.text,/SUTRA_JS_CANARY/);
 assert.equal(doc.pageMap.length,1);assert.equal(doc.metadata.ocr,'not_performed');assert.deepEqual(doc.links,[]);
 await assert.rejects(runSandboxedPdf(Buffer.from('%PDF-1.7\nmalformed payload\n')),/PDF_SANDBOX_OR_PARSE/);
 const tooLarge=Buffer.alloc(PDF_INPUT_BYTES+1);tooLarge.write('%PDF-');assert.throws(()=>runSandboxedPdf(tooLarge),/PDF_INPUT/);
 const c=new AbortController();c.abort();await assert.rejects(runSandboxedPdf(body,{signal:c.signal}),/PDF_CANCELLED/);
});

test('actual parser envelope hides host filesystem and network, drops capabilities and enforces hard limits',async()=>{
 // Positive controls: a missing fixture or an unreachable host listener cannot prove isolation.
 assert.equal((await readFile('/tmp/sutra-pdf-ci/host-canary','utf8')).trim(),'synthetic-host-canary');
 const helper=fileURLToPath(new URL('./pdf-isolation-probe',import.meta.url));
 const net=(await stat('/proc/self/ns/net')).ino,pid=(await stat('/proc/self/ns/pid')).ino;
 const listener=createServer(c=>c.destroy());await new Promise((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve);});
 try{
  await new Promise((resolve,reject)=>{const socket=createConnection({host:'127.0.0.1',port:listener.address().port});socket.setTimeout(1000,()=>socket.destroy(new Error('Host loopback positive control timed out')));socket.once('error',reject);socket.once('connect',()=>{socket.destroy();resolve();});});
  const diagnostics=[];const result=await runSandboxedPdf(hostileFixture(),{spawnProcess:(cmd,args,options)=>{
   const i=args.lastIndexOf('--');assert.equal(args[i+1],'/usr/bin/pdftotext');
   const probeArgs=[...args.slice(0,i),'--ro-bind',helper,'/usr/bin/sutra-pdf-isolation-probe','--','/usr/bin/sutra-pdf-isolation-probe',String(net),String(pid),String(listener.address().port)];
   const child=spawn(cmd,probeArgs,{...options,env:{...options.env,SUTRA_PDF_SECRET_CANARY:'synthetic-not-secret'}});
   child.stderr.on('data',b=>{if(diagnostics.join('').length<2048)diagnostics.push(b.toString().slice(0,2048));});return child;
  }}).catch(e=>{console.error('Synthetic isolation probe diagnostics: '+diagnostics.join('').slice(0,2048));throw e;});
  assert.equal(result.trim(),'SUTRA_ISOLATION_PROBE_OK');
 }finally{await new Promise(r=>listener.close(r));}
});
