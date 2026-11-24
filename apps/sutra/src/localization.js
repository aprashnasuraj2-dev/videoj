import {formatIsoDateTime,formatMillisecondPair,formatNumber} from './locale-format.js';
const EN=Object.freeze({
 'language.label':'Language',
 'language.en':'English',
 'language.ne':'नेपाली (draft)',
 'language.review':'Nepali terminology is a working draft pending human review.',
 'stage':'Local development shell',
 'hero.eyebrow':'A moment in the lesson. A source you can inspect.',
 'hero.title':'Find the moment. Keep the evidence.',
 'hero.title.primary':'Find the moment.',
 'hero.title.secondary':'Keep the evidence.',
 'hero.intro':'Connect a lesson’s exact words to a reviewable record. Inspect where an answer comes from before you use it.',
 'notice.title':'Synthetic example',
 'notice.body':'No live agents or original lesson footage are connected. This example demonstrates source consistency, not factual verification.',
 'journey.find.title':'1 · Find the source',
 'journey.find.body':'Start with exact words. No model call is required.',
 'journey.compare.title':'2 · Compare evidence',
 'journey.compare.body':'Keep missing or conflicting sources visibly separate.',
 'journey.keep.title':'3 · Keep a reviewed reference',
 'journey.keep.body':'Preview the exact receipt before anything is saved.',
 'journey.note':'No account · no personal API key · optional inference stays off until you explicitly check availability.',
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
 'evidence.body':'Select the transcript cue to inspect its receipt, or run the example below.',
 'evidence.check':'Check example',
 'evidence.alter':'Try altered quotation',
 'comparison.section':'03 / SOURCE COMPARISON',
 'comparison.title':'Preserve uncertainty between sources.',
 'comparison.body':'See the actual synthetic timing cue alongside the missing written-guide evidence. A separate hypothetical conflict demonstrates how disagreement stays unresolved rather than being blended into a confident answer.',
 'comparison.inspect':'Inspect available evidence',
 'comparison.conflict':'Demonstrate a synthetic conflict',
 'comparison.video':'Video-side source',
 'comparison.guide':'Written guide-side source',
 'comparison.missing':'No reviewed source excerpt or provenance is connected.',
 'comparison.meta.source':'Source',
 'comparison.meta.version':'Version',
 'comparison.meta.scope':'Scope',
 'comparison.meta.claim':'Claim key',
 'comparison.meta.value':'Structured value',
 'comparison.meta.provenance':'Provenance',
 'comparison.meta.timestamp':'Recorded timestamp',
 'comparison.meta.date':'Date meaning',
 'comparison.note':'Comparisons evaluate exact declared values and source scope, not the truth of either claim. The conflict example is hypothetical and unrelated to original lesson footage.',
 'transcript.follow':'Follow the source cue',
 'transcript.search':'Search synthetic transcript',
 'transcript.placeholder':'Search cue wording',
 'review.confirm':'Confirm local save',
 'review.cancel':'Cancel',
 'review.section':'04 / YOUR REVIEW',
 'review.title':'Keep a reviewable reference.',
 'review.body':'Preview the synthetic timing receipt before saving it in this browser. No account, server write or factual verification is involved.',
 'review.preview':'Preview synthetic review card',
 'peer.run':'Run scripted peer test'
});
const NE=Object.freeze({
 'language.label':'भाषा',
 'language.en':'English',
 'language.ne':'नेपाली (मस्यौदा)',
 'language.review':'नेपाली प्राविधिक शब्दावली मानव समीक्षा हुन बाँकी कार्यशील मस्यौदा हो।',
 'stage':'स्थानीय विकास नमुना',
 'hero.eyebrow':'पाठको एउटा क्षण। तपाईंले जाँच्न सक्ने स्रोत।',
 'hero.title':'क्षण पत्ता लगाउनुहोस्। प्रमाण सुरक्षित राख्नुहोस्।',
 'hero.title.primary':'क्षण पत्ता लगाउनुहोस्।',
 'hero.title.secondary':'प्रमाण सुरक्षित राख्नुहोस्।',
 'hero.intro':'पाठका ठीक शब्दहरूलाई समीक्षा गर्न सकिने अभिलेखसँग जोड्नुहोस्। उत्तर प्रयोग गर्नुअघि त्यो कहाँबाट आएको हो जाँच्नुहोस्।',
 'notice.title':'कृत्रिम उदाहरण',
 'notice.body':'लाइभ एजेन्ट वा मौलिक पाठको भिडियो जोडिएको छैन। यो उदाहरणले स्रोतको आपसी मिलान देखाउँछ, तथ्य प्रमाणित गर्दैन।',
 'journey.find.title':'१ · स्रोत फेला पार्नुहोस्',
 'journey.find.body':'ठ्याक्कै शब्दबाट सुरु गर्नुहोस्। मोडेल कल आवश्यक छैन।',
 'journey.compare.title':'२ · प्रमाण तुलना गर्नुहोस्',
 'journey.compare.body':'नभएको वा बाझिएको स्रोतलाई छुट्टाछुट्टै देखाइराख्नुहोस्।',
 'journey.keep.title':'३ · समीक्षा गरिएको सन्दर्भ राख्नुहोस्',
 'journey.keep.body':'केही सुरक्षित गर्नुअघि ठ्याक्कै receipt पूर्वावलोकन गर्नुहोस्।',
 'journey.note':'खाता चाहिँदैन · व्यक्तिगत API key चाहिँदैन · तपाईंले उपलब्धता जाँच नगरेसम्म वैकल्पिक inference बन्द रहन्छ।',
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
 'evidence.body':'रसीद जाँच्न ट्रान्सक्रिप्ट क्यु छान्नुहोस्, वा तलको उदाहरण चलाउनुहोस्।',
 'evidence.check':'उदाहरण जाँच्नुहोस्',
 'evidence.alter':'परिवर्तित उद्धरण परीक्षण गर्नुहोस्',
 'comparison.section':'०३ / स्रोत तुलना',
 'comparison.title':'स्रोतबीचको अनिश्चितता जोगाइराख्नुहोस्।',
 'comparison.body':'उपलब्ध कृत्रिम टाइमिङ क्युलाई नभएको लिखित गाइड प्रमाणसँग छुट्टाछुट्टै हेर्नुहोस्। अलग काल्पनिक विवादले असहमति कसरी अनिर्णीत राखिन्छ भन्ने देखाउँछ।',
 'comparison.inspect':'उपलब्ध प्रमाण जाँच्नुहोस्',
 'comparison.conflict':'कृत्रिम विवाद देखाउनुहोस्',
 'comparison.video':'भिडियोतर्फको स्रोत',
 'comparison.guide':'लिखित गाइडतर्फको स्रोत',
 'comparison.missing':'समीक्षा गरिएको स्रोत उद्धरण वा provenance जोडिएको छैन।',
 'comparison.meta.source':'स्रोत',
 'comparison.meta.version':'संस्करण',
 'comparison.meta.scope':'दायरा',
 'comparison.meta.claim':'दाबी कुञ्जी',
 'comparison.meta.value':'संरचित मान',
 'comparison.meta.provenance':'Provenance',
 'comparison.meta.timestamp':'अभिलेख समय',
 'comparison.meta.date':'मितिको अर्थ',
 'comparison.note':'तुलनाले घोषित मान र स्रोत दायरा जाँच्छ; कुनै दाबीको सत्यता प्रमाणित गर्दैन। विवादको उदाहरण काल्पनिक हो र मौलिक पाठको भिडियोसँग सम्बन्धित छैन।',
 'transcript.follow':'स्रोत क्यु पछ्याउनुहोस्',
 'transcript.search':'कृत्रिम ट्रान्सक्रिप्ट खोज्नुहोस्',
 'transcript.placeholder':'क्युका शब्द खोज्नुहोस्',
 'review.confirm':'स्थानीय रूपमा राख्ने पुष्टि गर्नुहोस्',
 'review.cancel':'रद्द गर्नुहोस्',
 'review.section':'०४ / तपाईंको समीक्षा',
 'review.title':'पुनः जाँच्न सकिने सन्दर्भ राख्नुहोस्।',
 'review.body':'यो ब्राउजरमा राख्नुअघि कृत्रिम टाइमिङ रसीदको पूर्वावलोकन गर्नुहोस्। खाता, सर्भर लेखाइ वा तथ्य प्रमाणीकरण हुँदैन।',
 'review.preview':'कृत्रिम समीक्षा कार्ड पूर्वावलोकन गर्नुहोस्',
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
export function applyLocale(root,locale='en'){
 if(!root||typeof root.querySelectorAll!=='function')throw new TypeError('Localization root is required.');
 const resolved=localeCatalog[locale]?locale:'en';
 for(const node of root.querySelectorAll('[data-i18n]')){
  const key=node.getAttribute('data-i18n');
  node.textContent=translate(key,resolved);
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
