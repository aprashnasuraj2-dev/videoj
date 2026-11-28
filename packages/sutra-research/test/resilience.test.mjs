import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalResearchGateway} from '../local-workspace-gateway.js';
import {createResearchModelBroker} from '../model-broker.js';
import {digest} from '../research-session.js';
const creds={groq:'fixture-groq-key'},model='fixture-model';
const urls=['https://alpha.example.org/a','https://beta.example.org/b'];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function fixture({responseFailure,reviewEnabled=true,failSource=false,hold=false}={}){
 const calls=[],reads=[];let plans=0,release;
 const gateway=createLocalResearchGateway({modelCredentials:creds,configure:a=>({providers:{},readDocument:async url=>{
 reads.push(url);a.reserve('document',{bytes:262144});if(failSource&&url===urls[1])throw Object.assign(Error('fixture interruption'),{code:'NETWORK_INTERRUPTED'});
 const text='Battery costs were USD 100 in 2025.';return {url,text,textDigest:digest(text),rawDigest:digest(text),links:[],mediaType:'text/plain',retrievedAt:'2026-11-27T12:00:00.000Z',parser:'bounded-text/v1'};
 },modelBroker:createResearchModelBroker({authorization:a,credentials:creds,exchangeFactory:()=>({close(){},async exchange(req){
 const body=JSON.parse(req.bodyText),input=JSON.parse(body.messages.at(-1).content),system=body.messages[0].content;calls.push(system.includes('decision maker')?'plan':system.includes('synthesizer')?'synthesis':'review');if(hold&&calls.length===1)await new Promise(r=>{release=r;});
 if(calls.length===1&&responseFailure){if(responseFailure==='network')throw Object.assign(Error('fixture interruption'),{code:'NETWORK_INTERRUPTED'});return responseFailure==='invalid'?{status:200,bodyText:'not JSON'}:{status:responseFailure,bodyText:'private upstream message fixture-groq-key'};}
 let value;
 if(calls.at(-1)==='plan')value=++plans===1?{webAction:'open_public_urls',urls}:{webAction:'finish_research'};
 else if(calls.at(-1)==='synthesis')value={claims:[{statement:'One report gives a figure.',kind:'reported',citations:[{passageId:input.evidence[0].passageId,quote:input.evidence[0].quote}]}],gaps:[]};
 else value={reviews:[{claimId:input.claims[0].claimId,verdict:'supported',reason:'Reported figure.',citations:[]}],conflicts:[]};
 return {status:200,bodyText:JSON.stringify({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(value)}}],usage:{completion_tokens:20}})};
 }})})})});
 const p=gateway.preview({objective:'Compare battery costs',models:[{vendor:'groq',model}],reviewEnabled,browserScheduled:true});const s=gateway.start({approvedPlanPin:p.planPin,approvalId:p.approvalId,approvePublicContact:true,approveEstimatedCost:true,approveModelDisclosure:true});
 const status=()=>gateway.status(s.sessionId);const permit=async()=>{for(let i=0;i<200;i++){const v=status();if(v.pendingOperation)return v.pendingOperation;if(v.state!=='running')return null;await wait(5);}throw Error('permit timeout');};
 const advance=o=>gateway.advance({sessionId:s.sessionId,planPin:s.planPin,operationId:o.id,sequence:o.sequence,...(['select_query','select_document'].includes(o.kind)?{selectionId:o.choices[0].id}:{})});
 const drain=async()=>{for(let i=0;i<20;i++){const o=await permit();if(!o)return status();advance(o);}throw Error('wave limit');};
 return {gateway,p,s,status,permit,advance,drain,calls,reads,release:()=>release?.()};
}
for(const [failure,code] of [[429,'MODEL_RATE_LIMIT'],[503,'MODEL_UPSTREAM_UNAVAILABLE'],['invalid','MODEL_RESPONSE'],['network','NETWORK_INTERRUPTED']])test('no automatic retry on '+failure,async()=>{
 const f=fixture({responseFailure:failure});try{const op=await f.permit();assert.equal(f.calls.length,0);assert.throws(()=>f.gateway.advance({sessionId:f.s.sessionId,planPin:f.s.planPin,operationId:op.id,sequence:999}),/OPERATION_PERMIT/);f.advance(op);assert.throws(()=>f.advance(op),/OPERATION_PERMIT/);
 const done=await f.drain();assert.equal(done.state,'closed');assert.equal(f.calls.length,1);assert.equal(f.reads.length,0);assert.equal(done.report.failures[0].reason,code);assert.equal(done.report.usage.modelCalls,1);assert.doesNotMatch(JSON.stringify(done),/fixture-groq-key|private upstream message/);
 }finally{f.gateway.close();}
});
test('review disabled preserves verified spans and successful evidence after another source fails',async()=>{
 const f=fixture({reviewEnabled:false,failSource:true});try{assert.equal(f.p.reviewMode,'review_disabled');const done=await f.drain();assert.equal(done.state,'closed');assert.deepEqual(f.calls,['plan','plan','synthesis']);assert.equal(f.reads.length,2);assert.equal(done.report.documents.length,1);assert.equal(done.report.intelligence.claims[0].publicationStatus,'withheld_from_findings');assert.equal(done.report.intelligence.reviewMode,'review_disabled');assert.ok(done.report.failures.some(x=>x.reason==='NETWORK_INTERRUPTED'));
 }finally{f.gateway.close();}
});
test('cancelled in-flight model cannot publish late response or launch another wave',async()=>{
 const f=fixture({hold:true});try{const op=await f.permit();f.advance(op);for(let i=0;i<200&&!f.calls.length;i++)await wait(5);assert.equal(f.calls.length,1);f.gateway.cancel(f.s.sessionId);f.release();for(let i=0;i<200&&f.status().state!=='cancelled';i++)await wait(5);const done=f.status();assert.equal(done.state,'cancelled');assert.equal(done.report,null);assert.equal(done.pendingOperation,null);assert.equal(f.calls.length,1);assert.throws(()=>f.advance(op),/OPERATION_PERMIT/);
 }finally{f.release();f.gateway.close();}
});
