export {PROFILE_ID,ANNOTATION_CONTEXT,MEDIA_FRAGMENTS,parseMediaFragment,cueHref,validateAnnotationProfile,validateIntegrityManifest,sha256Integrity,verifyIntegrity,parseWebVtt,validateEvidenceBytes} from './annotation.js';
export {cueLinkData,mountCueLink} from './cue-link.js';

// Legacy SUTRA receipt v1 compatibility follows. New integrations should use
// the Web Annotation media-evidence profile exported above.
/** Shape and source-reference checks only. This does not verify semantic truth or publisher trust. */
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const keys = ['version', 'sourceId', 'sourceHash', 'sourceVersion', 'mediaHash', 'cueId', 'start', 'end', 'excerpt', 'retrievedAt', 'verification'];
const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
function validDate(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) return false;
  const year = Number(value.slice(0,4)), month = Number(value.slice(5,7)), day = Number(value.slice(8,10));
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year,month,0)).getUTCDate()
    && Number(value.slice(11,13)) < 24 && Number(value.slice(14,16)) < 60 && Number(value.slice(17,19)) < 60
    && Number.isFinite(Date.parse(value));
}
/** sources is an independently supplied expected-content catalog, never taken from the receipt itself. */
export function validateReceipt(receipt, { sources } = {}) {
  const errors = [];
  const fail = (code, path) => errors.push({ code, path }); // Do not echo untrusted/private values.
  if (!isObject(receipt)) return {valid:false, level:'invalid', errors:[{code:'RECEIPT_TYPE',path:''}]};
  for (const key of keys) if (!Object.hasOwn(receipt,key)) fail('REQUIRED',key);
  for (const key of Object.keys(receipt)) if (!keys.includes(key)) fail('UNKNOWN_FIELD',key);
  if (receipt.version !== 1) fail('VERSION','version');
  for (const key of ['sourceId','cueId']) if (typeof receipt[key] !== 'string' || !ID.test(receipt[key])) fail('IDENTIFIER',key);
  if (typeof receipt.sourceVersion !== 'string' || !receipt.sourceVersion.trim() || receipt.sourceVersion.length > 128) fail('SOURCE_VERSION','sourceVersion');
  if (typeof receipt.mediaHash !== 'string' || !HASH.test(receipt.mediaHash)) fail('HASH','mediaHash');
  if (typeof receipt.sourceHash !== 'string' || !HASH.test(receipt.sourceHash)) fail('HASH','sourceHash');
  if (!Number.isFinite(receipt.start) || receipt.start < 0) fail('INTERVAL','start');
  if (!Number.isFinite(receipt.end) || receipt.end <= receipt.start) fail('INTERVAL','end');
  if (typeof receipt.excerpt !== 'string' || !receipt.excerpt.trim() || receipt.excerpt.length > 4000) fail('EXCERPT','excerpt');
  if (!validDate(receipt.retrievedAt)) fail('DATE','retrievedAt');
  // A receipt cannot self-assert verification. The return value provides the actually observed level.
  if (receipt.verification !== 'unverified') fail('SELF_VERIFICATION','verification');
  if (errors.length) return {valid:false,level:'invalid',errors};
  if (sources === undefined) return {valid:true,level:'shape_only',errors:[]};
  if (!Array.isArray(sources) || sources.length > 10000) {
    fail('CATALOG','sources'); return {valid:false,level:'invalid',errors};
  }
  const matches = sources.filter(s => isObject(s) && s.id === receipt.sourceId);
  if (matches.length !== 1) fail(matches.length ? 'AMBIGUOUS_SOURCE' : 'MISSING_SOURCE','sourceId');
  else {
    const source = matches[0];
    if (typeof source.hash !== 'string' || !HASH.test(source.hash) || !Number.isFinite(source.duration) || source.duration <= 0 || !Array.isArray(source.cues)) fail('CATALOG','sources');
    else {
      if (source.version !== receipt.sourceVersion) fail('VERSION_MISMATCH','sourceVersion');
      if (source.mediaHash !== receipt.mediaHash) fail('MEDIA_MISMATCH','mediaHash');
      if (source.hash !== receipt.sourceHash) fail('HASH_MISMATCH','sourceHash');
      if (receipt.end > source.duration) fail('OUTSIDE_MEDIA','end');
      const cues = source.cues.filter(c => isObject(c) && c.id === receipt.cueId);
      if (cues.length !== 1) fail(cues.length ? 'AMBIGUOUS_CUE' : 'MISSING_CUE','cueId');
      else {
        const cue = cues[0];
        if (!Number.isFinite(cue.start) || cue.start < 0 || !Number.isFinite(cue.end) || cue.end <= cue.start || cue.end > source.duration || typeof cue.text !== 'string') fail('CATALOG','sources');
        else {
          // Exact interval/text equality is intentional in v1; subquotes require an explicit future contract.
          if (cue.start !== receipt.start || cue.end !== receipt.end) fail('CUE_RANGE','start');
          if (cue.text !== receipt.excerpt) fail('QUOTE_MISMATCH','excerpt');
        }
      }
    }
  }
  return {valid:errors.length===0,level:errors.length ? 'invalid':'catalog_matched',errors};
}
