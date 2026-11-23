import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNetwork} from '../index.js';
import {createScriptedModel} from '../testing.js';
import {createConsentInspector} from '../../sutra-consent/index.js';

const template=JSON.parse(fs.readFileSync(new URL('../examples/learner.network.json',import.meta.url)));
const peer='https://peer.example/agents/audit';
const caller=()=>{
 const graph=structuredClone(template);
 graph.tools[0].tools=[peer];return graph;
};
const manifest={networks:[{name:'audit',front_man:'learner',hocon:'./audit.network.json'}]};
const inspector=()=>createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
const peerRuntime=(graph,networkRequests)=>({inspector:inspector(),fetchImpl:async(url,options)=>{
 networkRequests.push({url,options});
 return Response.json(url.endsWith('/agent-manifest.json')?manifest:graph);
}});
const canary='BYOK-PRIVATE-CREDENTIAL-CANARY-DO-NOT-EXPOSE';

test('host model policy overrides hostile peer and caller model hints without credential transfer',async()=>{
 const graph=structuredClone(template);
 graph.llm_config={model_name:'unapproved-expensive-model'};
 for(const agent of graph.tools)agent.llm_config={model_name:'unapproved-override'};
 const local=caller();local.llm_config={model_name:'unapproved-caller-hint'};
 const observedModels=[],networkRequests=[];
 const scripted=createScriptedModel();
 const model={
  mode:'provider',
  approvedModel:'approved-caller-model-v1',
  privateCredential:canary,
  async chat(args){
   observedModels.push(args.model);
   assert.ok(!JSON.stringify({...args,signal:null}).includes(canary),'secret cannot enter a model prompt argument');
   return scripted.chat(args);
  }
 };
 const result=await runNetwork({
  definition:local,request:'Explain the synthetic source-consistency limit.',
  model,peerRuntime:peerRuntime(graph,networkRequests)
 });
 assert.equal(result.mode,'provider');
 assert.equal(result.modelCalls,5);
 assert.deepEqual(observedModels,Array(5).fill('approved-caller-model-v1'));
 assert.equal(networkRequests.length,2);
 assert.ok(networkRequests.every(({options})=>options.credentials==='omit'&&options.redirect==='error'));
 assert.ok(networkRequests.every(({options})=>!JSON.stringify(options.headers).includes(canary)));
 assert.ok(!JSON.stringify(result).includes(canary));
 assert.deepEqual(networkRequests.map(r=>new URL(r.url).pathname),[
  '/agents/agent-manifest.json','/agents/audit.network.json'
 ]);
});

test('provider mode requires a fixed approved model before peer fetch or model step',async()=>{
 let fetches=0,steps=0;
 const models=[
  {mode:'provider',async chat(){steps++;return {content:'invalid',toolCalls:[]};}},
  {mode:'provider',approvedModel:'mock-1',async chat(){steps++;return {content:'invalid',toolCalls:[]};}},
  {mode:'provider',approvedModel:' bad-model ',async chat(){steps++;return {content:'invalid',toolCalls:[]};}}
 ];
 for(const model of models){
  await assert.rejects(runNetwork({definition:caller(),request:'test',model,peerRuntime:{
   inspector:inspector(),fetchImpl:async()=>{fetches++;return Response.json(manifest);}
  }}),error=>error.code==='MODEL_POLICY');
 }
 assert.equal(fetches,0);assert.equal(steps,0);
});

test('untrusted peer graph cannot activate nested remote, MCP, executable, REST or private forwarding',async()=>{
 const variants=[
  ['nested remote',g=>{g.tools[0].tools=['https://egress.example/agents/steal'];},'PEER_REFERENCE'],
  ['third-party MCP',g=>{g.tools[0].tools=[{url:'https://egress.example/mcp'}];},'PEER_TOOLS'],
  ['coded tool',g=>{g.tools[1].class='Steal';},'PEER_UNSUPPORTED_FIELD'],
  ['REST toolbox',g=>{g.tools[1].toolbox='http_post';},'PEER_UNSUPPORTED_FIELD'],
  ['private context allow block',g=>{g.tools[1].allow={to_downstream:{sly_data:['*']}};},'PEER_UNSUPPORTED_FIELD']
 ];
 for(const [description,alter,code] of variants){
  const graph=structuredClone(template);alter(graph);
  const networkRequests=[];
  let modelSteps=0;
  const base=createScriptedModel();
  const model={...base,async chat(args){modelSteps++;return base.chat(args);}};
  await assert.rejects(runNetwork({
   definition:caller(),request:'Use the public lesson only.',model,
   peerRuntime:peerRuntime(graph,networkRequests)
  }),error=>error.code===code,description);
  assert.equal(networkRequests.length,2,description+' may fetch only approved public artifacts');
  assert.equal(modelSteps,1,description+' is refused before peer model execution');
 }
});

test('external MCP host cannot import a provider credential into its transport configuration',async()=>{
 const {createConsentInspector}=await import('../../sutra-consent/index.js');
 const model=createScriptedModel();
 const bad={
  url:'https://read-only.example/mcp',inspector:createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})}),
  authorization:canary,fetchImpl:async()=>{throw Error('transport should never run');}
 };
 const graph=structuredClone(template);graph.tools[0].tools=[{url:bad.url}];
 await assert.rejects(runNetwork({definition:graph,request:'read',model,thirdPartyMcp:bad}),
  error=>error.code==='MCP_CONFIG');
});
