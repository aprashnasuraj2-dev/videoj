import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUniqueJson} from '../strict-json.js';

test('wire JSON accepts ordinary arrays, escaped strings, numbers and repeated keys in different objects',()=>{
 const values=[null,true,false,0,-0,1e-10,'\u0000"\\🧪',{a:{x:1},b:{x:2},array:[{x:3},{x:4}],quote:'",:"',unicode:'नेपाल'}];
 for(const item of values){const json=JSON.stringify(item);assert.deepEqual(parseUniqueJson(json),JSON.parse(json));}
 assert.deepEqual(parseUniqueJson(' \r\n {"a": 1, "b":-12.5e+2}\t'),{a:1,b:-1250});
});
test('duplicate decoded member identities are refused at every depth',()=>{
 for(const json of ['{"x":1,"x":2}','{"x":1,"\\u0078":2}','{"nested":[{"a":1,"a":2}]}','{"":"a","":"b"}','{"😀":1,"\\ud83d\\ude00":2}']){
  assert.throws(()=>parseUniqueJson(json),SyntaxError);
 }
});
test('malformed or oversized/deep JSON is refused without coercion or recursive exhaustion',()=>{
 let reads=0;
 for(const bad of ['','01','1.','true false','{"a":1,}','[1,]','{"a" 1}','{"a":"\\x"}','"unterminated','[','{','false!'])assert.throws(()=>parseUniqueJson(bad),SyntaxError);
 assert.throws(()=>parseUniqueJson({toString(){reads++;return '{}';}}),SyntaxError);assert.equal(reads,0);
 assert.throws(()=>parseUniqueJson(' '.repeat(1024)+'{}',{maxChars:1024}),SyntaxError);
 assert.throws(()=>parseUniqueJson('['.repeat(1000)+'0'+']'.repeat(1000)),SyntaxError);
 assert.deepEqual(parseUniqueJson('[[0]]',{maxDepth:2}),[[0]]);
});
