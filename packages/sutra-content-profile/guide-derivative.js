// Canonical reviewed written-guide derivative, shared by the pack compiler
// and browser verifier. It binds published bytes to declared text/metadata,
// not to the truth or independent provenance of the original source.
import {snapshotDataRecord} from '../sutra-evidence/index.js';
const html=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const safe=(v,n)=>typeof v==='string'&&v.trim()&&v.length<=n&&!/[\u0000-\u001f\u007f]/.test(v);
const digest=/^[a-f0-9]{64}$/;
export function renderReviewedGuideDerivative(claim,anchor,inputSha){
 const fields=snapshotDataRecord(claim,20);
 if(typeof anchor!=='string'||!/^[A-Za-z0-9._:-]{1,128}$/.test(anchor)||typeof inputSha!=='string'||!digest.test(inputSha)||
  !safe(fields.title,120)||!safe(fields.scope,160)||!safe(fields.claimKey,128)||!safe(fields.provenance,240)||!safe(fields.dateBasis,120)||!safe(fields.excerpt,1200))throw Error('GUIDE_DERIVATIVE_METADATA');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html(fields.title)+'</title></head><body><main><h1>'+html(fields.title)+'</h1><p>Safe published excerpt generated from the reviewed written-guide input. It preserves the reviewed excerpt as text and does not publish executable source markup.</p><dl><dt>Scope</dt><dd>'+html(fields.scope)+'</dd><dt>Claim key</dt><dd>'+html(fields.claimKey)+'</dd><dt>Provenance</dt><dd>'+html(fields.provenance)+'</dd><dt>Date basis</dt><dd>'+html(fields.dateBasis)+'</dd><dt>Reviewed input SHA-256</dt><dd><code>'+html(inputSha)+'</code></dd></dl><section id="'+html(anchor)+'"><h2>Reviewed excerpt</h2><blockquote>'+html(fields.excerpt)+'</blockquote></section></main></body></html>\n';
}
export function assertReviewedGuideDerivative(text,claim,anchor){
 if(typeof text!=='string'||text.length>65536)throw Error('GUIDE_DERIVATIVE_BYTES');
 const marker=/<dt>Reviewed input SHA-256<\/dt><dd><code>([a-f0-9]{64})<\/code><\/dd>/g;
 const matches=[...text.matchAll(marker)];
 if(matches.length!==1||text!==renderReviewedGuideDerivative(claim,anchor,matches[0][1]))throw Error('GUIDE_DERIVATIVE_MISMATCH');
 // The recorded input digest is not an independent original-source check.
 return Object.freeze({inputSha256:matches[0][1],truthStatus:'unverified'});
}
