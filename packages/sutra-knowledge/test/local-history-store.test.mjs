import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {livingFixture} from '../examples/living-investigation.mjs';
import {createInvestigationHistory} from '../investigation-history.js';
import {openLocalHistoryStore} from '../local-history-store.mjs';
async function setup(t){
 const dir=await mkdtemp(join(tmpdir(),'sutra-history-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const root=await livingFixture(),a=await livingFixture('finance',{revised:true,previousDigest:root.digest}),b=await livingFixture('finance',{withdraw:true,previousDigest:root.digest});
 const make=async v=>{const h=await createInvestigationHistory(root.versionText,root.digest),s=h.snapshot();return {root:s,child:await h.append({expectedHistoryPin:s.digest,branch:'main',expectedHead:root.digest,versionText:v.versionText,versionPin:v.digest})};};
 return {dir,a:await make(a),b:await make(b)};
}
test('real private filesystem CAS, reopen, and independent retained pin refuse rollback',async t=>{
 const {dir,a,b}=await setup(t),x=await openLocalHistoryStore(dir),y=await openLocalHistoryStore(dir);
 await x.initialize(a.root.historyText,a.root.digest);
 const request=s=>({expectedHead:a.root.digest,nextText:s.historyText,nextPin:s.digest});
 const results=await Promise.allSettled([x.append(request(a.child)),y.append(request(b.child))]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const win=results.find(r=>r.status==='fulfilled').value;
 const reopened=await openLocalHistoryStore(dir);assert.equal((await reopened.read(win.digest)).historyText,win.historyText);
 await assert.rejects(reopened.read(a.root.digest),/HISTORY_STORE_STALE_OR_ROLLED_BACK_HEAD/);
 await writeFile(join(dir,'HEAD'),a.root.digest+'\n');await assert.rejects(reopened.read(win.digest),/HISTORY_STORE_STALE_OR_ROLLED_BACK_HEAD/);
 // A stale caller pin paired with coordinated rollback still passes: no external freshness.
 assert.equal((await reopened.read(a.root.digest)).digest,a.root.digest);
});
test('orphan immutable snapshot is reusable; crashed writer lock fails closed; malformed snapshot refused',async t=>{
 const {dir,a}=await setup(t),s=await openLocalHistoryStore(dir);await s.initialize(a.root.historyText,a.root.digest);
 const snap=join(dir,'history-'+a.child.digest.slice(7)+'.json');await writeFile(snap,a.child.historyText,{mode:0o600});
 await writeFile(join(dir,'WRITE.lock'),'crashed',{mode:0o600});
 const args={expectedHead:a.root.digest,nextText:a.child.historyText,nextPin:a.child.digest};
 await assert.rejects(s.append(args),/HISTORY_STORE_BUSY_OR_CRASHED_LOCK/);assert.equal((await s.read(a.root.digest)).digest,a.root.digest);
 await rm(join(dir,'WRITE.lock'));const next=await s.append(args);assert.equal(next.digest,a.child.digest);
 await writeFile(snap,(await readFile(snap,'utf8'))+' ');await assert.rejects(s.read(next.digest),/HISTORY_PIN/);
});
test('shared directory is refused',async t=>{const dir=await mkdtemp(join(tmpdir(),'sutra-history-'));t.after(()=>rm(dir,{recursive:true,force:true}));await chmod(dir,0o755);await assert.rejects(openLocalHistoryStore(dir),/HISTORY_STORE_PRIVATE_DIRECTORY/);});

// Each writer owns its own process and module state. No shared JS mutex.
function subprocessAppend(dir,args){
 const moduleUrl=new URL('../local-history-store.mjs',import.meta.url).href;
 const code="import {openLocalHistoryStore} from "+JSON.stringify(moduleUrl)+";\nlet input='';for await(const c of process.stdin)input+=c;\ntry{const store=await openLocalHistoryStore(process.argv[1]);const result=await store.append(JSON.parse(input));process.stdout.write(JSON.stringify({ok:true,digest:result.digest}));}catch(e){process.stdout.write(JSON.stringify({ok:false,code:e.message}));}";
 return new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',code,dir],{stdio:['pipe','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);child.on('error',reject);child.on('close',code=>{try{assert.equal(code,0,stderr);resolve(JSON.parse(stdout));}catch(e){reject(e);}});child.stdin.end(JSON.stringify(args));});
}
test('separate OS processes cannot both publish different descendants of the same durable head',async t=>{
 const {dir,a,b}=await setup(t),store=await openLocalHistoryStore(dir);await store.initialize(a.root.historyText,a.root.digest);
 const request=s=>({expectedHead:a.root.digest,nextText:s.historyText,nextPin:s.digest});
 const results=await Promise.all([subprocessAppend(dir,request(a.child)),subprocessAppend(dir,request(b.child))]);
 assert.equal(results.filter(r=>r.ok).length,1);const winner=results.find(r=>r.ok),loser=results.find(r=>!r.ok);
 assert.match(loser.code,/HISTORY_STORE_(BUSY_OR_CRASHED_LOCK|STALE_OR_ROLLED_BACK_HEAD)/);
 assert.ok([a.child.digest,b.child.digest].includes(winner.digest));assert.equal((await store.read(winner.digest)).digest,winner.digest);
 const retry=await subprocessAppend(dir,request(winner.digest===a.child.digest?b.child:a.child));assert.equal(retry.ok,false);assert.match(retry.code,/HISTORY_STORE_STALE_OR_ROLLED_BACK_HEAD/);
});

test('partial staging artifact cannot poison immutable final name; preexisting conflicting final refuses',async t=>{
 const {dir,a}=await setup(t),s=await openLocalHistoryStore(dir);await s.initialize(a.root.historyText,a.root.digest);
 const staged=join(dir,'SNAPSHOT.tmp-interrupted'),final=join(dir,'history-'+a.child.digest.slice(7)+'.json');
 await writeFile(staged,'partial',{mode:0o600});await writeFile(final,'corrupt',{mode:0o600});
 const args={expectedHead:a.root.digest,nextText:a.child.historyText,nextPin:a.child.digest};
 await assert.rejects(s.append(args),/HISTORY_STORE_SNAPSHOT_CONFLICT/);assert.equal((await s.read(a.root.digest)).digest,a.root.digest);assert.equal(await readFile(final,'utf8'),'corrupt');
 // Deliberate offline operator correction, not automated destructive recovery.
 await rm(final);const next=await s.append(args);assert.equal(next.digest,a.child.digest);assert.equal(await readFile(final,'utf8'),a.child.historyText);assert.equal(await readFile(staged,'utf8'),'partial');
});

// Inject a genuine child-process death at the production filesystem call, not
// a callback that throws and allows finally blocks to clean up. Only test code
// patches Node built-in exports; the store has no fault-injection backdoor.
function crashAppend(dir,args,phase){
 const moduleUrl=new URL('../local-history-store.mjs',import.meta.url).href;
 const code=`import fs from 'node:fs/promises';import {syncBuiltinESMExports} from 'node:module';
 const phase=process.argv[2],realLink=fs.link,realRename=fs.rename;
 const die=()=>{process.kill(process.pid,'SIGKILL');};
 fs.link=async(a,b)=>{if(phase==='before_link'&&String(b).includes('/history-'))die();return realLink(a,b);};
 fs.rename=async(a,b)=>{if(String(b).endsWith('/HEAD')&&phase==='before_head')die();const r=await realRename(a,b);if(String(b).endsWith('/HEAD')&&phase==='after_head')die();return r;};
 syncBuiltinESMExports();const {openLocalHistoryStore}=await import(${JSON.stringify(moduleUrl)});let input='';for await(const c of process.stdin)input+=c;const s=await openLocalHistoryStore(process.argv[1]);await s.append(JSON.parse(input));process.exitCode=3;`;
 return new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',code,dir,phase],{stdio:['pipe','ignore','pipe']});let stderr='';child.stderr.on('data',d=>stderr+=d);child.on('error',reject);child.on('close',(code,signal)=>{try{assert.equal(signal,'SIGKILL',stderr+' code '+code);resolve();}catch(e){reject(e);}});child.stdin.end(JSON.stringify(args));});
}
for(const phase of ['before_link','before_head','after_head'])test('SIGKILL at '+phase+' preserves one exact published state and requires offline lock recovery',async t=>{
 const {dir,a}=await setup(t),s=await openLocalHistoryStore(dir);await s.initialize(a.root.historyText,a.root.digest);
 const args={expectedHead:a.root.digest,nextText:a.child.historyText,nextPin:a.child.digest};
 await crashAppend(dir,args,phase);
 const reopened=await openLocalHistoryStore(dir),published=phase==='after_head'?a.child:a.root,unpublished=phase==='after_head'?a.root:a.child;
 assert.equal((await reopened.read(published.digest)).historyText,published.historyText);await assert.rejects(reopened.read(unpublished.digest),/HISTORY_STORE_STALE_OR_ROLLED_BACK_HEAD/);
 await assert.rejects(reopened.append(args),/HISTORY_STORE_BUSY_OR_CRASHED_LOCK/);
 // The child has exited, no other writers exist in this test. Operator removes
 // the stale lock explicitly; the store never auto-steals a lock.
 await rm(join(dir,'WRITE.lock'));
 if(phase==='after_head')await assert.rejects(reopened.append(args),/HISTORY_STORE_STALE_OR_ROLLED_BACK_HEAD/);
 else assert.equal((await reopened.append(args)).digest,a.child.digest);
 assert.equal((await reopened.read(a.child.digest)).historyText,a.child.historyText);
});
