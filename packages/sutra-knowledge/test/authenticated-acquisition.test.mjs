import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync,createHash,createPrivateKey,sign} from 'node:crypto';import {spawn} from 'node:child_process';
import {casePin} from '../pinned-investigation.js';import {createAuthenticatedObservationClient,verifyAuthenticatedObservation,replayAuthenticatedAcquisitionPath} from '../authenticated-acquisition.js';import {livingFixture} from '../examples/living-investigation.mjs';
const pem=(k,type)=>k.export({format:'pem',type}).toString(),b64=b=>Buffer.from(b).toString('base64url');
const child=String.raw`
import http from 'node:http';import {createPrivateKey,sign} from 'node:crypto';import {createHash} from 'node:crypto';
const key=createPrivateKey(Buffer.from(process.env.KEY,'base64').toString()),keyId=process.env.KEY_ID;
const pin=s=>'sha256:'+createHash('sha256').update(s).digest('hex'),msg=(p)=>Buffer.from('SUTRA/authenticated-observation/v1\\0'+keyId+'\\0'+p);
const server=http.createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;if(req.method!=='POST'){res.statusCode=405;return res.end();}let q;try{q=JSON.parse(raw);}catch{res.statusCode=400;return res.end();}if(q.version!==1||typeof q.challenge!=='string'){res.statusCode=400;return res.end();}
 const sourceText='authenticated sensor says high',start=26,end=30,bodyText=JSON.stringify({version:'sutra-authenticated-observation-body/v1',challenge:q.challenge,actionId:q.actionId,outcome:'high',sourceId:q.sourceId,sourceText,sourcePin:pin(sourceText),start,end}),bodyPin=pin(bodyText),receipt=JSON.stringify({version:'sutra-authenticated-observation/v1',keyId,bodyText,bodyPin,signature:sign(null,msg(bodyPin),key).toString('base64url')});
 res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(receipt);
});server.listen(0,'127.0.0.1',()=>process.stdout.write(server.address().port+'\\n'));process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
`;
async function server(t,key,keyId='sensor_a'){const p=spawn(process.execPath,['--input-type=module','-e',child],{env:{...process.env,KEY:Buffer.from(pem(key.privateKey,'pkcs8')).toString('base64'),KEY_ID:keyId},stdio:['ignore','pipe','pipe']});const port=await new Promise((resolve,reject)=>{let s='';p.stdout.on('data',d=>{s+=d;const m=s.match(/^(\\d+)\\n/);if(m)resolve(Number(m[1]));});p.on('exit',c=>reject(Error('server '+c)));});t.after(()=>p.kill('SIGTERM'));return 'http://127.0.0.1:'+port+'/observe';}
async function policyFixture(){
 const v=await livingFixture('finance');const gridText=JSON.stringify({version:1,versionDigest:v.digest,axes:[{bindingId:'ocf26',values:['182935/1','1/1']}],maxAssignments:2}),gridPin=await casePin(gridText);
 const policyText=JSON.stringify({version:1,versionDigest:v.digest,gridDigest:gridPin,costUnit:'unit',exposureUnit:'unit',exposureBudget:1,sourceCosts:[{id:'filing_2026',costUpper:0}],initiallyAcquired:[],decisions:[{id:'choose_true',loss:{constraint_satisfied:0,constraint_refuted:10}},{id:'abstain',loss:{constraint_satisfied:3,constraint_refuted:3}}],actions:[{id:'read',sourceId:'filing_2026',bindingId:'ocf26',readCostUpper:0,exposure:1,outcomes:[{value:'182935/1',labels:['high']},{value:'1/1',labels:['low']}]}]}),policyPin=await casePin(policyText);
 const traceText=JSON.stringify({version:1,policyPin,events:[{actionId:'read',outcome:'high'}]}),tracePin=await casePin(traceText);return {v,gridText,gridPin,policyText,policyPin,traceText,tracePin};
}
test('separate external signer challenge is verified and drives only the declared replay path',async t=>{
 const key=generateKeyPairSync('ed25519'),url=await server(t,key),trustedKeys=[{keyId:'sensor_a',publicKey:pem(key.publicKey,'spki')}],client=createAuthenticatedObservationClient({trustedKeys,randomBytes:n=>Buffer.alloc(n,7)});
 const receipt=await client.collect({endpointUrl:url,actionId:'read',sourceId:'filing_2026'});assert.equal(receipt.authentication,'ED25519_SIGNER_AND_CHALLENGE_VERIFIED');assert.equal(receipt.body.outcome,'high');
 const f=await policyFixture(),bundleText=JSON.stringify({version:1,tracePin:f.tracePin,receipts:[{receiptText:receipt.receiptText,receiptPin:receipt.receiptPin}]}),bundlePin=await casePin(bundleText);
 const result=await replayAuthenticatedAcquisitionPath({...f,authenticatedReceiptsText:bundleText,authenticatedReceiptsPin:bundlePin,trustedKeys});assert.equal(result.observationAuthentication,'ED25519_SIGNER_VERIFIED');assert.deepEqual(result.signers,['sensor_a']);assert.equal(result.path.path.declaredDecision,'choose_true');
});
test('repinned content tamper, wrong signer and challenge mismatch refuse',async t=>{
 const key=generateKeyPairSync('ed25519'),wrong=generateKeyPairSync('ed25519'),url=await server(t,key),trusted=[{keyId:'sensor_a',publicKey:pem(key.publicKey,'spki')}],client=createAuthenticatedObservationClient({trustedKeys:trusted,randomBytes:n=>Buffer.alloc(n,9)}),r=await client.collect({endpointUrl:url,actionId:'read',sourceId:'filing_2026'});
 const wire=JSON.parse(r.receiptText),body=JSON.parse(wire.bodyText);body.sourceText+=' ';wire.bodyText=JSON.stringify(body);wire.bodyPin=await casePin(wire.bodyText);const tampered=JSON.stringify(wire);
 await assert.rejects(verifyAuthenticatedObservation({receiptText:tampered,receiptPin:await casePin(tampered),trustedKeys:trusted}),/AUTH_ACQUISITION_SIGNATURE/);
 await assert.rejects(verifyAuthenticatedObservation({receiptText:r.receiptText,receiptPin:r.receiptPin,trustedKeys:[{keyId:'sensor_a',publicKey:pem(wrong.publicKey,'spki')}]}),/AUTH_ACQUISITION_SIGNATURE/);
 await assert.rejects(verifyAuthenticatedObservation({receiptText:r.receiptText,receiptPin:r.receiptPin,trustedKeys:trusted,expectedChallenge:b64(Buffer.alloc(32,3))}),/AUTH_ACQUISITION_CHALLENGE/);
});
test('remote cleartext endpoint is refused before request',()=>{const k=generateKeyPairSync('ed25519'),client=createAuthenticatedObservationClient({trustedKeys:[{keyId:'sensor_a',publicKey:pem(k.publicKey,'spki')}]});assert.rejects(client.collect({endpointUrl:'http://example.com/observe',actionId:'read',sourceId:'filing_2026'}),/AUTH_ACQUISITION_ENDPOINT/);});
