import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash,createPrivateKey,createPublicKey,sign,verify} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openLocalHistoryStore} from '../local-history-store.mjs';
import {createHistoryWitnessClient,openExternallyWitnessedHistoryStore} from '../history-witness-client.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {createInvestigationHistory} from '../investigation-history.js';
const pin=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const pem=k=>k.export({format:'pem',type:k.type==='private'?'pkcs8':'spki'}).toString();
const raw=k=>Buffer.from(createPublicKey(k).export({format:'der',type:'spki'})).subarray(-32);
const childCode=String.raw`
import http from 'node:http';import {createPrivateKey,createPublicKey,sign,verify} from 'node:crypto';
const V=Buffer.from('SUTRA/shared-authority-witness-view/v1\\0'),T=Buffer.from('SUTRA/shared-authority-witness-transition/v1\\0'),A=Buffer.from('SUTRA/shared-authority-witness-attestation/v1\\0');
const ctx=Buffer.from(process.env.CTX,'hex'),genesis=Buffer.from(process.env.GENESIS,'hex'),authorityPem=Buffer.from(process.env.AUTHORITY,'base64').toString(),witnessPem=Buffer.from(process.env.WITNESS,'base64').toString(),authority=createPublicKey(authorityPem),authorityRaw=Buffer.from(authority.export({format:'der',type:'spki'})).subarray(-32),witness=createPrivateKey(witnessPem);
let sequence=0,head=Buffer.from(genesis);
const view=()=>{const body=Buffer.alloc(68);body.writeUInt32BE(sequence,0);genesis.copy(body,4);head.copy(body,36);return Buffer.concat([body,sign(null,Buffer.concat([V,ctx,authorityRaw,body]),witness)]);};
const server=http.createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);res.setHeader('content-type','application/octet-stream');res.setHeader('cache-control','no-store');
 if(req.method!=='POST'||req.url?.includes('?')||req.headers['content-type']!=='application/octet-stream'){res.statusCode=400;return res.end();}
 if(req.url==='/witness/view'){if(body.length!==32){res.statusCode=400;return res.end();}const v=view(),sig=sign(null,Buffer.concat([A,ctx,authorityRaw,body,v]),witness);return res.end(Buffer.concat([body,v,sig]));}
 if(req.url==='/witness'){if(body.length!==128){res.statusCode=400;return res.end();}const before=body.subarray(0,32),after=body.subarray(32,64),sig=body.subarray(64);if(!before.equals(head)||after.equals(before)||!verify(null,Buffer.concat([T,ctx,before,after]),authority,sig)){res.statusCode=409;return res.end();}head=Buffer.from(after);sequence++;return res.end(view());}
 res.statusCode=400;res.end();
});
server.listen(0,'127.0.0.1',()=>process.stdout.write(String(server.address().port)+'\\n'));process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
`;
async function witnessProcess(t,{context,genesis,authority,witness}){
 const p=spawn(process.execPath,['--input-type=module','-e',childCode],{env:{...process.env,CTX:context.toString('hex'),GENESIS:genesis.toString('hex'),AUTHORITY:Buffer.from(pem(authority.publicKey)).toString('base64'),WITNESS:Buffer.from(pem(witness.privateKey)).toString('base64')},stdio:['ignore','pipe','pipe']});
 let stderr='';p.stderr.on('data',d=>stderr+=d);const port=await new Promise((resolve,reject)=>{let s='';p.stdout.on('data',d=>{s+=d;const m=s.match(/^(\\d+)\\n/);if(m)resolve(Number(m[1]));});p.once('exit',code=>reject(Error('witness exited '+code+' '+stderr)));});
 t.after(()=>{p.kill('SIGTERM');});return {process:p,origin:'http://127.0.0.1:'+port};
}
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'sutra-witnessed-history-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const a=await livingFixture('finance'),b=await livingFixture('finance',{revised:true,previousDigest:a.digest}),h=await createInvestigationHistory(a.versionText,a.digest),root=h.snapshot(),next=await h.append({expectedHistoryPin:root.digest,branch:'main',expectedHead:a.digest,versionText:b.versionText,versionPin:b.digest});
 const store=await openLocalHistoryStore(dir);await store.initialize(root.historyText,root.digest);
 const authority=generateKeyPairSync('ed25519'),witness=generateKeyPairSync('ed25519'),context=createHash('sha256').update('sutra-history-witness-test').digest();
 const server=await witnessProcess(t,{context,genesis:Buffer.from(root.digest.slice(7),'hex'),authority,witness});
 let byte=1;const client=createHistoryWitnessClient({origin:server.origin,contextPin:pin(context),genesisPin:root.digest,authorityPublicKey:pem(authority.publicKey),authorityPrivateKey:pem(authority.privateKey),witnessPublicKey:pem(witness.publicKey),randomBytes:n=>Buffer.alloc(n,byte++)});
 return {dir,a,b,root,next,store,client,server,authority,witness,context};
}
test('fresh challenge-bound witness detects local rollback and refuses stale independently retained view',async t=>{
 const f=await fixture(t),trusted=await f.client.attest(),wrapped=openExternallyWitnessedHistoryStore({store:f.store,witness:f.client});
 assert.equal(trusted.sequence,0);assert.equal(trusted.headPin,f.root.digest);
 const read=await wrapped.readFresh({expectedHead:f.root.digest,trustedView:trusted});assert.equal(read.history.digest,f.root.digest);
 const advanced=await wrapped.appendFresh({expectedHead:f.root.digest,nextText:f.next.historyText,nextPin:f.next.digest,trustedView:trusted});assert.equal(advanced.witness.sequence,1);assert.equal(advanced.witness.headPin,f.next.digest);
 await assert.rejects(wrapped.readFresh({expectedHead:f.root.digest,trustedView:trusted}),e=>e.code==='WITNESS_ADVANCED');
 await writeFile(join(f.dir,'HEAD'),f.root.digest+'\n',{mode:0o600});
 await assert.rejects(wrapped.readFresh({expectedHead:f.next.digest,trustedView:advanced.witness}),/HISTORY_STORE_STALE_OR_ROLLED_BACK_HEAD/);
});
test('witness challenge replay and process rollback are refused even with same signing key',async t=>{
 const f=await fixture(t),trusted=await f.client.attest(),wrapped=openExternallyWitnessedHistoryStore({store:f.store,witness:f.client}),advanced=await wrapped.appendFresh({expectedHead:f.root.digest,nextText:f.next.historyText,nextPin:f.next.digest,trustedView:trusted});
 f.server.process.kill('SIGTERM');await new Promise(r=>setTimeout(r,30));
 const reset=await witnessProcess(t,{context:f.context,genesis:Buffer.from(f.root.digest.slice(7),'hex'),authority:f.authority,witness:f.witness});
 let b=90;const rolled=createHistoryWitnessClient({origin:reset.origin,contextPin:pin(f.context),genesisPin:f.root.digest,authorityPublicKey:pem(f.authority.publicKey),authorityPrivateKey:pem(f.authority.privateKey),witnessPublicKey:pem(f.witness.publicKey),randomBytes:n=>Buffer.alloc(n,b++)});
 const rolledStore=openExternallyWitnessedHistoryStore({store:f.store,witness:rolled});
 await assert.rejects(rolledStore.readFresh({expectedHead:f.next.digest,trustedView:advanced.witness}),e=>['WITNESS_ROLLBACK','WITNESS_ADVANCED'].includes(e.code));
});
test('lost witness advance response has bounded one-step recovery without blind local retry',async t=>{
 const f=await fixture(t),trusted=await f.client.attest(),wrapped=openExternallyWitnessedHistoryStore({store:f.store,witness:f.client});
 await f.store.append({expectedHead:f.root.digest,nextText:f.next.historyText,nextPin:f.next.digest});
 const unseen=await f.client.advance(f.root.digest,f.next.digest);assert.equal(unseen.sequence,1);
 const recovered=await wrapped.recoverAfterAmbiguousAdvance({beforePin:f.root.digest,expectedHead:f.next.digest,trustedView:trusted});
 assert.equal(recovered.recovery,'ADVANCE_ALREADY_OBSERVED');assert.equal(recovered.witness.headPin,f.next.digest);
 await assert.rejects(f.client.advance(f.root.digest,f.next.digest),e=>e.code==='WITNESS_CONFLICT');
});
test('client refuses insecure remote HTTP and mismatched authority private key before contact',async()=>{
 const a=generateKeyPairSync('ed25519'),other=generateKeyPairSync('ed25519'),w=generateKeyPairSync('ed25519'),z='sha256:'+'1'.repeat(64);
 assert.throws(()=>createHistoryWitnessClient({origin:'http://example.com',contextPin:z,genesisPin:z,authorityPublicKey:pem(a.publicKey),authorityPrivateKey:pem(a.privateKey),witnessPublicKey:pem(w.publicKey)}),e=>e.code==='ORIGIN');
 assert.throws(()=>createHistoryWitnessClient({origin:'https://example.com',contextPin:z,genesisPin:z,authorityPublicKey:pem(a.publicKey),authorityPrivateKey:pem(other.privateKey),witnessPublicKey:pem(w.publicKey)}),e=>e.code==='KEY');
});
