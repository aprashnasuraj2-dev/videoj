// Durable local snapshots. They carry no authority and cannot restart a remote operation.
import {mkdir,open,rename,unlink} from 'node:fs/promises';
import {resolve,join,dirname,basename} from 'node:path';
import {digest} from './research-session.js';
export async function createCheckpointWriter(directory){
 // Require a fresh operator-selected directory; no overwrite of a prior investigation.
 if(typeof directory!=='string'||!directory.trim())throw Error('CHECKPOINT_DIRECTORY');
 const dir=resolve(directory);await mkdir(dir,{mode:0o700});
 let last=-1,sessionId,active=false;
 return async snapshot=>{
  if(active||snapshot?.authority!=='NONE'||typeof snapshot.sessionId!=='string'||!Number.isSafeInteger(snapshot.sequence)||snapshot.sequence<last||sessionId&&snapshot.sessionId!==sessionId)throw Error('CHECKPOINT_STATE');
  active=true;sessionId=snapshot.sessionId;
  const payload=JSON.stringify(snapshot),envelope=JSON.stringify({schema:'sutra-checkpoint-envelope/v1',digest:digest(payload),payload})+'\n';
  const tmp=join(dir,'checkpoint.tmp'),target=join(dir,'checkpoint.json');let fd;
  try{
   fd=await open(tmp,'wx',0o600);await fd.writeFile(envelope,'utf8');await fd.sync();await fd.close();fd=undefined;
   await rename(tmp,target);
   // POSIX directory fsync makes the atomic rename durable on supporting filesystems.
   const d=await open(dir,'r');try{await d.sync();}finally{await d.close();}
   last=snapshot.sequence;return digest(payload);
  }finally{if(fd)await fd.close();await unlink(tmp).catch(()=>{});active=false;}
 };
}
export function inspectCheckpoint(text,expectedDigest){
 const e=JSON.parse(text);
 if(e?.schema!=='sutra-checkpoint-envelope/v1'||typeof e.payload!=='string'||e.digest!==expectedDigest||digest(e.payload)!==expectedDigest)throw Error('CHECKPOINT_DIGEST');
 const p=JSON.parse(e.payload);
 if(p?.schema!=='sutra-autonomous-research-checkpoint/v1'||p.authority!=='NONE')throw Error('CHECKPOINT_STATE');
 return Object.freeze({checkpoint:p,authority:'NONE',canAutomaticallyResume:false,eligibleForFreshApproval:p.state==='paused'&&p.pending===null});
}

// Local operator lease: prevent two processes continuing the same retained file.
// Copies in other directories are not globally fenced; hosted deployments need a durable DB CAS.
export async function consumeCheckpointFile(file,expectedDigest){
 if(typeof file!=='string'||!file.trim()||typeof expectedDigest!=='string'||!/^sha256:[0-9a-f]{64}$/.test(expectedDigest))throw Error('RESUME_PIN');
 const source=resolve(file),dir=dirname(source),marker=join(dir,'.'+basename(source)+'.'+expectedDigest.slice(7)+'.consumed');
 const fd=await open(marker,'wx',0o600);
 try{await fd.writeFile(expectedDigest+'\n','utf8');await fd.sync();}finally{await fd.close();}
 const d=await open(dir,'r');try{await d.sync();}finally{await d.close();}
 return Object.freeze({kind:'sutra-local-checkpoint-consumed/v1'});
}
