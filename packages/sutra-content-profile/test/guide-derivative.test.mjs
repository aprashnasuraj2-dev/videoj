import test from 'node:test';
import assert from 'node:assert/strict';
import {renderReviewedGuideDerivative,assertReviewedGuideDerivative} from '../guide-derivative.js';
const inputSha='a'.repeat(64),anchor='claim';
const claim={title:'A & B <guide>',scope:'scope',claimKey:'claim',provenance:'Reviewed input, not factual verification',dateBasis:'Review date',excerpt:'नेपाल <tag> & "quoted" wording.'};
test('canonical guide derivative escapes text, binds metadata and retains unverified original digest',()=>{
 const text=renderReviewedGuideDerivative(claim,anchor,inputSha);
 assert.match(text,/नेपाल &lt;tag&gt; &amp; &quot;quoted&quot; wording\./);
 assert.deepEqual(assertReviewedGuideDerivative(text,claim,anchor),{inputSha256:inputSha,truthStatus:'unverified'});
 for(const changed of [text.replace('<body>','<body hidden>'),text.replace('<html lang="en">','<html lang="en" class="hidden">'),text.replace('Review date','Other date'),text.replace('default-src','script-src'),text.replace('Reviewed excerpt','Unreviewed excerpt'),text.replace('</body>','<script>0</script></body>'),'\ufeff'+text,text+' ']){
  assert.throws(()=>assertReviewedGuideDerivative(changed,claim,anchor),/GUIDE_DERIVATIVE_MISMATCH/);
 }
 assert.throws(()=>assertReviewedGuideDerivative(text,{...claim,excerpt:'Other wording'},anchor),/MISMATCH/);
 assert.throws(()=>assertReviewedGuideDerivative(text,claim,'other'),/MISMATCH/);
});
test('canonical derivative rejects ordinary accessor metadata without execution',()=>{
 let touched=0;const bad={...claim};Object.defineProperty(bad,'excerpt',{get(){touched++;return claim.excerpt;}});
 assert.throws(()=>renderReviewedGuideDerivative(bad,anchor,inputSha));assert.equal(touched,0);
 assert.throws(()=>renderReviewedGuideDerivative(claim,'#claim',inputSha));
 assert.throws(()=>renderReviewedGuideDerivative(claim,anchor,'not a digest'));
});
