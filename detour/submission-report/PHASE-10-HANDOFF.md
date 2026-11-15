# Phase 10 — verification, rehearsal and owner handoff

**Prepared:** 2026-11-16  
**Final handoff head:** `11e00e6d4a2c2708eda4ce172d43ea81ec007571`  
**Promoted public runtime:** `d430f2ee49fa93a460c150fd90205b13fe5327be` / `detour-dist-d430f2ee49fa`  
**Preferred competition demo:** https://detour-entry.aafnaipatro.com/mux/  
**Redundant older single-place mirror:** https://detour.aafnaipatro.com/mux/  
**Live-site bonus:** https://aafnaipatro.com/on-this-day/video/apollo-11/  
**Independent rollback:** https://detour-backup.aafnaipatro.com/  
**Runtime validation:** run **43770989069**  
**Final exact-head validation:** run **43772874561**  
**Final evidence capture:** run **43772874624**

The public competition route serves checkpoint runtime `d430f2ee…`. Later handoff/evidence commits do not change the reusable implementation: direct compare `d430f2ee… → 11e00e6d…` contains **zero `detour/skin/*` changes**.

## Accepted verification

| Gate | Observed result |
| --- | --- |
| Public release — 092 | Preferred branded route serves Video.js v10 + real Mux media/captions. Public-edge proof saved **C1–C4** at ~42/30/18/08, returned **15 → 42.35s** through C1 with all four retained, removed only C2, then cleared all. |
| Controls — 093 | Play/pause, seek/time, mute, fullscreen and settings remained functional across desktop and compact browser probes. Touch-browser evidence is not physical-phone evidence. |
| Audit — 094 | Apache-2.0, media provenance, dependency/license, credential and package-boundary checks passed the final exact-head validation. |
| Reuse — 095 | Exact package was installed in a fresh external host with replacement media/captions and exercised across Chromium, Firefox and desktop WebKit. Default single-place and opt-in C1–C4 modes both remain supported. |
| Exact reusable package | Run **43772874561**, artifact **14184304470**, wrapper digest `sha256:172d3770f722e93b05298b3d1f2b9d98ccdc831145a2da5208805b2aaa600c10`; exact `.tgz` SHA-256 `fbcffda21a0d4adc3f12fb265f8ac94f53bf0a4a3b222940e4290bde8fa2b999`, 15 files. |
| Final authentic evidence | Run **43772874624**, artifact **14184539322**, wrapper digest `sha256:2281c1083ff62fcdbb9e207a9e0709fb02d35247e06287ca3469694c78dafcc5`; raw browser interaction **6.28s, 960×720 VP8**. |
| Canonical owner pack | `DETOUR_COMPETITION_MASTERPACK_v4.zip`, **617,835 B**, SHA-256 `6f036b80834a5cdcb68c6e43eae4d65f7cd88f54854a21b498f049638683dc54`; ZIP integrity passed. |
| Live-site bonus | Aafnai Patro Apollo 11 page is a separate editorial use of the reusable skin, not the contest demo. |

No NVDA/VoiceOver session, physical-phone session or native browser 200% zoom session is being claimed.

## Official rubric rehearsal — internal estimate only

Official public scoring is 10 visual design/originality, 5 usability/interaction, 5 accessibility and 5 execution/polish, with separate +1 Mux and +1 genuine-live-site bonuses. The numbers below are **internal pre-submission estimates, not judge scores**.

| Category | Internal estimate | Evidence basis | Main deduction / counterexample |
| --- | ---: | --- | --- |
| Visual design + originality | **8.5 / 10** | Graphite/lime identity; white current playhead vs bounded C1–C4 checkpoints; hover/focus time disclosure; authentic public hero/detail/compact/alternate captures; no DHAGO textile language | A judge who values cinematic media spectacle over control-system identity could score lower; fresh-human 090 has not yet confirmed two-second recognition |
| Usability + interaction | **4.5 / 5** | Familiar seek bar preserved; up to four rail-native checkpoints; dedupe; persistent Return; individual Delete/Backspace and Clear; five-control keyboard/touch-shaped gate; recovery and race handling | Physical iOS/Android drag/pointer-cancel testing remains open under 062 |
| Accessibility | **3.5 / 5** | Keyboard path, focus restoration, captions, forced colors, reduced motion, RTL/long copy and semantic time/state coverage | No recorded NVDA/VoiceOver session and no native 200% browser-zoom session; DOM semantics are not a substitute for AT evidence |
| Execution + polish | **4.8 / 5** | Exact public Mux + independent rollback; Chromium/Firefox/WebKit; package reuse; secret/license audit; deterministic evidence; recovery/fallback | Service continuity through judging still depends on operator retention; physical-device evidence is intentionally not claimed |
| **Base estimate** | **21.3 / 25** | Internal arithmetic only | Could move materially if fresh-human discoverability or AT testing reveals a blocker |
| Mux bonus | **+1** | Public Playback ID and exact public playback independently verified | Claim only if the current form exposes/accepts this bonus |
| Genuine live-site bonus | **+1** | `https://aafnaipatro.com/on-this-day/video/apollo-11/` is a genuine Aafnai Patro On This Day editorial page using the reusable skin on different NASA historical media | Keep the editorial route live; never present the Mux contest demo itself as this bonus |
| **Internal total including both bonuses** | **23.3 / 27** | Not an official prediction | Signed-in form constraints and human/device/AT gates remain open, so this is not a submission-readiness score |

**Thesis-flip variable:** if a fresh uncoached reviewer cannot infer the C1–C4 checkpoint/Return behavior quickly, both originality communication and usability should be discounted; if the current signed-in form imposes an unmet required field or media limit, the payload must be adapted before submission.

### Must-fix / must-confirm before submission

1. **091 — blocking:** second-entry permission is resolved by Contra's official Help Center FAQ. The remaining gate is the current signed-in form: record exact required/optional fields, media/file limits and whether the prepared DETOUR payload is accepted.
2. **090 — human evidence:** run the fresh uncoached judging pass; do not substitute the author or automated browser.
3. **097 — form binding:** map the prepared content below to the actual current field names, upload/link limits and accepted media types.
4. **099 — owner action:** entrant accepts terms and submits; automation must not do this without the owner action.
5. **Accessibility truth:** 062/064/065 remain score-risk disclosures, not fabricated passes.

Because 091 is still open, checklist step 096 remains unchecked even though this rehearsal exists: its pass condition requires all eligibility gates to pass.


## Current form confirmation — exact next owner action for 091

Contra's official Help Center now resolves the multiple-submission question: more than one unique submission is allowed when each meets the challenge criteria. Do not spend the remaining window re-asking that generic question unless the challenge form shows a contradictory challenge-specific rule.

Open the signed-in joined form and record: exact field labels; which are required vs optional; accepted image/video types and size/count limits; URL validation behavior; the Mux Playback ID field; the genuine live-site bonus field; and whether the prepared DETOUR values are accepted without truncation or validation errors. If any challenge-specific form rule conflicts with the official Help Center, capture it and ask Contra only about that conflict.

Record the form evidence in `RULES.md` before checking 091.

## Provisional form payload

This is the content packet to bind to the **actual live form** after 091. Field labels and limits are intentionally not invented.

**Entry name**  
DETOUR — Keep your place

**Playable public URL — preferred**  
https://detour-entry.aafnaipatro.com/mux/\n\n**Redundant mirror**  \nhttps://detour.aafnaipatro.com/mux/

**One-line hook**  
A seek bar that remembers.

**Short rationale**  
Most seek bars remember one thing: where you are now. DETOUR lets viewers keep **up to four places on the same familiar rail**. Each lime C1–C4 bracket stays anchored while the white playhead explores elsewhere; hover/focus reveals its timestamp and click/tap returns without consuming the checkpoint. Near-identical saves deduplicate, checkpoints survive unrelated seeks, and viewers can remove one or clear them all. The behavior is source-scoped and media-agnostic—no chapters, transcript, thumbnails or specially authored footage are required. The reusable package still defaults to the original single-place Return/Stay flow, so multi-place behavior is an opt-in capability rather than a showcase-only rewrite.

**Preferred primary visual**  
`hero-1280-checkpoints.png` — 1248×806, 85,773 B, direct browser screenshot from the promoted public route; SHA-256 `039b00f0104433c673dca18e8a41bb11fc477c79759a793b3c2bc308a785cb20`. C1–C4 are visible on the same seek rail, the white playhead is at 00:15, and hovered C1 expands to `C1 00:42 ↩`.

**Primary visual alt text**  
“DETOUR video player with four lime checkpoints C1 through C4 saved across the seek rail; the white playhead is exploring near 00:15 while focused C1 reveals its saved time near 00:42.”

**Primary visual provenance**  
Direct browser capture; no checkpoint, playhead, time, label or control is composited afterward. Final evidence artifact `14184539322`, ZIP digest `sha256:2281c1083ff62fcdbb9e207a9e0709fb02d35247e06287ca3469694c78dafcc5`.

**Preferred optional video, if accepted**  
`DETOUR_CHECKPOINT_DEMO.mp4` — 6.28s, 960×720 H.264, no audio; SHA-256 `9ec5ecdf0acac2cdc5fae4db81a13da6941834af04a9a34d96a853a7e571e32e`. This is a format transcode of the authentic browser recording only: save C1 and C2, explore elsewhere, return through C1, and leave both checkpoints available.

**Raw interaction proof**  
`interaction-960x720.webm` — 6.28s, 960×720 VP8, no audio; SHA-256 `448b50908f3b81f7a5ca823d53eeb9ebdcd95bbe5e0b156790df3de044938151`. Final metadata records `returnedSeconds: 42` and `persistentCheckpoints: 2`.

**Exact reusable package**  
`detour-video-skin-0.1.0.tgz` — SHA-256 `fbcffda21a0d4adc3f12fb265f8ac94f53bf0a4a3b222940e4290bde8fa2b999`; artifact **14184304470** from successful final-head run **43772874561**. The implementation matches the promoted runtime because `d430f2ee… → 11e00e6d…` contains no `detour/skin/*` changes.

**Mux bonus evidence**  
Playback ID: `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`  
The preferred public URL plays the same Mux-hosted rendition on the checkpoint release Worker. Public-edge verification proved C1–C4 at 42/30/18/08, duplicate suppression, 15→42.35 Return with all four checkpoints retained, focus surviving a forced render, and C2-only Delete. The older branded route is retained as a single-place mirror, not as separate bonus evidence.

**Genuine live-site bonus**  
https://aafnaipatro.com/on-this-day/video/apollo-11/  
This is a separate Aafnai Patro **On This Day** editorial history page. It uses the reusable skin with a NASA Apollo 11 landing-site visualization, not the submission showcase media. For resilient judging delivery that NASA source is ingested into a second Mux asset (`kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`) and proxied behind the Aafnai Patro media URL. Cloudflare Browser Rendering proved Hold at 12s → seek to 2s → Return to 12.000s.

**URL-role rule**  
- Submit/playable demo — preferred: https://detour-entry.aafnaipatro.com/mux/\n- Redundant competition mirror: https://detour.aafnaipatro.com/mux/\n- Independent rollback: https://detour-backup.aafnaipatro.com/\n- Live-site bonus: https://aafnaipatro.com/on-this-day/video/apollo-11/
- **Never use one URL as evidence for the other role.**


**Owner master pack**  
`DETOUR_COMPETITION_MASTERPACK_v4.zip` — **617,835 B**, SHA-256 `6f036b80834a5cdcb68c6e43eae4d65f7cd88f54854a21b498f049638683dc54`. It contains final submit assets, the exact final-head validated reusable tarball, supporting evidence, route/provenance material and content checksums.

**License statement, if requested**  
Entry source is licensed under Apache License 2.0. Showcase media is project-authored procedural material with separate provenance recorded in `RIGHTS.md`.

Do not add repository/process/CI links to the judge-facing creative description unless the live form explicitly requires a source/evidence field. The preferred visual and judge reel are presentation assets derived from authentic browser evidence; keep the raw hero and raw interaction recording as non-composited fallbacks. Step 097 stays unchecked until the actual form fields and constraints are confirmed.


## Redundant public entry route after owner-network incident

The owner reported the primary hostname as unavailable from one local network on 2026-11-16. External verification showed the frozen player and Mux media remained healthy, so the known-good runtime was **not redeployed**.

- Preferred submission route: `https://detour-entry.aafnaipatro.com/mux/`\n- Redundant branded mirror: `https://detour.aafnaipatro.com/mux/`
- Independent rollback: `https://detour-backup.aafnaipatro.com/`

The preferred `detour-entry` route now serves accepted multi-checkpoint runtime `d430f2ee49fa…` from isolated Worker `detour-checkpoints-release`. The older `detour.aafnaipatro.com` hostname intentionally remains on the previous single-place `a3b43f74…` Worker as a compatibility mirror. Public-edge proof on `detour-entry` completed four saves, dedupe, Return and individual Delete with no media error. Do not present the mirror as separate bonus evidence.

## 098 freeze and rollback

- **Preferred primary:** `https://detour-entry.aafnaipatro.com/mux/`\n- **Redundant mirror:** `https://detour.aafnaipatro.com/mux/`
- **Primary runtime authority:** `d430f2ee49fa93a460c150fd90205b13fe5327be` / `detour-dist-d430f2ee49fa`
- **Mux Playback ID:** `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`
- **Same-Worker backup:** `/showcase/detour-showcase-v1.mp4`, SHA-256 `fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1`
- **Independent rollback:** `https://detour-backup.aafnaipatro.com/` / `detour-dist-50ac9661e315`
- **Recovery owner:** repository/challenge operator retains both Workers, Mux asset and private R2 objects through judging.
- **Requalification:** full run 43770989069 accepted the checkpoint runtime; Mux run 43771166704 accepted the strengthened checkpoint behavior proof; post-promotion Cloudflare Browser Rendering verified the exact `detour-entry` edge route.
- **Judging-route boundary:** the public `/mux/` HTML exposes only the audience-facing DETOUR heading, recovery controls and player mount; it has no links to internal test, report or integration surfaces.
- **Rollback mechanism:** first switch judges to unchanged single-place mirror `https://detour.aafnaipatro.com/mux/`; if Mux itself degrades, use independent `https://detour-backup.aafnaipatro.com/`. Do not mutate the accepted package or introduce an untested media source.

Any subsequent change to `detour/skin/`, the public media, Mux Playback ID, captions, Worker route or rollback requires the corresponding public verification gate again.

## Remaining human/account gates

- **090:** fresh uncoached reviewer.
- **091:** current signed-in joined-form field/limit/acceptance evidence. Multiple-submission eligibility is already resolved by official Contra guidance.
- **096:** promote the rubric rehearsal only after 091 and required minimums are confirmed.
- **097:** bind this content packet to the actual live fields after 091.
- **099:** owner/entrant submission and receipt capture.
- **100:** open the accepted listing, repeat one seek→Return and verify any claimed bonus URL after submission.
