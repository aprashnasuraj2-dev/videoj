import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {prepareHostedHybridGateway,HOSTED_GATEWAY_PROFILES,resolveHostedAddresses} from '../hosted-hybrid-gateway.js';
async function fixture(){
 const v=await livingFixture(),wire=JSON.parse(v.versionText),p=HOSTED_GATEWAY_PROFILES[0];
 const c={version:'sutra-mixed-expression-council/v1',contractText:wire.contractText,contractPin:wire.contractPin,disclosure:{bindingIds:['first','baseline'],includeValues:false},connections:[{id:'one',label:'Official route',endpoint:p.endpoint,protocol:p.protocol,authMode:p.authMode,credentialEnv:p.credentialEnv,models:['fixture-model'],transportClass:'hosted'}],agents:[{id:'critic',role:'Compare',connectionId:'one',model:'fixture-model'}],budget:{maxCalls:1,maxInputBytes:100000,maxOutputTokens:256,maxConcurrent:1},maxRounds:1,maxOutputTokens:128,roundPolicy:'fixed',timeoutMs:5000,transportDeadlineMs:2000};
 const text=()=>JSON.stringify({version:'sutra-mixed-hybrid-operator/v1',versionText:v.versionText,versionPin:v.digest,councilConfigText:JSON.stringify(c)});
 return {c,text};
}
test('official recipient gateway preview is inert, wrong pins or missing approval cannot read secrets',async()=>{
 const f=await fixture();let reads=0,dns=0;
 const g=await prepareHostedHybridGateway({configText:f.text(),readCredential:()=>{reads++;return null;},resolveAll:()=>{dns++;throw Error('never');}});
 assert.equal(g.preview.recipients[0].vendor,'openai');assert.equal(reads,0);assert.equal(dns,0);
 for(const opts of [{approvedPlanPin:'wrong',approveDisclosure:true,approveHosted:true},{approvedPlanPin:g.planPin,approveDisclosure:true},{approvedPlanPin:g.planPin,approveHosted:true}]){
  await assert.rejects(g.execute(opts),e=>e.code==='APPROVAL');
 }
 assert.equal(reads,0);assert.equal(dns,0);
 await assert.rejects(g.execute({approvedPlanPin:g.planPin,approveDisclosure:true,approveHosted:true}),e=>e.code==='CREDENTIAL_REQUIRED');
 assert.equal(reads,1);assert.equal(dns,0);
 await assert.rejects(g.execute({approvedPlanPin:g.planPin,approveDisclosure:true,approveHosted:true}),e=>e.code==='CONSUMED');
});
test('endpoint, auth and credential alias substitution rejected before any DNS or credential access',async()=>{
 const f=await fixture(),original={...f.c.connections[0]};
 for(const patch of [{endpoint:'https://api.openai.com/v1/other'},{endpoint:'https://api.attacker.example.com/v1/chat/completions'},{credentialEnv:'SUTRA_HOSTED_ANTHROPIC'},{authMode:'none',credentialEnv:null}]){
  f.c.connections[0]={...original,...patch};
  await assert.rejects(prepareHostedHybridGateway({configText:f.text(),readCredential:()=>{throw Error('must not read');}}),e=>e.code==='RECIPIENT_POLICY');
 }
 await assert.rejects(resolveHostedAddresses('attacker.example.com'),e=>e.code==='HOST');
});
test('real gateway composition refuses private DNS answer before TLS dial or HTTP, result is not an admitted model proposal',async()=>{
 const f=await fixture();let dns=0,dials=0;
 const g=await prepareHostedHybridGateway({configText:f.text(),readCredential:()=> 'TEST_HOSTED_GATEWAY_SECRET',resolveAll:async()=>{dns++;return [{address:'127.0.0.1',family:4}];},hostedIO:{dialTls(){dials++;throw Error('never');},requestHttps(){throw Error('never');}}});
 const result=await g.execute({approvedPlanPin:g.planPin,approveDisclosure:true,approveHosted:true});
 assert.equal(dns,1);assert.equal(dials,0);assert.equal(result.result.artifacts.find(a=>a.taskId==='consult').value.candidates.length,0);assert.doesNotMatch(JSON.stringify(result),/TEST_HOSTED_GATEWAY_SECRET/);
});

test('all three official vendor profiles execute the six-specialist hybrid using isolated credentials and an eight-task checkpoint',async()=>{
 const {EventEmitter}=await import('node:events'),{buildHostedHybridPlan}=await import('../hosted-plan.js'),{openExecutionCheckpoint}=await import('../../sutra-runtime/execution-checkpoint.js');
 const v=await livingFixture(),roles=['planner','researcher','coder','analyst','critic','coordinator'],specialists=roles.map((id,i)=>({id,role:'Specialist '+id,vendor:HOSTED_GATEWAY_PROFILES[i%3].vendor,model:'fixture-model-'+i,bindingIds:['first','baseline'],includeValues:false,feedbackFrom:[]}));
 const b=await buildHostedHybridPlan({versionText:v.versionText,versionPin:v.digest,specialists,maxConcurrent:2}),requests=[],dns=[],reads=[],dials=[];
 const byHost=new Map(HOSTED_GATEWAY_PROFILES.map(p=>[new URL(p.endpoint).hostname,p])),keys=new Map(HOSTED_GATEWAY_PROFILES.map(p=>[p.credentialEnv,'HOSTED_ONLY_CANARY_'+p.vendor+'_123456']));
 const io={
  dialTls(opts){dials.push({host:opts.host,servername:opts.servername});const s=Object.assign(new EventEmitter(),{encrypted:true,authorized:true,remoteAddress:opts.host,remotePort:443,alpnProtocol:'http/1.1',getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:'+opts.servername}),destroy(){}});queueMicrotask(()=>s.emit('secureConnect'));return s;},
  requestHttps(opts,callback){const sock=opts.createConnection(),p=byHost.get(opts.hostname),req=Object.assign(new EventEmitter(),{destroy(){},end(body){
   requests.push({host:opts.hostname,path:opts.path,headers:opts.headers,body});const wire=JSON.parse(body),n=Number(wire.model.split('-').at(-1)),content=JSON.stringify({version:1,kind:'expression',expression:n%2?'[first] < [baseline]':'[first] > [baseline]'});
   const payload=p.vendor==='anthropic'?{type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:content}],usage:{output_tokens:4}}:{choices:[{index:0,message:{role:'assistant',content},finish_reason:'stop'}],usage:{completion_tokens:4}};
   queueMicrotask(()=>{req.emit('socket',sock);const res=Object.assign(new EventEmitter(),{statusCode:200,headers:{'content-type':'application/json'},complete:true,destroy(){}});callback(res);res.emit('data',Buffer.from(JSON.stringify(payload)));res.emit('end');});
  }});return req;}
 };
 const g=await prepareHostedHybridGateway({configText:b.text,readCredential:alias=>{reads.push(alias);return keys.get(alias);},resolveAll:async h=>{dns.push(h);return [{address:'8.8.8.8',family:4}];},hostedIO:io});
 assert.equal(reads.length+dns.length+dials.length+requests.length,0);
 const r=await g.execute({approvedPlanPin:b.planPin,approveDisclosure:true,approveHosted:true});
 assert.equal(r.status,'completed');assert.equal(requests.length,6);assert.equal(dns.length,6);assert.equal(dials.length,6);assert.equal(r.budget.used.calls,6);assert.equal(new Set(reads).size,3);
 for(const q of requests){const p=byHost.get(q.host),expected=keys.get(p.credentialEnv);assert.equal(q.path,new URL(p.endpoint).pathname);if(p.vendor==='anthropic'){assert.equal(q.headers['x-api-key'],expected);assert.equal(q.headers.Authorization,undefined);}else{assert.equal(q.headers.Authorization,'Bearer '+expected);assert.equal(q.headers['x-api-key'],undefined);}for(const key of keys.values())assert.ok(!q.body.includes(key));}
 for(const key of keys.values())assert.ok(!JSON.stringify(r).includes(key));
 const consult=r.result.artifacts.find(a=>a.taskId==='consult').value;assert.equal(consult.candidates.length,2);assert.equal(consult.decisionAuthority,'NONE');
 const cp=await openExecutionCheckpoint(r.checkpoint.text,r.checkpoint.pin,v.digest);assert.equal(cp.checkpoint.artifactPins.length,8);assert.equal(cp.checkpoint.events.filter(e=>e.type==='consultation.phase'&&e.payload.phase==='proposal-admitted').length,6);
});
