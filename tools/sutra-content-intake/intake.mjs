import {createHash} from 'node:crypto';
const SHA=/^[a-f0-9]{64}$/,ID=/^[A-Za-z][A-Za-z0-9._-]{0,79}$/,RIGHTS=new Set(['owned','licensed','written_permission']);
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys)=>plain(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const safePath=p=>typeof p==='string'&&p.length<=240&&!p.startsWith('/')&&!p.includes('\\')&&!p.split('/').some(x=>!x||x==='.'||x==='..'||x.startsWith('.'));
const reviewStatement='A competent human reviewer checked the transcript and written guide against the designated lesson media and recorded factual corrections before release.';

export function assessContentManifest(manifest,{observedFiles}={}){
 if(!exact(manifest,['schema','contentVersion','lesson','assets','rights','review'])||manifest.schema!==1||typeof manifest.contentVersion!=='string'||!ID.test(manifest.contentVersion))throw Error('Invalid content manifest.');
 if(!exact(manifest.lesson,['title','durationSeconds'])||typeof manifest.lesson.title!=='string'||!manifest.lesson.title.trim()||manifest.lesson.title.length>160||
  typeof manifest.lesson.durationSeconds!=='number'||!Number.isFinite(manifest.lesson.durationSeconds)||manifest.lesson.durationSeconds<=0||manifest.lesson.durationSeconds>3600)throw Error('Invalid lesson declaration.');
 if(!exact(manifest.assets,['media','transcript','guide'])||!plain(observedFiles))throw Error('Asset declarations and observed file metadata are required.');
 const limits={media:250*1024*1024,transcript:10*1024*1024,guide:10*1024*1024},assets={};
 for(const kind of Object.keys(limits)){
  const declared=manifest.assets[kind],observed=observedFiles[kind];
  if(!exact(declared,['path','sha256'])||!safePath(declared.path)||!SHA.test(declared.sha256)||!exact(observed,['path','sha256','bytes'])||
   observed.path!==declared.path||!SHA.test(observed.sha256)||!Number.isInteger(observed.bytes)||observed.bytes<1||observed.bytes>limits[kind])throw Error('Invalid '+kind+' asset metadata.');
  assets[kind]={path:declared.path,sha256:declared.sha256,bytes:observed.bytes,hashMatches:declared.sha256===observed.sha256};
 }
 if(!exact(manifest.rights,['media','transcript','guide']))throw Error('Rights declarations required.');
 const rights={};
 for(const kind of Object.keys(limits)){
  const row=manifest.rights[kind];
  if(!exact(row,['basis','evidenceRef','publicDistributionDeclared'])||!RIGHTS.has(row.basis)||typeof row.evidenceRef!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{3,199}$/.test(row.evidenceRef)||
    typeof row.publicDistributionDeclared!=='boolean')throw Error('Invalid '+kind+' rights declaration.');
  rights[kind]={...row};
 }
 const review=manifest.review;
 if(!exact(review,['status','reviewedAt','statement'])||!['pending','reviewed'].includes(review.status))throw Error('Invalid review declaration.');
 if(review.status==='pending'&&(review.reviewedAt!==null||review.statement!==null))throw Error('Pending review cannot claim completion fields.');
 if(review.status==='reviewed'&&(typeof review.reviewedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(review.reviewedAt)||!Number.isFinite(Date.parse(review.reviewedAt))||review.statement!==reviewStatement))throw Error('Reviewed declaration is incomplete.');
 const bytesMatch=Object.values(assets).every(a=>a.hashMatches),rightsDeclared=Object.values(rights).every(r=>r.publicDistributionDeclared===true),reviewDeclared=review.status==='reviewed';
 return freeze({schema:1,contentVersion:manifest.contentVersion,lesson:{...manifest.lesson},assets,rights,review:{...review},
  bytesMatch,rightsDeclared,reviewDeclared,structuralIntakeComplete:bytesMatch&&rightsDeclared&&reviewDeclared,
  limitation:'Byte hashes are verified against supplied file observations. Rights basis/public-distribution declarations and reviewer competence/truthfulness are human evidence and are not proven by this tool.'});
}

export const contentReviewStatement=reviewStatement;
