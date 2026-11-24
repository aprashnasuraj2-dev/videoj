import test from 'node:test';
import assert from 'node:assert/strict';
import {formatNumber,formatMilliseconds,formatMillisecondPair,formatIsoDateTime,resolveFormatLocale} from '../src/locale-format.js';

test('locale resolution is bounded to English and Nepali',()=>{
 assert.equal(resolveFormatLocale('en'),'en');
 assert.equal(resolveFormatLocale('ne'),'ne');
 assert.equal(resolveFormatLocale('fr'),'en');
});

test('numbers and millisecond units preserve meaning while changing numeral system',()=>{
 assert.equal(formatMilliseconds(60000,'en'),'60,000 ms');
 assert.match(formatMilliseconds(60000,'ne'),/६०[,.]?००० ms/);
 assert.equal(formatMillisecondPair(1250,60000,'en'),'1,250 ms / 60,000 ms');
 assert.match(formatMillisecondPair(1250,60000,'ne'),/१[,.]?२५० ms \/ ६०[,.]?००० ms/);
 assert.equal(formatNumber(8,'en'),'8');
 assert.equal(formatNumber(8,'ne'),'८');
});

test('evidence timestamps use the same Gregorian UTC instant in both locales',()=>{
 const iso='2026-11-23T08:11:13Z';
 const en=formatIsoDateTime(iso,'en');
 const ne=formatIsoDateTime(iso,'ne');
 assert.match(en,/2026/);assert.match(en,/UTC$/);
 assert.match(ne,/२०२६/);assert.match(ne,/UTC$/);
 assert.notEqual(en,iso);assert.notEqual(ne,iso);
});

test('invalid dates and units fail instead of silently normalizing evidence metadata',()=>{
 assert.throws(()=>formatIsoDateTime('2026-11-23','en'),/UTC ISO/);
 assert.throws(()=>formatMilliseconds(-1,'en'),/Non-negative/);
 assert.throws(()=>formatNumber(Number.NaN,'en'),/Finite/);
});
