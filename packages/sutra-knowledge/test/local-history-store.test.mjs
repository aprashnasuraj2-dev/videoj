import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
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
