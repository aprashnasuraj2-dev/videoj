import test from 'node:test';
import assert from 'node:assert/strict';
import {createSearchProviders,DISCOVERY_BACKENDS} from '../providers.js';
import {selectResearchBackends} from '../research-source-router.js';

const resultBody=payload=>Buffer.from(typeof payload==='string'?payload:JSON.stringify(payload),'utf8');
function fixtures(){
 const requests=[];
 const response={
  'api.search.brave.com':{web:{results:[{url:'https://www.nature.com/articles/s00001',title:'Nature review'}]}},
  'api.tavily.com':{results:[{url:'https://www.science.org/doi/10.1000/x',title:'Science paper'}]},
  'api.openalex.org':{results:[{title:'Quantum study',doi:'https://doi.org/10.1038/quantum-test',publication_year:2026,primary_location:{landing_page_url:'https://www.nature.com/articles/quantum-test',source:{display_name:'Nature'}},open_access:{is_oa:false}}]},
  'api.crossref.org':{message:{items:[{DOI:'10.1000/example',title:['Publication from Wiley'],URL:'https://doi.org/10.1000/example',publisher:'Wiley',published:{'date-parts':[[2025,9,1]]}}]}},
  'www.ebi.ac.uk':{resultList:{result:[{id:'MED123',source:'MED',title:'Cardiology RCT',doi:'10.1234/medical',journalTitle:'Medical Journal',pubYear:'2026',isOpenAccess:'Y'}]}},
  'api.semanticscholar.org':{data:[{url:'https://www.acm.org/articles/research',title:'ML paper',year:2024,externalIds:{DOI:'10.5555/test'},venue:'ACM',isOpenAccess:true}]},
  'en.wikipedia.org':{query:{pages:[{title:'Science publishing'}]}},
  'export.arxiv.org':'<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><id>https://arxiv.org/abs/2401.00001</id><title>Novel &amp; Validated Model</title><published>2024-01-01T00:00:00Z</published></entry></feed>'
 };
 const transport=async opts=>{requests.push(opts);const host=opts.url.hostname;if(!(host in response))throw Error('unknown fixture host');return {body:resultBody(response[host])}};
 return {requests,transport};
}
test('all eight research and general discovery adapters are available without a fixed publisher allowlist',()=>{
 const {transport}=fixtures(),p=createSearchProviders({transport});
 for(const name of DISCOVERY_BACKENDS.filter(x=>!['brave','tavily'].includes(x)))assert.ok(p[name],name);
 assert.equal(p.brave,undefined);assert.equal(p.tavily,undefined);
 assert.deepEqual(Object.keys(p).sort(),DISCOVERY_BACKENDS.filter(x=>!['brave','tavily'].includes(x)).sort());
});
test('multi-provider scholarly metadata returns publisher and canonical public article destinations',async()=>{
 const {requests,transport}=fixtures(),p=createSearchProviders({credentials:{brave:'test-brave-key',tavily:'test-tavily-key'},transport});
 const each={};
 for(const id of DISCOVERY_BACKENDS)each[id]=await p[id].search('quantum science research');
 for(const id of DISCOVERY_BACKENDS)assert.equal(each[id].length,1,id);
 assert.equal(each.openalex[0].url,'https://www.nature.com/articles/quantum-test');
 assert.equal(each.crossref[0].doi,'10.1000/example');
 assert.equal(each.crossref[0].publisher,'Wiley');
 assert.equal(each.europepmc[0].publisher,'Medical Journal');
 assert.equal(each.semanticscholar[0].publisher,'ACM');
 assert.equal(each.arxiv[0].title,'Novel & Validated Model');
 assert.equal(each.wikipedia[0].url,'https://en.wikipedia.org/wiki/Science_publishing');
 assert.ok(requests.every(x=>x.url.protocol==='https:'&&x.maxBytes===262144&&x.signal===undefined));
 assert.ok(requests.every(x=>x.acceptedTypes.includes(x.url.hostname==='export.arxiv.org'?'application/atom+xml':'application/json')));
});
test('openalex keys remain on the trusted upstream request, not in returned metadata',async()=>{
 const {transport,requests}=fixtures(),p=createSearchProviders({credentials:{openalex:'private-openalex-key'},transport});
 const rows=await p.openalex.search('papers');
 assert.equal(requests[0].url.searchParams.get('api_key'),'private-openalex-key');
 assert.equal(JSON.stringify(rows).includes('private-openalex-key'),false);
});
test('invalid provider URLs and injected private destinations are dropped; no private fetch',async()=>{
 const p=createSearchProviders({transport:async opts=>({body:resultBody({message:{items:[{title:['Private'],URL:'https://127.0.0.1/admin'},{title:['Public'],DOI:'10.1000/valid'}]}})})});
 const r=await p.crossref.search('some study');
 assert.equal(r.length,1);assert.equal(r[0].url,'https://doi.org/10.1000/valid');
});
test('malformed JSON and XML external entities refuse before results are published',async()=>{
 const bad=createSearchProviders({transport:async()=>({body:resultBody('not JSON')})});
 await assert.rejects(bad.crossref.search('word'),/PROVIDER_RESPONSE/);
 const xml=createSearchProviders({transport:async()=>({body:resultBody('<!DOCTYPE feed [<!ENTITY x SYSTEM "file:///etc/passwd">]><feed></feed>')})});
 await assert.rejects(xml.arxiv.search('particle physics'),/PROVIDER_RESPONSE/);
});
test('domain routing selects heterogeneous scholarly indexes and never assumes Wikipedia authority',()=>{
 const available=[...DISCOVERY_BACKENDS];
 const medical=selectResearchBackends('clinical trial in cardiology',available).providers;
 const physics=selectResearchBackends('quantum computing paper preprint',available).providers;
 const general=selectResearchBackends('latest business policy news',available).providers;
 assert.equal(medical[0],'europepmc');assert.ok(medical.includes('openalex'));assert.ok(medical.includes('crossref'));
 assert.equal(physics[0],'semanticscholar');assert.ok(physics.includes('arxiv'));
 assert.equal(general[0],'brave');assert.equal(general[1],'tavily');
 assert.notEqual(medical[0],'wikipedia');
 const free=selectResearchBackends('history of science academic literature',available.filter(x=>!['brave','tavily'].includes(x))).providers;
 assert.ok(free.length>=4);assert.ok(free.includes('crossref'));assert.ok(free.includes('openalex'));
});
test('no publisher/domain restriction for public ResearchGate, SciELO, Springer, IEEE, Elsevier, PLOS or ACM URLs',async()=>{
 const {admitDocumentURL}=await import('../dynamic-public-route-policy.js');
 for(const address of [
  'https://www.researchgate.net/publication/123456_Academic_Article',
  'https://www.scielo.br/j/example/a/abc',
  'https://link.springer.com/article/10.1007/abc',
  'https://ieeexplore.ieee.org/document/12345',
  'https://www.sciencedirect.com/science/article/pii/S123456',
  'https://journals.plos.org/plosone/article?id=10.1371/test',
  'https://dl.acm.org/doi/10.1145/abc'
 ])assert.equal(typeof admitDocumentURL(address,{allowQuery:true}),'string',address);
});
