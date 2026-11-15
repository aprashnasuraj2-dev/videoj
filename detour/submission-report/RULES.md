# Rules and eligibility

**Public rules snapshot:** 2026-11-15, [Contra challenge guidelines](https://contra.com/community/topic/videojsskinschallenge/guidelines). Deadline shown: Nov 16, 2026 at 11:59 pm PST, equivalent to Nov 17 at 1:44 pm Nepal time. Eligibility for a second entry, any entrant-specific limits, and final form fields are open. A public post by an entrant with multiple projects does not settle eligibility. Check the current joined form and linked terms, or obtain a direct clarification if necessary. See steps 002 and 091.

| Public requirement | Evidence to collect |
| --- | --- |
| Working public URL, actual Video.js v10, real playable video, no sign-in | 041, 051, 092: locked build version, anonymous smoke and playback advance |
| Play/pause, seek bar, time, volume/mute, fullscreen | 058, 093: exact public build, working touch and keyboard controls |
| Desktop/mobile usability and keyboard navigation, including leaving menus | 061–065, 070, 093: layout, touch, focus and keyboard results |
| Visual and short description | 082, 087, 089, 097: authentic player capture and viewer-facing rationale |
| Apache License 2.0 for the entry | 079, 094–095: license, notices where applicable and separate asset rights |
| Optional +1 Mux | 075–077, 097: public playback ID, real playback and availability through judging |
| Optional +1 genuine live-site use | 078, 097: actual public website using the same skin to play video |

Official judging is 10 for visual design and originality, 5 for usability and interaction, 5 for accessibility, and 5 for execution and polish, plus the two independent optional points. Internal concept ranking is separate. Record changed rules or a dated eligibility finding here, with the source, scope and effect on the entry.

## 2026-11-15 second-entry recheck

The live public Guidelines were retrieved again. They set requirements for each submission, but did not specify a per-entrant cap or a second-entry provision. The open feed includes a [DHAGO entry by the entrant](https://contra.com/community/aTY2mcaJ-dhago-a-woven-videojs-player-for), so this specific eligibility question matters. The account-specific joined form and any additional terms remain unverified. The entrant owns that check or a direct clarification from Contra. Step 002 stays unchecked and reopens before step 091; prototype work is independent.

## 2026-11-15 authenticated challenge-state recheck

An authenticated Contra connector session successfully retrieved the active Video.js Skins Design Challenge. Challenge-level data reports `submissionsEnabled: true` and deadline **2026-11-17T07:59:00Z** (Nov 17, 13:44 Nepal time). The live public requirements remain consistent with this register: public Video.js v10 URL, real video, visual + short rationale, five essential controls, responsiveness, keyboard operation, Apache-2.0, and the two optional bonus paths.

The connector action is explicitly a **public challenge-details** surface. It does not return the signed-in entrant's joined-form field schema, participation state, or a per-account rule allowing multiple submissions. The returned public header label “Join to submit!” is therefore not treated as proof that this account is unjoined, nor as permission for a second entry. Public guidelines still contain no explicit per-entrant cap. Steps 002/091 remain blocked on the actual joined form or direct Contra clarification.

## 2026-11-15 final Phase 10 eligibility recheck

The active challenge was re-read after the judging candidate and bonus URLs were frozen. The challenge still reports `submissionsEnabled: true`, deadline **2026-11-17T07:59:00Z**, **1,097 participants** and **253 submissions**. Those counts establish challenge activity only; they do not establish a per-entrant allowance.

No public field now resolves the open DETOUR question:

- the guidelines still do not state that one participant may submit multiple distinct skins;
- the connector's challenge payload exposes no signed-in entrant submission list or joined-form field schema;
- `submissionInstructions` is null and `termsAndConditionsUrl` is null in the public challenge record;
- the public web surface does not expose readable joined-form fields or upload limits outside the signed-in flow.

That public challenge payload alone did not resolve second-entry eligibility. A subsequent check of Contra's **official Help Center** did: see the current rule below. The remaining step 091 gap is the signed-in form schema and acceptance state, not permission to submit a second unique entry.

## 2026-11-15 official Contra multiple-submission rule

**Source:** Contra Help Center, [Challenges on Contra: A new way to earn](https://help.contra.com/en/articles/11647374-challenges-on-contra-a-new-way-to-earn), published 2026-04-06 and rechecked 2026-11-15.

Contra's FAQ directly answers **“Can I submit more than once to a challenge?”** in the affirmative, with the condition that submissions be **unique** and meet the challenge criteria. The same article says challenges are open to Contra independents unless noted otherwise.

This is direct platform-level evidence for DETOUR's second-entry permission. The active Video.js challenge guidelines show no exception or per-participant cap, and DETOUR's separation from DHAGO is already verified in steps 009/020. **Step 002 is therefore verified.**

This does **not** complete step 091. The public challenge record still does not expose the signed-in submission form's exact field names, required/optional flags, upload/media limits or whether the prepared DETOUR payload is accepted by those fields. Those facts remain owner/account-visible evidence to capture from the current joined form before 096/097/099.

