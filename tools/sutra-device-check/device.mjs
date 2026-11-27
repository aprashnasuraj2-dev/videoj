import {createHash} from 'node:crypto';
const SHA40=/^[a-f0-9]{40}$/i,SHA256=/^[a-f0-9]{64}$/,ID=/^D\d{2}$/,ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const STATUS=new Set(['pass','fail','unsupported','untested']),PLATFORM=new Set(['ios','android']);
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys)=>plain(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':plain(v)?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const sha=v=>createHash('sha256').update(canonical(v)).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};

const checkKeys=['pageLoad','directLookup','mediaDecode','playPause','nativeSeek','captions','fullscreen','consentDeny','reviewPreviewSave','reviewExport','narrowScroll','touchTargets','errorRecovery'];

export function validatePhysicalDeviceRecord(input){
 const top=['schema','deviceId','physicalAttested','attestation','platform','osVersion','browser','browserVersion','sourceRevision','mediaHash','observedAt','checks','notes'];
 if(!exact(input,top)||input.schema!==1||!ID.test(input.deviceId)||input.physicalAttested!==true||
  input.attestation!=='This record was observed on a physical touch device, not an emulator or desktop-engine approximation.'||
  !PLATFORM.has(input.platform)||typeof input.osVersion!=='string'||!input.osVersion.trim()||input.osVersion.length>100||
  typeof input.browser!=='string'||!input.browser.trim()||input.browser.length>100||typeof input.browserVersion!=='string'||!input.browserVersion.trim()||input.browserVersion.length>100||
  !SHA40.test(input.sourceRevision)||!SHA256.test(input.mediaHash)||!ISO.test(input.observedAt)||!Number.isFinite(Date.parse(input.observedAt))||
  typeof input.notes!=='string'||input.notes.length>1500||!exact(input.checks,checkKeys))throw Error('Invalid physical-device record.');
 const checks={};
 for(const key of checkKeys){
  const row=input.checks[key];
  if(!exact(row,['status','detail'])||!STATUS.has(row.status)||typeof row.detail!=='string'||row.detail.length>500||
   ((row.status==='fail'||row.status==='unsupported')&&!row.detail.trim()))throw Error('Invalid check row: '+key);
  checks[key]={...row};
 }
 const core=['pageLoad','directLookup','mediaDecode','playPause','nativeSeek','captions','consentDeny','reviewPreviewSave','narrowScroll','touchTargets','errorRecovery'];
 const coreFailures=core.filter(key=>checks[key].status!=='pass');
 const untested=checkKeys.filter(key=>checks[key].status==='untested'),unsupported=checkKeys.filter(key=>checks[key].status==='unsupported'),failures=checkKeys.filter(key=>checks[key].status==='fail');
 const normalized={schema:1,deviceId:input.deviceId,platform:input.platform,osVersion:input.osVersion,browser:input.browser,browserVersion:input.browserVersion,
  sourceRevision:input.sourceRevision,mediaHash:input.mediaHash,observedAt:input.observedAt,checks,notes:input.notes};
 return freeze({...normalized,recordHash:sha(normalized),
  coreTouchResult:coreFailures.length?'fail':'pass',coreFailures,failures,unsupported,untested,
  limitation:'The validator checks record completeness and arithmetic only. It cannot prove the device was physical, the attestation is truthful, or the observer executed the checks correctly.'});
}
