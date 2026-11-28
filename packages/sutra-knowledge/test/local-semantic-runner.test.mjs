import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {admitLocalSemanticConfig,VERSION} from '../local-semantic-config.js';
const cli=fileURLToPath(new URL('../../../apps/sutra-v2/local-semantic.mjs',import.meta.url));
const secret='LOCAL_SEMANTIC_TEST_CANARY_1234',hidden='UNSELECTED_SEMANTIC_SOURCE_1234';
function run(config,args=[],env={}){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[cli,...args],{stdio:['pipe','pipe','pipe'],env:{...process.env,...env}}),out=[],err=[];child.stdout.on('data',x=>out.push(x));child.stderr.on('data',x=>err.push(x));child.once('error',reject);child.once('close',code=>resolve({code,stdout:Buffer.concat(out).toString('utf8'),stderr:Buffer.concat(err).toString('utf8')}));child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(config));});}
async function fixture(t){
 const requests=[];let echo=false;
 const server=createServer((req,res)=>{let body='';req.on('data',x=>body+=x);req.on('end',()=>{requests.push({body,headers:req.headers});const p=JSON.parse(JSON.parse(body).messages.at(-1).content),content=JSON.stringify({version:1,packetDigest:p.packetDigest,disposition:'ABSTAIN',alternatives:[],clarifications:[echo?secret:'Which reporting period?']});res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({done:true,done_reason:'stop',message:{role:'assistant',content:echo?content.replace(secret,'\\u004c'+secret.slice(1)):content},eval_count:50}));});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
 const d=await sealReviewedDraft(JSON.stringify({version:1,question:'Is the service available?',sources:[{id:'a',lineage:'synthetic',text:'Service report'},{id:'hidden',lineage:'synthetic',text:hidden}],bindings:[]}));
 const config={version:VERSION,contractText:d.contractText,contractPin:d.pin,sourceIds:['a'],connection:{id:'my-model',label:'Fixture model',protocol:'ollama-chat-json',endpoint:'http://127.0.0.1:'+server.address().port+'/api/chat',model:'user/own',authMode:'bearer',credentialEnv:'SUTRA_LOCAL_SEMANTIC_TEST'},maxOutputTokens:512,timeoutMs:5000};
 return {config,requests,echo:()=>{echo=true;}};
}
test('native local transport requires exact approval, sends only selected source, imports untrusted model proposal and refuses escaped credential echo',async t=>{
 const {config,requests,echo}=await fixture(t),p=await run(config);assert.equal(p.code,0,p.stderr);assert.equal(requests.length,0);assert.ok(!p.stdout.includes(hidden));
 const pin=JSON.parse(p.stdout).planPin,args=['--execute-local','--approve-local-disclosure','--approve-plan',pin];
 assert.equal((await run({...config,sourceIds:['hidden']},args,{SUTRA_LOCAL_SEMANTIC_TEST:secret})).code,1);assert.equal(requests.length,0);
 assert.equal((await run(config,args,{SUTRA_LOCAL_SEMANTIC_TEST:''})).code,1);assert.equal(requests.length,0);
 const result=await run(config,args,{SUTRA_LOCAL_SEMANTIC_TEST:secret});assert.equal(result.code,0,result.stderr);assert.equal(requests.length,1);assert.equal(requests[0].headers.authorization,'Bearer '+secret);assert.ok(!requests[0].body.includes(hidden));assert.ok(!requests[0].body.includes(secret));assert.equal(JSON.parse(result.stdout).disposition,'ABSTAIN');assert.equal(JSON.parse(result.stderr).authority,'NONE');
 echo();const bad=await run(config,args,{SUTRA_LOCAL_SEMANTIC_TEST:secret});assert.equal(bad.code,1);assert.equal(bad.stdout,'');assert.ok(!bad.stderr.includes(secret));assert.equal(requests.length,2);
 await assert.rejects(admitLocalSemanticConfig(JSON.stringify({...config,connection:{...config.connection,endpoint:'https://example.com/api/chat'}})));
});

test('local model plan accepts only explicitly selected dialogue and refuses stale conversation pins',async t=>{const {config,requests}=await fixture(t);const {casePin}=await import('../pinned-investigation.js');const question=JSON.parse(config.contractText).question.text,conversationText=JSON.stringify({version:'sutra-semantic-conversation/v1',turns:[{id:'t1',role:'user',text:'Focus on service A.',updates:[{facet:'entity',action:'replace',anchors:[{start:9,end:18,quote:'service A'}]}]},{id:'t2',role:'assistant',text:'Private prior turn',updates:[]},{id:'t3',role:'user',text:question,updates:[]}]}),conversation={conversationText,conversationPin:await casePin(conversationText),selectedTurnIds:['t1']};const p=await run({...config,conversation});assert.equal(p.code,0,p.stderr);assert.ok(p.stdout.includes('Focus on service A.'));assert.ok(!p.stdout.includes('Private prior turn'));assert.equal(requests.length,0);const stale=await run({...config,conversation:{...conversation,conversationPin:'sha256:'+'0'.repeat(64)}});assert.equal(stale.code,1);assert.equal(requests.length,0);});
