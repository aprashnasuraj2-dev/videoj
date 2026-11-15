# Phase 10 — verification, rehearsal and owner handoff

**Prepared:** 2026-11-15  
**Verification head:** `b9b1495f4f66422dfa369cafcad2738fff6b4592`  
**Accepted public runtime:** `a3b43f74c7652c707c3703193ab1081820bafa79` / `detour-dist-a3b43f74c765`  
**Competition submission demo:** https://detour.aafnaipatro.com/mux/
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

**Thesis-flip variable:** if a fresh uncoached reviewer cannot infer the held-origin/Return behavior quickly, both originality communication and usability should be discounted; if the live form disallows a second entry, the competition submission path stops regardless of technical score.

### Must-fix / must-confirm before submission

1. **091 / 002 — blocking:** confirm second-entry permission and current joined-form requirements with direct account/form or Contra evidence. An authenticated challenge-state recheck confirms submissions are enabled and the deadline, but the available connector exposes no entrant-specific second-entry/form schema.
2. **090 — human evidence:** run the fresh uncoached judging pass; do not substitute the author or automated browser.
3. **097 — form binding:** map the prepared content below to the actual current field names, upload/link limits and accepted media types.
4. **099 — owner action:** entrant accepts terms and submits; automation must not do this without the owner action.
5. **Accessibility truth:** 062/064/065 remain score-risk disclosures, not fabricated passes.

Because 091 is still open, checklist step 096 remains unchecked even though this rehearsal exists: its pass condition requires all eligibility gates to pass.

## Provisional form payload

This is the content packet to bind to the **actual live form** after 091. Field labels and limits are intentionally not invented.

**Entry name**  
DETOUR — Keep your place

**Playable public URL**  
https://detour.aafnaipatro.com/mux/

**Short rationale**  
DETOUR lets viewers keep a moment, explore another part of a video, and return in one action. The familiar seek bar remains familiar: the white playhead follows the current position while a lime bracket preserves the held point, and the explicit **Return to 00:42** ticket makes the reversible action visible. Because the behavior belongs to the player rather than specially authored footage, the same skin works with a second, different video and caption track without changing the interaction.

**Primary visual**  
`hero-1280-held.png` — 1248×806, 85,734 B, SHA-256 `eb03e909bbd7521535fa384edf8fe3317f5f561c0da139d9fd3198900a7bf2a5`

**Primary visual alt text**  
“DETOUR video player at 00:18 with a lime held-position bracket near 00:42 and a bright Return to 00:42 button.”

**Optional interaction evidence, if the form accepts video**  
`interaction-960x720.webm` — 6.08s, 960×720, VP8, no audio; SHA-256 `6a95a6edc00ea6a03e83f8e64ee0a44b2038001f9e8844b64d075bccfe766f7f`

**Mux bonus evidence**  
Playback ID: `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`  
The primary public URL above plays the Mux-hosted rendition and passed the exact signed-out verification gate.

**Genuine live-site bonus**  
https://aafnaipatro.com/on-this-day/video/apollo-11/  
This is a separate Aafnai Patro **On This Day** editorial history page. It uses the reusable skin with a NASA Apollo 11 landing-site visualization, not the submission showcase media. For resilient judging delivery that NASA source is ingested into a second Mux asset (`kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`) and proxied behind the Aafnai Patro media URL. Cloudflare Browser Rendering proved Hold at 12s → seek to 2s → Return to 12.000s.

**URL-role rule**  
- Submit/playable demo: https://detour.aafnaipatro.com/mux/
- Live-site bonus: https://aafnaipatro.com/on-this-day/video/apollo-11/
- **Never use one URL as evidence for the other role.**

**License statement, if requested**  
Entry source is licensed under Apache License 2.0. Showcase media is project-authored procedural material with separate provenance recorded in `RIGHTS.md`.

Do not add repository/process/CI links to the judge-facing creative description unless the live form explicitly requires a source/evidence field. Step 097 stays unchecked until the actual form fields and constraints are confirmed.

## 098 freeze and rollback

- **Primary:** `https://detour.aafnaipatro.com/mux/`
- **Primary runtime authority:** `a3b43f74c7652c707c3703193ab1081820bafa79` / `detour-dist-a3b43f74c765`
- **Mux Playback ID:** `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`
- **Same-Worker backup:** `/showcase/detour-showcase-v1.mp4`, SHA-256 `fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1`
- **Independent rollback:** `https://detour-backup.aafnaipatro.com/` / `detour-dist-50ac9661e315`
- **Recovery owner:** repository/challenge operator retains both Workers, Mux asset and private R2 objects through judging.
- **Requalification:** run 43713525858 re-tested the primary candidate and the independent rollback after the presentation freeze.
- **Judging-route boundary:** the public `/mux/` HTML exposes only the audience-facing DETOUR heading, recovery controls and player mount; it has no links to internal test, report or integration surfaces.
- **Rollback mechanism:** if Mux availability degrades, use the independently verified `detour-release` URL instead of mutating the known-good package or introducing an untested media source.

Any subsequent change to `detour/skin/`, the public media, Mux Playback ID, captions, Worker route or rollback requires the corresponding public verification gate again.

## Remaining human/account gates

- **090:** fresh uncoached reviewer.
- **091 / 002:** second-entry and current joined-form evidence.
- **096:** promote the rubric rehearsal only after 091 and required minimums are confirmed.
- **097:** bind this content packet to the actual live fields after 091.
- **099:** owner/entrant submission and receipt capture.
- **100:** open the accepted listing, repeat one seek→Return and verify any claimed bonus URL after submission.
