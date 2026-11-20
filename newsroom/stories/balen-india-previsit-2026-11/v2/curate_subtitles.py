"""Proofread Nepali captions. Use native provider word boundaries for timing;
combine one-word flashes and prevent splits inside numerals or clauses."""
from pathlib import Path
import re,json
BASE=Path(__file__).parent;A=BASE/'audio';A.mkdir(exist_ok=True)
C=[
(.589,1.827,'बालेनको भारत भ्रमण।'),
(2.715,5.712,'भेटको तस्बिर होइन,\nनेपालका लागि खुलेका अवसर गनौँ।'),
(6.925,9.20,'भ्रमण नोभेम्बर बाइस र तेइसमा तय छ।'),
(9.20,11.239,'नतिजा अझै आएको छैन।'),
(12.386,13.509,'पहिलो ढोका बिजुली।'),
(14.396,17.336,'दस वर्षमा दस हजार मेगावाट\nनिर्यात गर्ने लक्ष्य छ।'),
(18.216,19.234,'लक्ष्य बिक्री होइन।'),
(20.340,22.73,'प्रसारण क्षमता एघार सयबाट'),
(22.73,25.693,'सोह्र सय पचास मेगावाट\nपुर्‍याउने सहमति भयो।'),
(25.693,27.932,'तर क्षमता बिक्री होइन।'),
(28.369,31.506,'भारतले थप छ सय पन्ध्र मेगावाटको\nस्वीकृति दिएको छ।'),
(32.417,36.143,'बंगलादेशतर्फ थप बीस मेगावाट\nअझै अनुमतिकै प्रतीक्षामा छ।'),
(37.333,38.421,'दोस्रो ढोका आकाश।'),
(39.297,41.994,'भैरहवाको हवाई प्रवेशमार्गमा\nनेपालले निर्णय खोज्छ।'),
(42.029,45.192,'भारतका सुरक्षा सरोकार पनि छन्।'),
(46.334,47.387,'तेस्रो ढोका सहयोग।'),
(48.252,49.305,'रकम मात्रै हेर्ने?'),
(50.184,51.018,'अनुदान कि ऋण?'),
(51.943,53.274,'ब्याज, सर्त र म्याद के?'),
(54.493,56.125,'भ्रमणपछि तीन प्रमाण खोजौँ।'),
(57.013,58.263,'बजारमा नयाँ अनुमति।'),
(59.121,60.348,'हवाई मार्गको निर्णय।'),
(61.203,62.522,'अनि कार्यान्वयनको मिति।'),
(63.674,65.792,'अन्तिम प्रश्न, एउटै अनुमतिका लागि'),
(65.827,67.910,'ढोका कति पटक ढकढक्याउनु पर्छ?'),
(68.832,70.966,'निर्भरता घट्नु नै ठूलो उपलब्धि हो।')
]
def stamp(t):
 n=round(t*1000);h,n=divmod(n,3600000);m,n=divmod(n,60000);s,n=divmod(n,1000);return f'{h:02}:{m:02}:{s:02},{n:03}'
for i,(a,b,t) in enumerate(C):
 assert b-a>=.7,(i,b-a)
 assert b<=72.18 and (i==0 or a>=C[i-1][1]),(i,a,b)
 assert max(len(x) for x in t.split('\n'))<=50,(i,t)
story=json.loads((BASE/'story.json').read_text('utf8'))
words0=' '.join(s['voiceover'] for s in story['scenes']).split()
words1=' '.join(t.replace('\n',' ') for _,_,t in C).split()
assert words0==words1,(len(words0),len(words1),next(((a,b,i) for i,(a,b) in enumerate(zip(words0,words1)) if a!=b),None))
(A/'captions_ne_PROOFREAD.srt').write_text('\n\n'.join(f'{i}\n{stamp(a)} --> {stamp(b)}\n{t}' for i,(a,b,t) in enumerate(C,1))+'\n','utf8')
print('Proofread exact-script cues',len(C),'min display',min(round(b-a,3) for a,b,_ in C))