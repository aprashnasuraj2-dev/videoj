// Node/POSIX caller-owned history store. Trusted private local directory only.
// Immutable snapshots, an exclusive writer lock and atomic HEAD publication.
// A crashed writer may leave a lock; do not automatically steal it.
import {constants} from 'node:fs';
import {open,lstat,rename,unlink,link,mkdir,statfs} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {replayInvestigationHistory} from './investigation-history.js';
import {verifyHistoryExtension} from './history-extension.js';
export const MAX_HISTORY_BYTES=262144;
const MAX=MAX_HISTORY_BYTES,PIN=/^sha256:[a-f0-9]{64}$/;
const FLOCK_MARKER='sutra-history-kernel-flock/v1\n',FLOCK='/usr/bin/flock';
const fail=c=>{throw TypeError('HISTORY_STORE_'+c);};
const SUPPORTED_FILESYSTEMS=new Map([[0xef53n,'EXT2_3_4']]);
const REMOTE_FILESYSTEMS=new Map([
 [0x6969n,'NFS'],[0xff534d42n,'CIFS'],[0xfe534d42n,'SMB2'],[0x517bn,'SMB'],
 [0x01021997n,'9P'],[0x5346414fn,'AFS'],[0x73757245n,'CODA'],[0x00c36400n,'CEPH'],[0x564cn,'NCP']
]);
export const HISTORY_STORE_PROFILE=Object.freeze({
 version:1,platform:'linux',directory:'private EXT2/3/4 filesystem (magic 0xef53)',crossFilesystemPortability:'NOT_CLAIMED',
 supportedFilesystemTypes:Object.freeze([...SUPPORTED_FILESYSTEMS.values()]),knownRemoteFilesystemsRefused:Object.freeze([...REMOTE_FILESYSTEMS.values()])
});
export const historyStorePlatformSupported=platform=>platform==='linux';
export function classifyHistoryFilesystemType(type){
 let value;try{value=BigInt(type)&0xffffffffn;}catch{fail('FILESYSTEM_TYPE');}
 const remote=REMOTE_FILESYSTEMS.has(value),supported=SUPPORTED_FILESYSTEMS.has(value);
 const name=REMOTE_FILESYSTEMS.get(value)??SUPPORTED_FILESYSTEMS.get(value)??'UNSUPPORTED_UNCLASSIFIED';
 return Object.freeze({typeHex:'0x'+value.toString(16),name,remote,supported,portableAcrossFilesystems:false});
}
export function assertHistoryFilesystemType(type){
 const profile=classifyHistoryFilesystemType(type);
 if(profile.remote)fail('UNSUPPORTED_FILESYSTEM_'+profile.name);
 if(!profile.supported)fail('UNSUPPORTED_FILESYSTEM_'+profile.typeHex);
 return profile;
}
export async function inspectHistoryFilesystem(directory){
 if(!historyStorePlatformSupported(process.platform)||typeof directory!=='string'||!directory)fail('PLATFORM_OR_PATH');
 const info=await statfs(resolve(directory));return assertHistoryFilesystemType(info.type);
}
const checked=p=>{if(typeof p!=='string'||!PIN.test(p))fail('PIN');return p;};
const absent=e=>e?.code==='ENOENT';
async function boundedRead(path,cap){
 const f=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{
  const s=await f.stat();if(!s.isFile()||s.size<1||s.size>cap)fail('SIZE');
  const b=Buffer.alloc(cap+1);let n=0;
  while(n<b.length){const r=await f.read(b,n,b.length-n,null);if(!r.bytesRead)break;n+=r.bytesRead;}
  if(n!==s.size||n>cap)fail('SIZE');
  return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b.subarray(0,n));
 }finally{await f.close();}
}
async function durableNew(path,text){
 const f=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 try{await f.writeFile(text,'utf8');await f.sync();}finally{await f.close();}
}
export async function openLocalHistoryStore(directory,{lockMode='exclusive-create'}={}){
 if(!['exclusive-create','kernel-flock'].includes(lockMode))fail('LOCK_MODE');
 if(!historyStorePlatformSupported(process.platform)||typeof directory!=='string'||!directory)fail('PLATFORM_OR_PATH');
 const dir=resolve(directory),s=await lstat(dir);
 if(!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o077)!==0)fail('PRIVATE_DIRECTORY');
 await inspectHistoryFilesystem(dir);
 const headPath=join(dir,'HEAD'),lockPath=join(dir,'WRITE.lock');
 if(lockMode==='kernel-flock'){
  try{if(await boundedRead(lockPath,128)!==FLOCK_MARKER)fail('FLOCK_MARKER');}
  catch(e){if(absent(e))fail('FLOCK_MARKER');throw e;}
 }
 const snapshotPath=p=>join(dir,'history-'+checked(p).slice(7)+'.json');
 async function syncDirectory(){const f=await open(dir,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{await f.sync();}finally{await f.close();}}
 async function readHead(){
  try{const t=await boundedRead(headPath,72);if(!t.endsWith('\n'))fail('HEAD');return checked(t.slice(0,-1));}
  catch(e){if(absent(e))return null;throw e;}
 }
 async function load(pin){
  const historyText=await boundedRead(snapshotPath(pin),MAX);
  const view=await replayInvestigationHistory(historyText,pin);
  return Object.freeze({historyText,digest:pin,view});
 }
 async function publish(pin,text){
  // Never write directly to the content-addressed final name: interruption
  // during a write must not poison the immutable namespace with partial bytes.
  if(Buffer.byteLength(text,'utf8')>MAX)fail('SIZE');
  const final=snapshotPath(pin),staged=join(dir,'SNAPSHOT.tmp-'+randomUUID());
  try{
   await durableNew(staged,text);
   try{await link(staged,final);}catch(e){if(e?.code!=='EEXIST')throw e;if(await boundedRead(final,MAX)!==text)fail('SNAPSHOT_CONFLICT');}
   // An existing exact orphan may have been written by an older store version.
   // Flush its inode before a new HEAD can point to it.
   const f=await open(final,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);try{await f.sync();}finally{await f.close();}
  }finally{try{await unlink(staged);}catch(e){if(!absent(e))throw e;}}
  // Directory barrier before HEAD can reference the immutable file.
  await syncDirectory();
  const temp=join(dir,'HEAD.tmp-'+randomUUID());
  try{await durableNew(temp,pin+'\n');await rename(temp,headPath);await syncDirectory();}
  finally{try{await unlink(temp);}catch(e){if(!absent(e))throw e;}}
 }
 async function locked(fn){
  if(lockMode==='kernel-flock'){
   // Stable inode for this explicit store profile. Never unlink or replace it.
   // Linux locks the open file description, shared with the inherited child fd.
   const f=await open(lockPath,constants.O_RDWR|constants.O_NOFOLLOW|constants.O_NONBLOCK);
   try{
    const stat=await f.stat();if(!stat.isFile()||(stat.mode&0o077)!==0||stat.size!==Buffer.byteLength(FLOCK_MARKER))fail('FLOCK_MARKER');
    if(await f.readFile('utf8')!==FLOCK_MARKER)fail('FLOCK_MARKER');
    const p=spawnSync(FLOCK,['-x','-n','-E','75','3'],{stdio:['ignore','ignore','ignore',f.fd],timeout:5000});
    if(p.status===75)fail('BUSY_OR_CRASHED_LOCK');if(p.status!==0||p.error||p.signal)fail('FLOCK_HELPER');
    return await fn();
   }finally{await f.close();}
  }
  let f;
  try{f=await open(lockPath,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);}
  catch(e){if(e?.code==='EEXIST')fail('BUSY_OR_CRASHED_LOCK');throw e;}
  try{return await fn();}finally{await f.close();await unlink(lockPath);await syncDirectory();}
 }
 return Object.freeze({
  // An independently retained pin is mandatory; never bless a new HEAD merely
  // because the files agree. A read racing publication sees one immutable state.
  async read(expectedPin){checked(expectedPin);const actual=await readHead();if(actual!==expectedPin)fail('STALE_OR_ROLLED_BACK_HEAD');return load(actual);},
  async initialize(historyText,historyPin){checked(historyPin);return locked(async()=>{
   if(await readHead()!==null)fail('ALREADY_INITIALIZED');
   await replayInvestigationHistory(historyText,historyPin);await publish(historyPin,historyText);return load(historyPin);
  });},
  async append({expectedHead,nextText,nextPin}={}){checked(expectedHead);checked(nextPin);return locked(async()=>{
   if(await readHead()!==expectedHead)fail('STALE_OR_ROLLED_BACK_HEAD');
   const before=await load(expectedHead);
   const extension=await verifyHistoryExtension({previousText:before.historyText,previousPin:expectedHead,nextText,nextPin});
   if(extension.status==='UNCHANGED')return before;
   await publish(nextPin,nextText);return load(nextPin);
  });}
 });
}

// Explicit fresh-directory creation only. Do not migrate an existing legacy
// store or silently interpret its empty O_EXCL lock as a kernel lock marker.
// A failed creation may leave an incomplete private directory for operator
// inspection; no recursive deletion or automatic fallback.
export async function createFlockedHistoryStore(directory){
 if(!historyStorePlatformSupported(process.platform)||typeof directory!=='string'||!directory)fail('PLATFORM_OR_PATH');
 const dir=resolve(directory);await mkdir(dir,{mode:0o700});
 await inspectHistoryFilesystem(dir);
 await durableNew(join(dir,'WRITE.lock'),FLOCK_MARKER);
 const f=await open(dir,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{await f.sync();}finally{await f.close();}
 // Parent-directory durability matters for newly created store directory.
 const parent=await open(resolve(dir,'..'),constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{await parent.sync();}finally{await parent.close();}
 return openLocalHistoryStore(dir,{lockMode:'kernel-flock'});
}
