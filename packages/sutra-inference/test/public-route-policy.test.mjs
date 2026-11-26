import test from 'node:test';
import assert from 'node:assert/strict';
import {publicAddress,createPublicRoutePolicy} from '../public-route-policy.js';
const route={connectionId:'own-provider',protocol:'openai-compatible-json',endpoint:'https://api.provider.example.com/v1/chat/completions',models:['my/model','other/model']};
const input={connectionId:route.connectionId,protocol:route.protocol,endpoint:route.endpoint,model:'my/model'};
const a4={address:'8.8.8.8',family:4},a6={address:'2606:4700:4700::1111',family:6};
test('conservative public address screen rejects local, special, mapped and transition ranges',()=>{
 for(const ip of ['8.8.8.8','1.1.1.1','93.184.216.34','2606:4700:4700::1111','2001:4860:4860::8888'])assert.equal(publicAddress(ip),true,ip);
 for(const ip of ['0.0.0.0','10.1.1.1','100.64.0.1','127.0.0.1','169.254.169.254','172.31.255.255','192.0.0.9','192.0.2.1','192.88.99.1','192.168.1.1','198.18.1.2','198.51.100.1','203.0.113.1','224.0.0.1','240.0.0.1','255.255.255.255','::','::1','::ffff:8.8.8.8','::ffff:127.0.0.1','64:ff9b::808:808','fc00::1','fe80::1','ff02::1','2001::1','2001:db8::1','2002:0808:0808::1','3fff::1','2606:4700::1%eth0','2130706433','0177.0.0.1'])assert.equal(publicAddress(ip),false,ip);
});
test('all resolver answers must be public and family-correct; no mixed answer fallback',async()=>{
 for(const answers of [[a4,{address:'127.0.0.1',family:4}],[a6,{address:'::ffff:8.8.8.8',family:6}],[{address:'8.8.8.8',family:6}],[],Array(17).fill(a4)]){
  const p=createPublicRoutePolicy({routes:[route],resolveAll:async()=>answers,clock:()=>0});
  await assert.rejects(p.prepare(input),/DNS_/);
 }
});
test('exact host and model route, one-shot opaque lease, deterministic address and TLS requirements',async()=>{
 const queried=[];let tick=0;
 const p=createPublicRoutePolicy({routes:[route],resolveAll:async host=>{queried.push(host);return [a6,a4,a4];},clock:()=>tick,ttlMs:100});
 const lease=await p.prepare(input);
 assert.deepEqual(queried,['api.provider.example.com']);
 assert.throws(()=>p.consume({...lease},input),/LEASE/);
 const d=p.consume(lease,input);assert.equal(d.address,'8.8.8.8');assert.equal(d.servername,'api.provider.example.com');assert.equal(d.path,'/v1/chat/completions');assert.equal(d.redirects,'deny');assert.equal(d.dns,'pinned-address-only');assert.equal(d.authority,'HOST_TRANSPORT_REQUIRED');
 assert.throws(()=>p.consume(lease,input),/LEASE/);
 const wrong=await p.prepare(input);assert.throws(()=>p.consume(wrong,{...input,model:'other/model'}),/ROUTE/);assert.throws(()=>p.consume(wrong,input),/LEASE/);
 const expired=await p.prepare(input);tick=100;assert.throws(()=>p.consume(expired,input),/EXPIRED/);
});
test('DNS delay, fresh resolution, rollback, closure and destination substitution refuse',async()=>{
 let tick=0,calls=0;
 const p=createPublicRoutePolicy({routes:[route],resolveAll:async()=>{calls++;return calls===1?[a4]:[{address:'10.0.0.1',family:4}];},clock:()=>tick});
 const first=await p.prepare(input);assert.equal(p.consume(first,input).address,a4.address);await assert.rejects(p.prepare(input),/DNS_ADDRESS/);
 await assert.rejects(p.prepare({...input,endpoint:'https://other.provider.com/v1/chat'}),/ROUTE/);assert.equal(calls,2);
 const q=createPublicRoutePolicy({routes:[route],resolveAll:async()=>{tick+=10;return [a4];},clock:()=>tick,ttlMs:10});await assert.rejects(q.prepare(input),/EXPIRED/);
 const r=createPublicRoutePolicy({routes:[route],resolveAll:async()=>[a4],clock:()=>tick});const lease=await r.prepare(input);tick--;assert.throws(()=>r.consume(lease,input),/CLOCK/);
 const s=createPublicRoutePolicy({routes:[route],resolveAll:async()=>[a4]});const other=await s.prepare(input);s.close();assert.throws(()=>s.consume(other,input),/CLOSED/);
});
test('malformed endpoints, literal addresses, userinfo, queries and unsupported ports are denied before resolution',()=>{
 for(const endpoint of ['http://api.provider.com/v1/chat','https://127.0.0.1/v1/chat','https://[::1]/v1/chat','https://api.local/v1/chat','https://api.provider.com:8443/v1/chat','https://api.provider.com:443/v1/chat','https://user@api.provider.com/v1/chat','https://api.provider.com/v1/chat?key=x','https://api.provider.com/v1/chat#x','https://api.provider.com/v1/%2e%2e/chat','https://api.provider.com/v1//chat','https://api.provider.com./v1/chat']){
  assert.throws(()=>createPublicRoutePolicy({routes:[{...route,endpoint}],resolveAll:async()=>{throw Error('must not call');}}),/ENDPOINT/,endpoint);
 }
});
