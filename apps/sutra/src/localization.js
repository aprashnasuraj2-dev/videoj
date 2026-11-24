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
 'comparison.section':'06 / SOURCE COMPARISON',
 'comparison.title':'Preserve uncertainty between sources.',
 'comparison.body':'See the actual synthetic timing cue alongside the missing written-guide evidence. A separate hypothetical conflict demonstrates how disagreement stays unresolved rather than being blended into a confident answer.',
 'review.section':'07 / YOUR REVIEW',
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
 'comparison.section':'०६ / स्रोत तुलना',
 'comparison.title':'स्रोतबीचको अनिश्चितता जोगाइराख्नुहोस्।',
 'comparison.body':'उपलब्ध कृत्रिम टाइमिङ क्युलाई नभएको लिखित गाइड प्रमाणसँग छुट्टाछुट्टै हेर्नुहोस्। अलग काल्पनिक विवादले असहमति कसरी अनिर्णीत राखिन्छ भन्ने देखाउँछ।',
 'review.section':'०७ / तपाईंको समीक्षा',
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
 root.documentElement?.setAttribute?.('lang',resolved);
 return resolved;
}
