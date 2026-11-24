import test from 'node:test';import assert from 'node:assert/strict';import {loadContentProfile,receiptForFeatured,validateContentProfile} from '../index.js';
const profile={"schema":1,"mode":"synthetic","contentVersion":"synthetic-timing-v1","title":"Synthetic timing lesson fixture","observedAt":"2026-11-23T00:00:00Z","primarySourceId":"synthetic-timing-fixture","featuredCueId":"timing-marker","catalog":{"path":"./source-catalog.json","sha256":"a12d95aab97bbc047a2b88d73f4814072c48c3f2e55adeb0381a7b8d36c45333"},"transcript":{"path":"/transcripts/synthetic-timing.txt","sha256":"a1930687d25bfe7fe8f2483c55d1aca83cdc3f4dcc39424dd6569aea9fe9660d"},"media":{"video":"/media/timing-fixture.mp4","poster":"/media/timing-poster.svg","chapters":"/media/timing-chapters.vtt","captions":"/media/timing-captions.vtt"},"videoClaim":{"title":"Synthetic timing cue","scope":"synthetic_timing_only","claimKey":"marker_presence","value":"marker_present","provenance":"SUTRA synthetic timing catalog; not human-reviewed footage","dateBasis":"Fixture metadata date"},"guideClaim":null,"ui":{"noticeTitle":"Synthetic development content","noticeBody":"This content profile is a test fixture. It demonstrates source consistency and browser behavior, not factual training guidance."}};
const catalog={
  "schema": 1,
  "contentVersion": "synthetic-timing-v1",
  "sources": [
    {
      "id": "synthetic-timing-fixture",
      "version": "v1",
      "hash": "a1930687d25bfe7fe8f2483c55d1aca83cdc3f4dcc39424dd6569aea9fe9660d",
      "mediaHash": "cb0cdcb04039eb2bfc62a22462f0a040c1a23c2bdfd24f1403669569c2f22c5e",
      "duration": 8,
      "cues": [
        {
          "id": "timing-marker",
          "start": 2,
          "end": 4,
          "text": "Synthetic timing marker. This is not a training instruction."
        }
      ]
    }
  ]
};
const response=(data,url)=>new Response(typeof data==='string'?data:JSON.stringify(data),{headers:{'Content-Type':'application/json','Content-Length':String(typeof data==='string'?new TextEncoder().encode(data).length:new TextEncoder().encode(JSON.stringify(data)).length)}}); 
test('profile validates one exact primary source and produces an unverified featured receipt',()=>{
 const c=validateContentProfile(profile,catalog);assert.equal(c.source.id,'synthetic-timing-fixture');assert.equal(c.featuredCue.id,'timing-marker');
 const r=receiptForFeatured(c);assert.equal(r.sourceHash,c.source.hash);assert.equal(r.mediaHash,c.source.mediaHash);assert.equal(r.verification,'unverified');assert.equal(r.retrievedAt,'2026-11-23T00:00:00Z');
});
test('loader binds catalog bytes to profile hash and same-origin paths',async()=>{
 const catalogText="{\n  \"schema\": 1,\n  \"contentVersion\": \"synthetic-timing-v1\",\n  \"sources\": [\n    {\n      \"id\": \"synthetic-timing-fixture\",\n      \"version\": \"v1\",\n      \"hash\": \"a1930687d25bfe7fe8f2483c55d1aca83cdc3f4dcc39424dd6569aea9fe9660d\",\n      \"mediaHash\": \"cb0cdcb04039eb2bfc62a22462f0a040c1a23c2bdfd24f1403669569c2f22c5e\",\n      \"duration\": 8,\n      \"cues\": [\n        {\n          \"id\": \"timing-marker\",\n          \"start\": 2,\n          \"end\": 4,\n          \"text\": \"Synthetic timing marker. This is not a training instruction.\"\n        }\n      ]\n    }\n  ]\n}\n";
 const fetchImpl=async url=>url.endsWith('/content-profile.json')?new Response(JSON.stringify(profile),{headers:{'Content-Type':'application/json'}}):url.endsWith('/source-catalog.json')?new Response(catalogText,{headers:{'Content-Type':'application/json'}}):url.endsWith('/transcripts/synthetic-timing.txt')?new Response('Synthetic timing marker. This is not a training instruction.\n',{headers:{'Content-Type':'text/plain'}}):new Response('',{status:404});
 const c=await loadContentProfile({baseUrl:'https://sutra.example/content/',fetchImpl});assert.equal(c.profile.mode,'synthetic');assert.match(c.artifacts.catalogSha256,/^[a-f0-9]{64}$/);
});
test('catalog drift, cross-root refs, missing reviewed guide and malformed cues fail closed',async()=>{
 const bad=structuredClone(profile);bad.catalog.sha256='f'.repeat(64);assert.equal(validateContentProfile(bad,catalog).profile.catalog.sha256,'f'.repeat(64),'shape validation does not possess catalog bytes; loader performs the hash comparison');
 const reviewed=structuredClone(profile);reviewed.mode='reviewed';reviewed.guideClaim=null;assert.throws(()=>validateContentProfile(reviewed,catalog),/CONTENT_GUIDE/);
 const broken=structuredClone(catalog);broken.sources[0].cues[0].end=999;assert.throws(()=>validateContentProfile(profile,broken),/CONTENT_CATALOG/);
 const catalogText="{\n  \"schema\": 1,\n  \"contentVersion\": \"synthetic-timing-v1\",\n  \"sources\": [\n    {\n      \"id\": \"synthetic-timing-fixture\",\n      \"version\": \"v1\",\n      \"hash\": \"a1930687d25bfe7fe8f2483c55d1aca83cdc3f4dcc39424dd6569aea9fe9660d\",\n      \"mediaHash\": \"cb0cdcb04039eb2bfc62a22462f0a040c1a23c2bdfd24f1403669569c2f22c5e\",\n      \"duration\": 8,\n      \"cues\": [\n        {\n          \"id\": \"timing-marker\",\n          \"start\": 2,\n          \"end\": 4,\n          \"text\": \"Synthetic timing marker. This is not a training instruction.\"\n        }\n      ]\n    }\n  ]\n}\n";const fetchImpl=async url=>url.endsWith('/content-profile.json')?new Response(JSON.stringify(bad),{headers:{'Content-Type':'application/json'}}):url.endsWith('/source-catalog.json')?new Response(catalogText,{headers:{'Content-Type':'application/json'}}):new Response('Synthetic timing marker. This is not a training instruction.\n',{headers:{'Content-Type':'text/plain'}});
 await assert.rejects(loadContentProfile({baseUrl:'https://sutra.example/content/',fetchImpl}),/CONTENT_CATALOG_HASH/);
});
test('accessor-backed or executable-looking profile data is rejected without invoking it',()=>{
 let touched=0;const bad=structuredClone(profile);Object.defineProperty(bad,'title',{enumerable:true,get(){touched++;return 'x';}});
 assert.throws(()=>validateContentProfile(bad,catalog));assert.equal(touched,0);
});

test('reviewed mode requires an independently declared written claim and video claim remains bounded metadata',()=>{
 const reviewed=structuredClone(profile);reviewed.mode='reviewed';
 assert.throws(()=>validateContentProfile(reviewed,catalog),/CONTENT_GUIDE/);
 reviewed.transcript.path='/transcripts/release/'+reviewed.transcript.sha256+'/lesson.txt';
 reviewed.media.video='/media/release/'+catalog.sources[0].mediaHash+'/lesson.mp4';
 reviewed.guideClaim={sourceKind:'guide',sourceId:'guide',sourceVersion:'v1',title:'Guide',scope:reviewed.videoClaim.scope,claimKey:reviewed.videoClaim.claimKey,value:reviewed.videoClaim.value,excerpt:'Reviewed guide excerpt.',provenance:'Reviewed written guide',sourceHref:'/guides/release/'+'f'.repeat(64)+'/reviewed.html#claim',sourceHash:'f'.repeat(64)};
 const c=validateContentProfile(reviewed,catalog);assert.equal(c.profile.guideClaim.scope,c.profile.videoClaim.scope);
 const bad=structuredClone(profile);bad.videoClaim.scope='';assert.throws(()=>validateContentProfile(bad,catalog),/CONTENT_VIDEO_CLAIM/);
});

test('public media/guide references are same-origin root paths without traversal, queries or protocol-relative escape',()=>{
 for(const badPath of ['../media/x.mp4','//evil.example/x.mp4','/media/../secret','/media/x.mp4?token=1']){
  const p=structuredClone(profile);p.media.video=badPath;assert.throws(()=>validateContentProfile(p,catalog),/CONTENT_MEDIA/);
 }
 const reviewed=structuredClone(profile);reviewed.mode='reviewed';
 for(const badHref of ['../guides/x.html#c','//evil.example/x#c','/guides/../x#c','/guides/x.html?x=1#c','/guides/x.html']){
  reviewed.guideClaim={sourceKind:'guide',sourceId:'guide',sourceVersion:'v1',title:'Guide',scope:reviewed.videoClaim.scope,claimKey:reviewed.videoClaim.claimKey,value:reviewed.videoClaim.value,excerpt:'Reviewed guide excerpt.',provenance:'Reviewed written guide',sourceHref:badHref,sourceHash:'f'.repeat(64)};
  assert.throws(()=>validateContentProfile(reviewed,catalog),/CONTENT_GUIDE/);
 }
});

test('loader verifies the published transcript bytes and cue inclusion before exposing content',async()=>{
 const catalogText="{\n  \"schema\": 1,\n  \"contentVersion\": \"synthetic-timing-v1\",\n  \"sources\": [\n    {\n      \"id\": \"synthetic-timing-fixture\",\n      \"version\": \"v1\",\n      \"hash\": \"a1930687d25bfe7fe8f2483c55d1aca83cdc3f4dcc39424dd6569aea9fe9660d\",\n      \"mediaHash\": \"cb0cdcb04039eb2bfc62a22462f0a040c1a23c2bdfd24f1403669569c2f22c5e\",\n      \"duration\": 8,\n      \"cues\": [\n        {\n          \"id\": \"timing-marker\",\n          \"start\": 2,\n          \"end\": 4,\n          \"text\": \"Synthetic timing marker. This is not a training instruction.\"\n        }\n      ]\n    }\n  ]\n}\n";
 const baseFetch=text=>async url=>url.endsWith('/content-profile.json')?new Response(JSON.stringify(profile),{headers:{'Content-Type':'application/json'}}):url.endsWith('/source-catalog.json')?new Response(catalogText,{headers:{'Content-Type':'application/json'}}):new Response(text,{headers:{'Content-Type':'text/plain'}});
 await assert.rejects(loadContentProfile({baseUrl:'https://sutra.example/content/',fetchImpl:baseFetch('altered transcript\n')}),/CONTENT_TRANSCRIPT_HASH/);
 const p=structuredClone(profile);p.transcript.sha256='f'.repeat(64);assert.throws(()=>validateContentProfile(p,catalog),/CONTENT_PRIMARY/);
});
test('reviewed mode requires hash-addressed media, transcript and written guide paths',()=>{
 const p=structuredClone(profile);p.mode='reviewed';p.transcript.path='/transcripts/release/'+p.transcript.sha256+'/lesson.txt';p.media.video='/media/release/'+catalog.sources[0].mediaHash+'/lesson.mp4';
 p.guideClaim={sourceKind:'guide',sourceId:'guide',sourceVersion:'v1',title:'Guide',scope:p.videoClaim.scope,claimKey:p.videoClaim.claimKey,value:p.videoClaim.value,excerpt:'Reviewed guide excerpt.',provenance:'Reviewed written guide',sourceHref:'/guides/release/'+'f'.repeat(64)+'/guide.html#claim',sourceHash:'f'.repeat(64)};
 assert.equal(validateContentProfile(p,catalog).profile.mode,'reviewed');
 const bad=structuredClone(p);bad.media.video='/media/lesson.mp4';assert.throws(()=>validateContentProfile(bad,catalog),/CONTENT_ADDRESSING/);
});
