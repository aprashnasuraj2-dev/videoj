# SUTRA Nepali terminology human-review queue — 2026-11-24

**Status:** prepared for human review; this file is not evidence that review occurred.

The learner currently exposes a machine-authored Nepali draft. English is canonical until a reviewer signs off. Review the terms below in the actual interface, not in isolation, because several words change meaning with context.

| Concept / current English | Current draft treatment | Main ambiguity to review | Preferred review question |
| --- | --- | --- | --- |
| evidence | प्रमाण | Can imply proof/truth rather than inspectable supporting material | Does the Nepali wording avoid implying factual proof? |
| source | स्रोत | Generally clear, but source identity vs origin can blur | Is one term adequate for document/media source and network origin? |
| source consistency | स्रोतको आपसी मिलान | Must not imply truth or correctness | Does it clearly mean reference consistency only? |
| factual verification | तथ्य प्रमाणीकरण | Could sound like formal certification | Is “तथ्य जाँच” clearer for learners? |
| cue | क्यु | Transliteration is compact but unfamiliar to some users | Keep “क्यु”, or use a short explanatory phrase? |
| transcript | ट्रान्सक्रिप्ट | Common technical borrowing | Is a Nepali explanatory label needed on first use? |
| seek | seek / टाइमिङ क्यु जाँच | Current lesson text mixes English | Should controls say “समयमा जानुहोस्” or retain “seek”? |
| provenance | Provenance | Intentionally left English in draft | Is there a concise Nepali equivalent that does not overclaim authenticity? |
| scope | दायरा | Could mean range rather than claim applicability | Is “लागू हुने दायरा” clearer? |
| peer | peer | Technical term intentionally retained | Should first use explain “बाह्य peer network”? |
| network | network | Kept technical in diagnostics | Is “नेटवर्क” acceptable for learner-facing copy? |
| manifest | Manifest | Diagnostics currently English | If localized later, what term avoids confusion with generic सूची? |
| graph | graph | Diagnostics currently English | Should remain a developer term only? |
| consent | अनुमति / approval wording | Permission vs informed consent nuance | Is “अनुमति” sufficient for an external network request? |
| denied | अस्वीकार / रोकेको अर्थ | Must be clear that no completed external result exists | Which wording best distinguishes denial from technical failure? |
| partial failure | currently English diagnostic | Some approved reads completed, no result completed | Nepali wording must preserve “some contact happened” nuance |
| unknown outcome | currently English diagnostic | A side effect may have happened | Nepali wording must discourage automatic retry |
| review card | समीक्षा कार्ड | “समीक्षा” can suggest expert review | Should this be “जाँच सन्दर्भ कार्ड” instead? |
| local save | स्थानीय रूपमा राख्ने | Must be clear it is browser-local | Does this clearly distinguish browser storage from account/server storage? |
| synthetic | कृत्रिम | Can sound “fake” rather than controlled test fixture | Is “परीक्षणका लागि कृत्रिम” clearer? |
| fixture | नमुना | “नमुना” may imply example rather than deterministic test data | Is this acceptable for learner-facing text? |
| version | संस्करण | Clear but potentially formal | Keep as-is? |
| model / tool / router | currently mostly English diagnostics | Avoid misleading nontechnical learners | Should these remain inspector-only English terms? |

## Review procedure

1. Open the learner at desktop width and at <=360 CSS px.
2. Switch to Nepali and complete the local evidence -> timing media -> comparison -> review-card path.
3. For every phrase above, judge **meaning first**, then naturalness. Do not improve style if it weakens the truth/consent boundary.
4. Confirm source quotations, source IDs, provenance values, structured claim values and canonical timestamps are not silently translated.
5. Mark each term: **accept**, **replace**, or **needs context note**.
6. Record reviewer name/role, date, exact code SHA and final wording changes before P048-03 can be verified.
7. Re-run the English fallback and locale-switch browser tests after any wording change.

## Non-negotiable semantic boundaries

- “consistent” must never become “true/correct”;
- “approved contact” must never become “trusted source”;
- “synthetic” must remain visibly non-production/non-factual;
- “partial” must state that some external read occurred;
- “unknown” must not imply safe retry;
- local browser save must not sound like account/cloud persistence.

Until this review is completed, the UI must continue to label Nepali as a draft.
