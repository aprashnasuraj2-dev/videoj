import test from 'node:test';
import assert from 'node:assert/strict';
import {localeCatalog,localeMeta,translate,applyLocale,formatLocalAmbiguity} from '../src/localization.js';

test('English remains complete for every declared Nepali core key',()=>{
 for(const key of Object.keys(localeCatalog.ne)){
  assert.equal(typeof localeCatalog.en[key],'string',key);
  assert.ok(localeCatalog.en[key].trim().length>0,key);
 }
 assert.equal(localeMeta.en.reviewed,true);
 assert.equal(localeMeta.ne.reviewed,false);
});

test('missing locale and missing key fall back without inventing translated source text',()=>{
 assert.equal(translate('lesson.title','xx'),localeCatalog.en['lesson.title']);
 assert.equal(translate('missing.key','ne'),'missing.key');
});

test('locale application mutates only explicitly tagged interface nodes',()=>{
 const tagged={textContent:'old',getAttribute:()=> 'lesson.title'};
 const source={textContent:'ORIGINAL SOURCE WORDING'};
 const root={
  querySelectorAll(selector){
   if(selector==='[data-i18n]')return [tagged];
   if(selector==='[data-i18n-placeholder]')return [];
   return [];
  },
  documentElement:{setAttribute(name,value){this[name]=value;}}
 };
 assert.equal(applyLocale(root,'ne'),'ne');
 assert.equal(tagged.textContent,localeCatalog.ne['lesson.title']);
 assert.equal(source.textContent,'ORIGINAL SOURCE WORDING');
 assert.equal(root.documentElement.lang,'ne');
});

test('localized ambiguity keeps exact counts and distinguishes complete versus truncated results',()=>{
 assert.match(formatLocalAmbiguity(2,2),/2 of 2 matching/);assert.doesNotMatch(formatLocalAmbiguity(5,5),/truncated/);
 assert.match(formatLocalAmbiguity(6,5),/5 of 6 matching.*truncated/);
 assert.match(formatLocalAmbiguity(6,5,'ne'),/६.*५/);
 assert.equal(formatLocalAmbiguity(6,6),translate('local.status.unavailable'));
 const node={textContent:'',getAttribute(name){return {'data-i18n':'local.status.truncated','data-match-count':'6','data-returned-count':'5'}[name];}};
 const root={querySelectorAll(selector){return selector==='[data-i18n]'?[node]:[];}};
 applyLocale(root,'ne');assert.match(node.textContent,/६.*५/);applyLocale(root,'en');assert.match(node.textContent,/5 of 6 matching.*truncated/);
});
