import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {HISTORY_STORE_PROFILE,historyStorePlatformSupported,classifyHistoryFilesystemType,assertHistoryFilesystemType,inspectHistoryFilesystem} from '../local-history-store.mjs';

test('history store profile is Linux-only and known network filesystems fail closed',()=>{
 assert.equal(HISTORY_STORE_PROFILE.platform,'linux');
 assert.equal(HISTORY_STORE_PROFILE.crossFilesystemPortability,'NOT_CLAIMED');
 assert.equal(historyStorePlatformSupported('linux'),true);
 for(const platform of ['win32','darwin','freebsd'])assert.equal(historyStorePlatformSupported(platform),false);
 for(const [magic,name] of [[0x6969,'NFS'],[0xff534d42,'CIFS'],[0xfe534d42,'SMB2'],[0x01021997,'9P']]){
  const profile=classifyHistoryFilesystemType(magic);assert.equal(profile.remote,true);assert.equal(profile.name,name);
  assert.throws(()=>assertHistoryFilesystemType(magic),new RegExp('HISTORY_STORE_UNSUPPORTED_FILESYSTEM_'+name));
 }
 const ext=assertHistoryFilesystemType(0xef53);assert.equal(ext.remote,false);assert.equal(ext.portableAcrossFilesystems,false);
});
test('actual CI filesystem is observed but does not create a portability claim',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'sutra-history-fs-profile-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const profile=await inspectHistoryFilesystem(dir);assert.equal(profile.remote,false);assert.equal(profile.portableAcrossFilesystems,false);
 console.log('SUTRA_HISTORY_FILESYSTEM_PROFILE '+JSON.stringify({platform:process.platform,...profile}));
});
