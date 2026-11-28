import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifySemanticOperation} from '../semantic-operation-classifier.js';
const data=JSON.parse(readFileSync(new URL('../evaluation/finqa-public-test-heldout.json',import.meta.url)));
function gold(c){const q=c.question.toLowerCase(),ops=(c.program.match(/\b(add|subtract|multiply|divide)\(/g)||[]).map(x=>x.slice(0,-1));if(/\b(average|mean)\b/.test(q))return 'MEAN';if(ops.includes('subtract')&&ops.includes('divide')&&/\b(percent|percentage|growth)\b/.test(q))return 'RELATIVE_CHANGE';if(ops.every(x=>x==='add'))return 'SUM';if(ops.length===1&&ops[0]==='subtract')return 'DIFFERENCE';if(ops.includes('divide'))return 'RATIO';return 'UNSUPPORTED';}
test('externally annotated FinQA ranks 25-64 remain held out and preserve failures',()=>{
 assert.equal(data.cases.length,40);const rows=data.cases.map(c=>({id:c.id,prediction:classifySemanticOperation(c.question).family,expected:gold(c)}));
 const correct=rows.filter(x=>x.prediction===x.expected).length,coverage=rows.filter(x=>x.prediction!=='UNSUPPORTED').length;
 assert.equal(correct,23);assert.equal(coverage,24);assert.equal(rows.length,40);
 assert.ok(rows.some(x=>x.prediction!==x.expected));assert.ok(rows.some(x=>x.prediction==='UNSUPPORTED'));
});
