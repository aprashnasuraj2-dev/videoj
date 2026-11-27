import test from 'node:test';
import assert from 'node:assert/strict';
import {scanHtml} from '../html-parser.js';
test('structure, metadata, quoted delimiters and entity decoding survive extraction',()=>{
 const raw='<html><head><title>Battery &amp; storage</title><meta name="author" content="Example Lab"></head><body><h1>Battery</h1><p>Costs &#36;100.</p><a href="/source" title="x > y">Source</a><script>evil("<a href=\\"/bad\\">")</script><style>.x{display:none}</style><a href="https://other.org/ref">Independent</a></body></html>';
 const d=scanHtml(raw,'https://primary.org/report');
 assert.match(d.text,/Battery\nCosts \$100\./);assert.ok(!d.text.includes('evil'));assert.equal(d.metadata.title,'Battery & storage');assert.equal(d.metadata.author,'Example Lab');assert.deepEqual(d.links,['https://primary.org/source']);
 assert.deepEqual(scanHtml(raw,'https://primary.org/report',{allowCrossOriginLinks:true}).links,['https://primary.org/source','https://other.org/ref']);
});
test('unsafe URLs, secret-like path and malformed HTML are refused or excluded',()=>{
 const d=scanHtml('<a href="http://public.org/x">a</a><a href="https://127.0.0.1/">b</a><a href="/password%3Dsecret">c</a><a href="/x?token=secret">d</a><a href="/good">e</a>','https://primary.org/report');
 assert.deepEqual(d.links,['https://primary.org/good']);assert.throws(()=>scanHtml('<script>unclosed','https://primary.org/report'),/HTML_RAW_BLOCK/);assert.throws(()=>scanHtml('<a href="'+ 'x'.repeat(5000),'https://primary.org/report'),/HTML_TAG_LIMIT/);
});
