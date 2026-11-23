import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {spawnSync} from 'node:child_process';
import {PROFILE_ID,MEDIA_FRAGMENTS,parseMediaFragment,cueHref,validateAnnotationProfile,validateEvidenceBytes,sha256Integrity,verifyIntegrity} from '../annotation.js';
import {cueLinkData,mountCueLink} from '../cue-link.js';
const annotation=JSON.parse(fs.readFileSync(new URL('../examples/annotation.json',import.meta.url)));
const manifest=JSON.parse(fs.readFileSync(new URL('../examples/integrity-manifest.json',import.meta.url)));
const transcript=fs.readFileSync(new URL('../examples/transcript-v3.vtt',import.meta.url));
const copy=value=>structuredClone(value);
test('profile is W3C Web Annotation shaped and derives a standard media-fragment cue link',()=>{
 const result=validateAnnotationProfile(annotation,{manifest});assert.equal(result.valid,true);assert.equal(result.level,'manifest_bound');assert.equal(result.fragment.start,12);assert.equal(result.fragment.end,18);assert.equal(result.cueHref,'https://example.invalid/sutra/media/synthetic-timing.mp4#t=12,18');assert.equal(annotation.generator.id,PROFILE_ID);assert.equal(annotation.target.selector.conformsTo,MEDIA_FRAGMENTS);
});
test('media fragment parser accepts explicit finite half-open ranges only',()=>{
 assert.deepEqual(parseMediaFragment('t=0,0.5'),{start:0,end:.5});for(const value of ['t=12','t=,18','t=18,12','t=12,12','t=npt:12,18','12,18','t=-1,2'])assert.equal(parseMediaFragment(value),null);
});
test('transcript v3 SRI is recomputed from bytes and then cue id/range/text are checked',async()=>{
 const transcriptId=manifest.resources.find(x=>x.role==='transcript').id;
 assert.equal(await sha256Integrity(transcript),'sha256-LXH6Pb7F/vU/+NWp+gTG3PHFDE/dz3mEZNWHwAj6taY=');
 assert.equal(await verifyIntegrity(transcript,manifest.resources.find(x=>x.role==='transcript').integrity),true);
 const result=await validateEvidenceBytes(annotation,{manifest,resources:{[transcriptId]:transcript}});assert.equal(result.valid,true);assert.equal(result.level,'transcript_verified');assert.deepEqual(result.verifiedResources,['transcript']);
});
test('altered transcript bytes fail integrity before their text can be trusted',async()=>{
 const transcriptId=manifest.resources.find(x=>x.role==='transcript').id;const bad=Buffer.from(transcript.toString('utf8').replace('displayed','invented'));
 const result=await validateEvidenceBytes(annotation,{manifest,resources:{[transcriptId]:bad}});assert.equal(result.valid,false);assert.ok(result.errors.some(e=>e.code==='INTEGRITY_MISMATCH'));
});
test('invalid fragment, source mismatch and altered quotation fail separately',async()=>{
 const badFragment=copy(annotation);badFragment.target.selector.value='t=18,12';assert.ok(validateAnnotationProfile(badFragment,{manifest}).errors.some(e=>e.code==='FRAGMENT'));
 const badSource=copy(annotation);badSource.target.source.id='https://example.invalid/other.mp4';assert.ok(validateAnnotationProfile(badSource,{manifest}).errors.some(e=>e.code==='MEDIA_SOURCE_MISMATCH'));
 const badQuote=copy(annotation);badQuote.body.value='Invented quotation.';const transcriptId=manifest.resources.find(x=>x.role==='transcript').id;
 const quoteResult=await validateEvidenceBytes(badQuote,{manifest,resources:{[transcriptId]:transcript}});assert.ok(quoteResult.errors.some(e=>e.code==='QUOTE_MISMATCH'));
});
test('tiny cue-link helper is framework-free and DOM mount has no player dependency',()=>{
 const data=cueLinkData(annotation,{label:'Jump to cited moment'});assert.deepEqual(data,{href:'https://example.invalid/sutra/media/synthetic-timing.mp4#t=12,18',label:'Jump to cited moment'});
 const node={ownerDocument:{createElement(){return {dataset:{}};}},replaceChildren(child){this.child=child;}};const link=mountCueLink(node,annotation);assert.equal(link.href,data.href);assert.equal(link.dataset.sutraEvidenceCue,'true');assert.equal(node.child,link);
});
test('annotation CLI succeeds from an unrelated working directory',()=>{
 const result=spawnSync(process.execPath,[new URL('../annotation-cli.mjs',import.meta.url).pathname,new URL('../examples/annotation.json',import.meta.url).pathname,new URL('../examples/integrity-manifest.json',import.meta.url).pathname,new URL('../examples/transcript-v3.vtt',import.meta.url).pathname],{cwd:'/tmp',encoding:'utf8'});assert.equal(result.status,0,result.stderr);const out=JSON.parse(result.stdout);assert.equal(out.level,'transcript_verified');assert.equal(out.cueHref,'https://example.invalid/sutra/media/synthetic-timing.mp4#t=12,18');
});
test('annotation/manifest do not carry credential or truth-self-assertion fields',()=>{const serialized=JSON.stringify({annotation,manifest});for(const key of ['apiKey','authorization','privateContext','verifiedTruth'])assert.ok(!serialized.includes(key));});
