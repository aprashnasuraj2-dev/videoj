# Phase 10 — verification, rehearsal and owner handoff

**Prepared:** 2026-11-15  
**Verification head:** `b9b1495f4f66422dfa369cafcad2738fff6b4592`  
**Accepted public runtime:** `a3b43f74c7652c707c3703193ab1081820bafa79` / `detour-dist-a3b43f74c765`  
**Preferred competition submission demo:** https://detour-entry.aafnaipatro.com/mux/\n**Redundant competition mirror:** https://detour.aafnaipatro.com/mux/
**Public-host privacy:** use this branded hostname only; do not expose any account-level `workers.dev` hostname.
**Independent live-site bonus URL:** https://aafnaipatro.com/on-this-day/video/apollo-11/  
**Independent rollback:** https://detour-backup.aafnaipatro.com/  
**Exact verification:** [Validate DETOUR run 43713525858](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43713525858)

The verification head is later than the deployed runtime because Phase 10 added tests, audits, package documentation and release metadata. A direct compare from `a3b43f7` to `b9b1495` contains no `detour/skin/` change. The correct release claim is therefore the deployed `a3b43f7` runtime re-qualified by the later verification harness, not a fictitious redeploy of test-only commits.

## Accepted verification

| Gate | Observed result |
| --- | --- |
| Exact public release — 092 | Signed-out HTTPS 200; source/dist headers match; @videojs/html **10.4.0**; real Mux media and captions; **42.35 → 18 → 42.350s** Return; independent backup **206 / 1,024 B** |
| Mandatory controls — 093 | Desktop keyboard exercised play/pause, seek/time, mute, fullscreen entry/exit and Settings→Escape; 375×667 touch-enabled Chromium exercised the five required controls; bright alternate media retained all five |
| Final audit — 094 | Apache-2.0 entry, project-authored media provenance and permissive production dependency licenses verified; **69 emitted text files** scanned for management credential/API hooks; **15-file** package boundary dry-run passed |
| Reuse — 095 | Packed tarball installed into a fresh external host with replacement media/captions; Return landed at **42.350s** in Chromium, Firefox and desktop WebKit |
| Reusable artifact | **14161323994**; ZIP digest `sha256:1077a7f45a101090985f065e6e57b3d2899cc2dedd9d8e93ccbc94f7c3b4c304`; tarball **16,417 B**, SHA-256 `6c3680164f42bf582fe739b0e82af73826d35aea9a3f2ae8558c90cd6d6ad5cc`, **15 files** |
| Verification dist artifact | **14161094736**; ZIP digest `sha256:76282311a905aed6d325d2adfa04b73844360b7b13042648ab071470381ab3bc` |
| Aafnai Patro live-site bonus | `https://aafnaipatro.com/on-this-day/video/apollo-11/`; distinct On This Day editorial page, NASA Apollo 11 media delivered through separate editorial Mux Playback ID `kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`; Cloudflare proof on ~47s source and 12→2→12.000s Return. It is **not** the competition demo. |

The 375×667 run is browser touch emulation. It does not close physical-device step 062. No NVDA/VoiceOver session has been recorded, and native browser 200% zoom remains separate from the CSS-layout zoom probe.

## Official rubric rehearsal — internal estimate only

Official public scoring is 10 visual design/originality, 5 usability/interaction, 5 accessibility and 5 execution/polish, with separate +1 Mux and +1 genuine-live-site bonuses. The numbers below are **internal pre-submission estimates, not judge scores**.

| Category | Internal estimate | Evidence basis | Main deduction / counterexample |
| --- | ---: | --- | --- |
| Visual design + originality | **8.5 / 10** | Player-only graphite/lime identity; distinct current playhead vs held bracket; explicit Return ticket; authentic hero/detail/compact/alternate captures; no DHAGO textile language | A judge who values cinematic media spectacle over control-system identity could score lower; fresh-human 090 has not yet confirmed two-second recognition |
| Usability + interaction | **4.5 / 5** | Familiar seek bar preserved; Hold→multiple seeks→Return and Stay; exact deployed five-control keyboard/touch-shaped gate; recovery and race handling | Physical iOS/Android drag/pointer-cancel testing remains open under 062 |
| Accessibility | **3.5 / 5** | Keyboard path, focus restoration, captions, forced colors, reduced motion, RTL/long copy and semantic time/state coverage | No recorded NVDA/VoiceOver session and no native 200% browser-zoom session; DOM semantics are not a substitute for AT evidence |
| Execution + polish | **4.8 / 5** | Exact public Mux + independent rollback; Chromium/Firefox/WebKit; package reuse; secret/license audit; deterministic evidence; recovery/fallback | Service continuity through judging still depends on operator retention; physical-device evidence is intentionally not claimed |
| **Base estimate** | **21.3 / 25** | Internal arithmetic only | Could move materially if fresh-human discoverability or AT testing reveals a blocker |
| Mux bonus | **+1** | Public Playback ID and exact public playback independently verified | Claim only if the current form exposes/accepts this bonus |
| Genuine live-site bonus | **+1** | `https://aafnaipatro.com/on-this-day/video/apollo-11/` is a genuine Aafnai Patro On This Day editorial page using the reusable skin on different NASA historical media | Keep the editorial route live; never present the Mux contest demo itself as this bonus |
| **Internal total including both bonuses** | **23.3 / 27** | Not an official prediction | Eligibility is unresolved, so this is not a submission-readiness score |

**Thesis-flip variable:** if a fresh uncoached reviewer cannot infer the held-origin/Return behavior quickly, both originality communication and usability should be discounted; if the current signed-in form imposes an unmet required field or media limit, the payload must be adapted before submission.

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
Use the new public checkpoint capture from the final requalification artifact: **C1–C4 visible on the same seek rail with C1 focused at 00:42 and the white playhead exploring near 00:15**. The earlier single-point proof board is fallback evidence only.

**Primary visual alt text**  
“DETOUR video player with four lime checkpoints C1 through C4 saved across the seek rail; the white playhead is exploring near 00:15 while focused C1 reveals its saved time near 00:42.”

**Raw player hero fallback**  
`hero-1280-held.png` — 1248×806, direct browser screenshot, SHA-256 `eb03e909bbd7521535fa384edf8fe3317f5f561c0da139d9fd3198900a7bf2a5`.

**Preferred optional video, if accepted**  
Regenerate the judge reel from the final public checkpoint runtime: save C1–C4, explore elsewhere, return through C1, then remove C2. Do not lead with the earlier single-point reel; retain it only as historical fallback evidence.

**Raw interaction proof**  
`interaction-960x720.webm` — 6.08s, 960×720, VP8, no audio; SHA-256 `6a95a6edc00ea6a03e83f8e64ee0a44b2038001f9e8844b64d075bccfe766f7f`

**Mux bonus evidence**  
Playback ID: `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`  
The preferred public URL plays the same Mux-hosted rendition on the checkpoint release Worker. Public-edge verification proved C1–C4 at 42/30/18/08, duplicate suppression, 15→42.35 Return with all four checkpoints retained, focus surviving a forced render, and C2-only Delete. The older branded route is retained as a single-place mirror, not as separate bonus evidence.

**Genuine live-site bonus**  
https://aafnaipatro.com/on-this-day/video/apollo-11/  
This is a separate Aafnai Patro **On This Day** editorial history page. It uses the reusable skin with a NASA Apollo 11 landing-site visualization, not the submission showcase media. For resilient judging delivery that NASA source is ingested into a second Mux asset (`kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`) and proxied behind the Aafnai Patro media URL. Cloudflare Browser Rendering proved Hold at 12s → seek to 2s → Return to 12.000s.

**URL-role rule**  
- Submit/playable demo — preferred: https://detour-entry.aafnaipatro.com/mux/\n- Redundant competition mirror: https://detour.aafnaipatro.com/mux/\n- Independent rollback: https://detour-backup.aafnaipatro.com/\n- Live-site bonus: https://aafnaipatro.com/on-this-day/video/apollo-11/
- **Never use one URL as evidence for the other role.**

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
