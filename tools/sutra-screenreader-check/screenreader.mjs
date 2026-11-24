import {createHash} from 'node:crypto';
const SHA=/^[a-f0-9]{40}$/i,ID=/^A\d{2}$/,ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/,STATUS=new Set(['pass','fail','not_applicable','untested']);
const AT=new Set(['voiceover-ios','voiceover-macos','talkback-android','nvda-firefox','nvda-chromium','jaws-chromium']);
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys)=>plain(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':plain(v)?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const hash=v=>createHash('sha256').update(canonical(v)).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const checkKeys=['landmarksHeadings','controlNames','journeyNavigation','transcriptSearch','cueSeekFeedback','comparisonStateAnnouncement','writtenSourceIntegrityFeedback','consentDialogContext','consentFocusReturn','reviewPreviewContext','reviewSaveFeedback','errorAndDeniedStates','languageSwitchContext'];

export function validateAssistiveTechRecord(input){
 const top=['schema','recordId','humanAttested','attestation','assistiveTech','assistiveTechVersion','platform','browser','browserVersion','sourceRevision','observedAt','checks','notes'];
 if(!exact(input,top)||input.schema!==1||!ID.test(input.recordId)||input.humanAttested!==true||
  input.attestation!=='A human observer completed this record while operating the stated screen reader with SUTRA; automated accessibility output alone was not used as acceptance evidence.'||
  !AT.has(input.assistiveTech)||typeof input.assistiveTechVersion!=='string'||!input.assistiveTechVersion.trim()||input.assistiveTechVersion.length>100||
  typeof input.platform!=='string'||!input.platform.trim()||input.platform.length>100||typeof input.browser!=='string'||!input.browser.trim()||input.browser.length>100||
  typeof input.browserVersion!=='string'||!input.browserVersion.trim()||input.browserVersion.length>100||!SHA.test(input.sourceRevision)||!ISO.test(input.observedAt)||!Number.isFinite(Date.parse(input.observedAt))||
  typeof input.notes!=='string'||input.notes.length>1500||!exact(input.checks,checkKeys))throw Error('Invalid assistive-technology record.');
 const checks={};for(const key of checkKeys){
  const row=input.checks[key];if(!exact(row,['status','detail'])||!STATUS.has(row.status)||typeof row.detail!=='string'||row.detail.length>600||
   ((row.status==='fail'||row.status==='not_applicable')&&!row.detail.trim()))throw Error('Invalid screen-reader check: '+key);
  checks[key]={...row};
 }
 const core=['landmarksHeadings','controlNames','journeyNavigation','transcriptSearch','cueSeekFeedback','comparisonStateAnnouncement','consentDialogContext','consentFocusReturn','reviewPreviewContext','reviewSaveFeedback','errorAndDeniedStates'];
 const blockers=core.filter(key=>checks[key].status!=='pass');
 const failures=checkKeys.filter(key=>checks[key].status==='fail'),untested=checkKeys.filter(key=>checks[key].status==='untested'),notApplicable=checkKeys.filter(key=>checks[key].status==='not_applicable');
 const normalized={schema:1,recordId:input.recordId,assistiveTech:input.assistiveTech,assistiveTechVersion:input.assistiveTechVersion,platform:input.platform,browser:input.browser,browserVersion:input.browserVersion,sourceRevision:input.sourceRevision,observedAt:input.observedAt,checks,notes:input.notes};
 return freeze({...normalized,recordHash:hash(normalized),acceptanceResult:blockers.length?'fail':'pass',blockers,failures,untested,notApplicable,
  limitation:'This validator checks completeness and keeps failures visible. It cannot prove the observer used the stated assistive technology, the attestation is truthful, or the task was performed without coaching.'});
}
