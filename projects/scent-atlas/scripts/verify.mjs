import {readdir,readFile,stat} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const base=path.resolve('dist');let pages=[];
async function walk(d){for(const n of await readdir(d,{withFileTypes:true})){const p=path.join(d,n.name);if(n.isDirectory())await walk(p);else if(p.endsWith('.html'))pages.push(p);}}
await walk(base);assert.equal(pages.length,12,'11 routes plus friendly 404');
for(const p of pages){const h=await readFile(p,'utf8');assert.match(h,/<html lang="en">/);assert.match(h,/<main id="main">/);assert.match(h,/<title>[^<]+/);assert.match(h,/name="description"/);assert.match(h,/rel="canonical"/);assert.match(h,/<a class="skip" href="#main">/);assert.doesNotMatch(h,/<form\b|type="email"|<iframe\b|https:\/\/(?!scent-atlas\.aafnaipatro\.com)/i,'No egress or data forms');
 const links=[...h.matchAll(/(?:href|src)="(\/[^"#]*)(?:#[^"]*)?"/g)].map(x=>x[1]);for(const loc of links){if(loc==='/')continue;const dest=path.join(base,decodeURI(loc.slice(1)));const file=loc.endsWith('/')?path.join(dest,'index.html'):dest;assert.equal((await stat(file).catch(()=>null))?.isFile(),true,`Broken internal path ${loc} in ${path.relative(base,p)}`);}}
console.log(`Verified ${pages.length} HTML documents, local references, navigation, metadata and no data collection forms.`);
