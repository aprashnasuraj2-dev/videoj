import test from 'node:test';import assert from 'node:assert/strict';import {loadContentProfile,receiptForFeatured,validateContentProfile} from '../index.js';
const profile={
  "schema": 1,
  "mode": "synthetic",
  "contentVersion": "synthetic-timing-v1",
  "title": "Synthetic timing lesson fixture",
  "primarySourceId": "synthetic-timing-fixture",
  "featuredCueId": "timing-marker",
  "catalog": {
    "path": "./source-catalog.json",
    "sha256": "a92e4c0e29691f8cc65cbc2707bb3359b4b351bde929f73299062e7dc05503cb"
  },
  "media": {
    "video": "../media/timing-fixture.mp4",
    "poster": "../media/timing-poster.svg",
    "chapters": "../media/timing-chapters.vtt",
    "captions": "../media/timing-captions.vtt"
  },
  "guideClaim": {
    "sourceKind": "guide",
    "sourceId": "fixture_guide",
    "sourceVersion": "v1",
    "title": "Hypothetical written checklist",
    "scope": "synthetic_handover",
    "claimKey": "signature_count",
    "value": 3,
    "excerpt": "In this invented example, the handover needs three signatures.",
    "provenance": "Authored synthetic written checklist fixture, not an external publisher",
    "sourceHref": "../guides/synthetic-comparison-guide.html#signature-count",
    "sourceHash": "2d3b6b2256a7c71ee18558cb6a422b739e32d6bdd9c7cf3ddae282477eefa9c0",
    "observedAt": "2026-11-23T00:00:00Z",
    "dateBasis": "Fixture metadata date"
  },
  "ui": {
    "noticeTitle": "Synthetic development content",
    "noticeBody": "This content profile is a test fixture. It demonstrates source consistency and browser behavior, not factual training guidance."
  }
};
const catalog={
  "schema": 1,
  "contentVersion": "synthetic-timing-v1",
  "sources": [
    {
      "id": "synthetic-timing-fixture",
      "version": "v1",
      "hash": "449d66df1b308964a008d2829fd09434f76a5a78137b4cef3de047488f2cf2e0",
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
 const r=receiptForFeatured(c,{retrievedAt:'2026-11-24T00:00:00Z'});assert.equal(r.sourceHash,c.source.hash);assert.equal(r.mediaHash,c.source.mediaHash);assert.equal(r.verification,'unverified');
});
test('loader binds catalog bytes to profile hash and same-origin paths',async()=>{
 const catalogText="{\n  \"schema\": 1,\n  \"contentVersion\": \"synthetic-timing-v1\",\n  \"sources\": [\n    {\n      \"id\": \"synthetic-timing-fixture\",\n      \"version\": \"v1\",\n      \"hash\": \"449d66df1b308964a008d2829fd09434f76a5a78137b4cef3de047488f2cf2e0\",\n      \"mediaHash\": \"cb0cdcb04039eb2bfc62a22462f0a040c1a23c2bdfd24f1403669569c2f22c5e\",\n      \"duration\": 8,\n      \"cues\": [\n        {\n          \"id\": \"timing-marker\",\n          \"start\": 2,\n          \"end\": 4,\n          \"text\": \"Synthetic timing marker. This is not a training instruction.\"\n        }\n      ]\n    }\n  ]\n}\n";
 const fetchImpl=async url=>url.endsWith('/content-profile.json')?new Response(JSON.stringify(profile),{headers:{'Content-Type':'application/json'}}):url.endsWith('/source-catalog.json')?new Response(catalogText,{headers:{'Content-Type':'application/json'}}):new Response('',{status:404});
 const c=await loadContentProfile({baseUrl:'https://sutra.example/content/',fetchImpl});assert.equal(c.profile.mode,'synthetic');assert.match(c.artifacts.catalogSha256,/^[a-f0-9]{64}$/);
});
test('catalog drift, cross-root refs, missing reviewed guide and malformed cues fail closed',async()=>{
 const bad=structuredClone(profile);bad.catalog.sha256='f'.repeat(64);assert.throws(()=>validateContentProfile({...bad,catalog:{...bad.catalog}},catalog));
 const reviewed=structuredClone(profile);reviewed.mode='reviewed';reviewed.guideClaim=null;assert.throws(()=>validateContentProfile(reviewed,catalog),/CONTENT_GUIDE/);
 const broken=structuredClone(catalog);broken.sources[0].cues[0].end=999;assert.throws(()=>validateContentProfile(profile,broken),/CONTENT_CATALOG/);
 const catalogText="{\n  \"schema\": 1,\n  \"contentVersion\": \"synthetic-timing-v1\",\n  \"sources\": [\n    {\n      \"id\": \"synthetic-timing-fixture\",\n      \"version\": \"v1\",\n      \"hash\": \"449d66df1b308964a008d2829fd09434f76a5a78137b4cef3de047488f2cf2e0\",\n      \"mediaHash\": \"cb0cdcb04039eb2bfc62a22462f0a040c1a23c2bdfd24f1403669569c2f22c5e\",\n      \"duration\": 8,\n      \"cues\": [\n        {\n          \"id\": \"timing-marker\",\n          \"start\": 2,\n          \"end\": 4,\n          \"text\": \"Synthetic timing marker. This is not a training instruction.\"\n        }\n      ]\n    }\n  ]\n}\n";const fetchImpl=async url=>url.endsWith('/content-profile.json')?new Response(JSON.stringify(bad),{headers:{'Content-Type':'application/json'}}):new Response(catalogText,{headers:{'Content-Type':'application/json'}});
 await assert.rejects(loadContentProfile({baseUrl:'https://sutra.example/content/',fetchImpl}),/CONTENT_CATALOG_HASH/);
});
test('accessor-backed or executable-looking profile data is rejected without invoking it',()=>{
 let touched=0;const bad=structuredClone(profile);Object.defineProperty(bad,'title',{enumerable:true,get(){touched++;return 'x';}});
 assert.throws(()=>validateContentProfile(bad,catalog));assert.equal(touched,0);
});
