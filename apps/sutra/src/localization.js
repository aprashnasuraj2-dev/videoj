import {formatIsoDateTime,formatMillisecondPair,formatNumber} from './locale-format.js';
const EN=Object.freeze({
 'language.label':'Language',
 'local.section':"ASK LOCALLY · NO MODEL OR NETWORK",
 'local.title':"Ask the source without a model.",
 'local.description':"Use your own words to find matching excerpts from the lesson. This searches for words, not meaning, and does not generate an answer or advice. A match does not establish relevance or factual truth.",
 'local.label':"Question for local source lookup",
 'local.placeholder':"e.g. Where is the timing marker?",
 'local.submit':"Find cited source locally",
 'local.status.idle':"No model or network request will be made.",
 'local.status.changed':"Question changed. Previous source actions are unavailable.",
 'local.status.invalid':"Enter a question of 1–240 characters. 0 model calls, 0 network requests.",
 'local.status.unsupported':"No supported specific source terms; no answer is claimed. 0 model calls, 0 network requests.",
 'local.status.nomatch':"No supported lexical match. Abstaining instead of inventing an answer. 0 model calls, 0 network requests.",
 'local.status.unavailable':"A source receipt could not be validated. No answer is claimed.",
 'local.status.index':"Local indexing is unavailable; exact source search remains available.",
 'local.status.matched':"One lexically matching source excerpt; relevance and factual truth remain unverified. 0 model calls, 0 network requests.",
 'local.status.ambiguous':"{shown} of {total} matching source excerpts shown. No single answer is selected. 0 model calls, 0 network requests.",
 'local.status.truncated':"{shown} of {total} matching source excerpts shown (truncated). No single answer is selected. Narrow the question for complete coverage. 0 model calls, 0 network requests.",
 'local.action.seek':"Seek to local source cue",
 'local.action.review':"Preview local review card",
 'language.en':'English',
 'language.ne':'नेपाली (draft)',
 'language.review':'Nepali terminology is a working draft pending human review.',
 'stage':'Local development shell',
 'hero.eyebrow':'A moment in the lesson. A source you can inspect.',
 'hero.title':'Find the moment. Keep the evidence.',
 'hero.title.primary':'Find the moment.',
 'hero.title.secondary':'Keep the evidence.',
 'hero.intro':'Connect a lesson’s exact words to a reviewable record. Inspect where a source excerpt comes from before relying on it.',
 'notice.title':'Synthetic example',
 'notice.body':'No live agents or original lesson footage are connected. This example demonstrates source consistency, not factual verification.',
 'journey.find.title':'1 · Ask locally',
 'journey.find.body':'Ask a question for exact source cues. No model call.',
 'journey.compare.title':'2 · Compare evidence',
 'journey.compare.body':'Keep missing or conflicting sources visibly separate.',
 'journey.keep.title':'3 · Keep a reviewed reference',
 'journey.keep.body':'Preview the exact receipt before anything is saved.',
 'journey.note':'No account · no personal API key · optional inference requires separate approval for every run.',
 'lesson.section':'01 / LESSON',
 'lesson.title':'Recording a reading',
 'lesson.pending':'Original lesson pending',
 'lesson.real.title':'A real lesson belongs here.',
 'lesson.real.body':'Rights-cleared footage and a factual reviewer are still needed. No playback or seek result is simulated.',
 'lesson.load':'Load synthetic timing fixture',
 'lesson.seek':'Inspect timing cue at 00:02',
 'lesson.playback':'Read current playback state',
 'evidence.section':'02 / INSPECT',
 'evidence.title':'Follow the source.',
 'evidence.body':'Use Inspect cue receipt beside any transcript cue, or check the featured example below.',
 'evidence.check':'Check example',
 'evidence.alter':'Try altered quotation',
 'comparison.section':'03 / SOURCE COMPARISON',
 'comparison.title':'Preserve uncertainty between sources.',
 'comparison.body':'See the active source cue alongside available or missing written-guide evidence. Missing or disagreeing real sources must remain visibly separate rather than being blended into a confident answer.',
 'comparison.inspect':'Inspect available evidence',
 'comparison.video':'Video-side source',
 'comparison.guide':'Written guide-side source',
 'comparison.missing':'No reviewed source excerpt or provenance is connected.',
 'comparison.meta.source':'Source',
 'comparison.meta.version':'Version',
 'comparison.meta.scope':'Scope',
 'comparison.meta.hash':'Source hash',
 'comparison.meta.claim':'Claim key',
 'comparison.meta.value':'Structured value',
 'comparison.meta.provenance':'Provenance',
 'comparison.meta.timestamp':'Recorded timestamp',
 'comparison.meta.date':'Date meaning',
 'comparison.note':'Comparisons evaluate exact declared values and source scope, not the truth of either claim. Missing evidence remains missing; disagreement is not resolved by source consistency alone.',
 'transcript.follow':'Follow the source cue',
 'transcript.search':'Search source transcript',
 'transcript.placeholder':'Search cue wording',
 'transcript.inspect':'Inspect cue receipt',
 'transcript.receipt.seek':'Seek to inspected cue',
 'transcript.receipt.review':'Preview inspected review card',
 'transcript.receipt.matched':'Catalog-matched receipt. No model call, network request or factual verification.',
 'transcript.receipt.unavailable':'This exact receipt could not be validated.',
 'review.confirm':'Confirm local save',
 'review.cancel':'Cancel',
 'review.section':'04 / YOUR REVIEW',
 'review.title':'Keep a reviewable reference.',
 'review.body':'Preview the featured source receipt before saving it in this browser. No account, server write or factual verification is involved.',
 'review.preview':'Preview source review card',
 'peer.run':'Run scripted peer test'
});
const NE=Object.freeze({
 'language.label':'भाषा',
 'local.section':"स्थानीय खोज · मोडेल वा नयाँ नेटवर्क अनुरोध छैन",
 'local.title':"मोडेलबिना स्रोतमा प्रश्न सोध्नुहोस्।",
 'local.description':"आफ्नै शब्दमा प्रश्न सोधेर पाठमा शब्द मिल्ने अंश खोज्नुहोस्। यसले शब्दको मिलान खोज्छ, अर्थको होइन। उत्तर वा सल्लाह बनाइँदैन। शब्द मिल्दैमा सान्दर्भिकता वा तथ्यात्मक सत्यता पुष्टि हुँदैन।",
 'local.label':"स्थानीय स्रोतका लागि प्रश्न",
 'local.placeholder':"उदाहरण: टाइमिङ मार्कर कहाँ छ?",
 'local.submit':"स्रोतबाट उद्धृत अंश खोज्नुहोस्",
 'local.status.idle':"मोडेल कल वा नयाँ नेटवर्क अनुरोध गरिँदैन।",
 'local.status.changed':"प्रश्न परिवर्तन भयो। अघिल्लो स्रोतसम्बन्धी कार्य अब उपलब्ध छैन।",
 'local.status.invalid':"१–२४० अक्षरको प्रश्न लेख्नुहोस्। मोडेल कल ०, नेटवर्क अनुरोध ०।",
 'local.status.unsupported':"स्रोतमा खोज्न मिल्ने विशिष्ट शब्द छैनन्। उत्तर बनाइएको छैन। मोडेल कल ०, नेटवर्क अनुरोध ०।",
 'local.status.nomatch':"स्रोतमा पर्याप्त मिल्दो अंश भेटिएन। अनुमान गरेर उत्तर दिइएको छैन। मोडेल कल ०, नेटवर्क अनुरोध ०।",
 'local.status.unavailable':"स्रोतको उद्धरण जाँच्न सकिएन। उत्तर बनाइएको छैन।",
 'local.status.index':"स्थानीय सूची बनाउन सकिएन। ठ्याक्कै शब्द खोज्ने विकल्प उपलब्ध छ।",
 'local.status.matched':"स्रोतमा शब्द मिल्ने एउटा अंश भेटियो। सान्दर्भिकता र तथ्यात्मक सत्यता पुष्टि भएको छैन। मोडेल कल ०, नेटवर्क अनुरोध ०।",
 'local.status.ambiguous':"मिलेका {total} स्रोत अंशमध्ये {shown} देखाइएका छन्। एउटा मात्र उत्तर छानिएको छैन। मोडेल कल ०, नेटवर्क अनुरोध ०।",
 'local.status.truncated':"मिलेका {total} स्रोत अंशमध्ये {shown} मात्र देखाइएका छन्। बाँकी अंश देखाइएको छैन। एउटा मात्र उत्तर छानिएको छैन। सबै मिल्दो अंश हेर्न प्रश्न थप स्पष्ट बनाउनुहोस्। मोडेल कल ०, नेटवर्क अनुरोध ०।",
 'local.action.seek':"मिल्दो स्रोतको समय खोल्नुहोस्",
 'local.action.review':"स्थानीय समीक्षा कार्ड पूर्वावलोकन",
 'language.en':'English',
 'language.ne':'नेपाली (मस्यौदा)',
 'language.review':'नेपाली प्राविधिक शब्दावली मानव समीक्षा हुन बाँकी कार्यशील मस्यौदा हो।',
 'stage':'स्थानीय विकास नमुना',
 'hero.eyebrow':'पाठको एउटा क्षण। तपाईंले जाँच्न सक्ने स्रोत।',
 'hero.title':'क्षण पत्ता लगाउनुहोस्। प्रमाण सुरक्षित राख्नुहोस्।',
 'hero.title.primary':'क्षण पत्ता लगाउनुहोस्।',
 'hero.title.secondary':'प्रमाण सुरक्षित राख्नुहोस्।',
 'hero.intro':'पाठका ठीक शब्दहरूलाई समीक्षा गर्न सकिने अभिलेखसँग जोड्नुहोस्। स्रोतको अंशमा भर पर्नुअघि त्यो कहाँबाट आएको हो जाँच्नुहोस्।',
 'notice.title':'कृत्रिम उदाहरण',
 'notice.body':'लाइभ एजेन्ट वा मौलिक पाठको भिडियो जोडिएको छैन। यो उदाहरणले स्रोतको आपसी मिलान देखाउँछ, तथ्य प्रमाणित गर्दैन।',
 'journey.find.title':'१ · स्थानीय प्रश्न सोध्नुहोस्',
 'journey.find.body':'स्रोतका ठ्याक्कै अंश खोज्न प्रश्न सोध्नुहोस्। मोडेल कल छैन।',
 'journey.compare.title':'२ · प्रमाण तुलना गर्नुहोस्',
 'journey.compare.body':'नभएको वा बाझिएको स्रोतलाई छुट्टाछुट्टै देखाइराख्नुहोस्।',
 'journey.keep.title':'३ · समीक्षा गरिएको सन्दर्भ राख्नुहोस्',
 'journey.keep.body':'केही सुरक्षित गर्नुअघि ठ्याक्कै receipt पूर्वावलोकन गर्नुहोस्।',
 'journey.note':'खाता चाहिँदैन · व्यक्तिगत API key चाहिँदैन · वैकल्पिक inference चलाउन हरेक पटक छुट्टै अनुमति चाहिन्छ।',
 'lesson.section':'०१ / पाठ',
 'lesson.title':'पढाइ रेकर्ड गर्ने',
 'lesson.pending':'मौलिक पाठ बाँकी',
 'lesson.real.title':'यहाँ वास्तविक पाठ हुनुपर्छ।',
 'lesson.real.body':'अधिकार स्पष्ट भएको भिडियो र तथ्य समीक्षा गर्ने व्यक्ति अझै आवश्यक छन्। प्लेब्याक वा seek नतिजा नक्कली रूपमा देखाइँदैन।',
 'lesson.load':'कृत्रिम टाइमिङ नमुना लोड गर्नुहोस्',
 'lesson.seek':'00:02 को टाइमिङ क्यु जाँच्नुहोस्',
 'lesson.playback':'हालको प्लेब्याक अवस्था पढ्नुहोस्',
 'evidence.section':'०२ / जाँच',
 'evidence.title':'स्रोतसम्म पुग्नुहोस्।',
 'evidence.body':'ट्रान्सक्रिप्टको कुनै पनि क्युको रसीद जाँच्नुहोस् वा तलको उदाहरण चलाउनुहोस्।',
 'evidence.check':'उदाहरण जाँच्नुहोस्',
 'evidence.alter':'परिवर्तित उद्धरण परीक्षण गर्नुहोस्',
 'comparison.section':'०३ / स्रोत तुलना',
 'comparison.title':'स्रोतबीचको अनिश्चितता जोगाइराख्नुहोस्।',
 'comparison.body':'सक्रिय स्रोत क्यु र उपलब्ध वा नभएको लिखित गाइड प्रमाण छुट्टाछुट्टै हेर्नुहोस्। वास्तविक स्रोत हराएको वा असहमत भएको अवस्थामा त्यसलाई आत्मविश्वासी उत्तरमा मिसाउनु हुँदैन।',
 'comparison.inspect':'उपलब्ध प्रमाण जाँच्नुहोस्',
 'comparison.video':'भिडियोतर्फको स्रोत',
 'comparison.guide':'लिखित गाइडतर्फको स्रोत',
 'comparison.missing':'समीक्षा गरिएको स्रोत उद्धरण वा provenance जोडिएको छैन।',
 'comparison.meta.source':'स्रोत',
 'comparison.meta.version':'संस्करण',
 'comparison.meta.scope':'दायरा',
 'comparison.meta.hash':'स्रोत ह्यास',
 'comparison.meta.claim':'दाबी कुञ्जी',
 'comparison.meta.value':'संरचित मान',
 'comparison.meta.provenance':'Provenance',
 'comparison.meta.timestamp':'अभिलेख समय',
 'comparison.meta.date':'मितिको अर्थ',
 'comparison.note':'तुलनाले घोषित मान र स्रोत दायरा जाँच्छ; कुनै दाबीको सत्यता प्रमाणित गर्दैन। विवादको उदाहरण काल्पनिक हो र मौलिक पाठको भिडियोसँग सम्बन्धित छैन।',
 'transcript.follow':'स्रोत क्यु पछ्याउनुहोस्',
 'transcript.search':'स्रोत ट्रान्सक्रिप्ट खोज्नुहोस्',
 'transcript.placeholder':'क्युका शब्द खोज्नुहोस्',
 'transcript.inspect':'क्यु रसीद जाँच्नुहोस्',
 'transcript.receipt.seek':'जाँचिएको क्युको समयमा जानुहोस्',
 'transcript.receipt.review':'जाँचिएको समीक्षा कार्डको पूर्वावलोकन',
 'transcript.receipt.matched':'स्रोत सूचीसँग मिलेको रसीद। मोडेल कल, नेटवर्क अनुरोध वा तथ्य प्रमाणीकरण छैन।',
 'transcript.receipt.unavailable':'यो ठ्याक्कै रसीद जाँच्न सकिएन।',
 'review.confirm':'स्थानीय रूपमा राख्ने पुष्टि गर्नुहोस्',
 'review.cancel':'रद्द गर्नुहोस्',
 'review.section':'०४ / तपाईंको समीक्षा',
 'review.title':'पुनः जाँच्न सकिने सन्दर्भ राख्नुहोस्।',
 'review.body':'यो ब्राउजरमा राख्नुअघि मुख्य स्रोत रसीदको पूर्वावलोकन गर्नुहोस्। खाता, सर्भर लेखाइ वा तथ्य प्रमाणीकरण हुँदैन।',
 'review.preview':'स्रोत समीक्षा कार्ड पूर्वावलोकन गर्नुहोस्',
 'peer.run':'स्क्रिप्ट गरिएको peer परीक्षण चलाउनुहोस्'
});
export const localeCatalog=Object.freeze({en:EN,ne:NE});
export const localeMeta=Object.freeze({
 en:Object.freeze({label:'English',reviewed:true}),
 ne:Object.freeze({label:'नेपाली',reviewed:false})
});
export function translate(key,locale='en'){
 const chosen=localeCatalog[locale]??EN;
 return chosen[key]??EN[key]??key;
}
// The displayed count describes lexical matches, not semantic entailment.
export function formatLocalAmbiguity(total,shown,locale='en'){
 if(!Number.isInteger(total)||total<2||total>5000||shown!==Math.min(total,5))return translate('local.status.unavailable',locale);
 return translate(total>shown?'local.status.truncated':'local.status.ambiguous',locale)
  .replace('{total}',formatNumber(total,locale)).replace('{shown}',formatNumber(shown,locale));
}
export function applyLocale(root,locale='en'){
 if(!root||typeof root.querySelectorAll!=='function')throw new TypeError('Localization root is required.');
 const resolved=localeCatalog[locale]?locale:'en';
 for(const node of root.querySelectorAll('[data-i18n]')){
  const key=node.getAttribute('data-i18n');
  node.textContent=key==='local.status.ambiguous'||key==='local.status.truncated'?
   formatLocalAmbiguity(Number(node.getAttribute('data-match-count')),Number(node.getAttribute('data-returned-count')),resolved):translate(key,resolved);
 }
 for(const node of root.querySelectorAll('[data-i18n-placeholder]')){
  const key=node.getAttribute('data-i18n-placeholder');
  node.setAttribute('placeholder',translate(key,resolved));
 }
 for(const node of root.querySelectorAll('[data-format-datetime]')){
  const raw=node.getAttribute('data-format-datetime');
  try{node.textContent=formatIsoDateTime(raw,resolved);}catch{node.textContent='Invalid timestamp';}
 }
 for(const node of root.querySelectorAll('[data-format-ms-pair]')){
  const current=Number(node.getAttribute('data-format-current-ms'));
  const limit=Number(node.getAttribute('data-format-limit-ms'));
  try{node.textContent=formatMillisecondPair(current,limit,resolved);}catch{node.textContent='Invalid duration';}
 }
 for(const node of root.querySelectorAll('[data-format-number]')){
  const raw=Number(node.getAttribute('data-format-number'));
  try{node.textContent=formatNumber(raw,resolved);}catch{node.textContent='Invalid number';}
 }
 root.documentElement?.setAttribute?.('lang',resolved);
 return resolved;
}
