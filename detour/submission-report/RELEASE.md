# DETOUR release handoff

**State:** The polished Phase 9 public candidate is frozen and Phase 10 exact-public, mandatory-control, final-audit, reusable-package and rollback checks are verified. Second-entry/current-form eligibility, fresh-human judging review and owner submission remain open.

| Field | Evidence / status |
| --- | --- |
| Public runtime source | `a3b43f74c7652c707c3703193ab1081820bafa79` / immutable `detour-dist-a3b43f74c765` — accepted Phase 9 candidate |
| Phase 10 verification head | `b9b1495f4f66422dfa369cafcad2738fff6b4592` — [Validate DETOUR run 43713525858](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43713525858) green |
| Runtime-drift check | From public source `a3b43f7` to verification head `b9b1495`, no `detour/skin/` runtime file changed; later changes are CI/tests/docs/release metadata |
| Primary public candidate | `https://detour.aafnaipatro.com/mux/` — isolated Worker `detour-mux-release`, no sign-in |
| Qualified Mux playback | Playback ID `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`; public `highest.mp4`; exact showcase content hash |
| Phase 10 public proof | Run 43713525858: HTTPS 200, source/dist headers, @videojs/html 10.4.0, captions, 42.35→18→42.350 Return, desktop keyboard and 375×667 touch-shaped mandatory controls |
| Primary backup | Same Worker, SHA-versioned `/showcase/detour-showcase-v1.mp4`; Phase 10 probe returned **206 / 1,024 B / video/mp4 / Accept-Ranges: bytes** |
| Independent rollback | `https://detour-backup.aafnaipatro.com/` / `detour-dist-50ac9661e315`; run 43713525858 re-ran its signed-out seek/Return gate successfully |
| Media identity | Project-authored 56s `detour-showcase-v1.mp4`, 871,570 B, SHA-256 `fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1` |
| Captions / poster | Same-origin descriptive VTT; Mux thumbnail uses the same public asset at **time=0** |
| Presentation evidence | [Phase 9 manifest](PHASE-9-PRESENTATION.md), evidence run 43712329599, artifact 14161336344 |
| Reusable package | `detour-video-skin-0.1.0.tgz` installed into a fresh external host and returned to 42.350s in Chromium, Firefox and desktop WebKit; artifact **14161323994**, ZIP digest `sha256:1077a7f45a101090985f065e6e57b3d2899cc2dedd9d8e93ccbc94f7c3b4c304`; tarball **16,417 B**, SHA-256 `6c3680164f42bf582fe739b0e82af73826d35aea9a3f2ae8558c90cd6d6ad5cc`, exactly 15 package files |
| Verification dist artifact | Artifact **14161094736**, ZIP digest `sha256:76282311a905aed6d325d2adfa04b73844360b7b13042648ab071470381ab3bc` |
| Rights / secret audit | Run 43713525858 passed Apache-2.0, project-authored media provenance, permissive production dependency licenses, 69 emitted-text secret/API-hook scans and 15-file package boundary audit |
| Optional Mux bonus | **Qualified.** Use the verified public Playback ID only if the current form accepts the bonus field |
| Real-site bonus | **Qualified as a distinct site use.** `https://aafnaipatro.com/on-this-day/video/apollo-11/` is an Aafnai Patro On This Day editorial history page using a NASA Apollo 11 visualization through the accepted reusable skin. Its different editorial media is delivered through separate Playback ID `kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`; Cloudflare proved 12→2→12.000s Return. This URL is **not** the competition submission demo. |
| Physical-device / AT truth | Browser-width/touch emulation and desktop cross-engine evidence are green; physical-phone 062, NVDA/VoiceOver 064 and native 200% zoom 065 remain open |
| Submission eligibility | **Open** steps 002/091; no second-entry permission, contest submission or terms acceptance is claimed |
| Owner handoff | [Phase 10 verification/rehearsal packet](PHASE-10-HANDOFF.md) |

The Aafnai Patro live-site Worker also fetches reusable assets through the branded DETOUR custom domain, so disabling legacy public Worker hostnames does not break the independent live-site bonus.

## Public-host privacy boundary

The judge-facing submission and rollback use only branded `aafnaipatro.com` hostnames. `workers.dev` routing is disabled for both DETOUR Workers, and account-level `workers.dev` hostnames must not appear in judge-facing copy, screenshots, reports or form fields.

## URL role separation

| Role | URL | What it proves |
| --- | --- | --- |
| **Competition submission demo** | https://detour.aafnaipatro.com/mux/ | Judge-facing DETOUR showcase, required public player behavior and **Mux +1** |
| **Independent live-site use** | https://aafnaipatro.com/on-this-day/video/apollo-11/ | A real Aafnai Patro editorial page using the reusable skin on different historical media, supporting the **live-site +1** |

**Do not substitute these URLs for one another.** The Aafnai Patro page is not the submitted demo; the Mux demo is not presented as the live-site bonus.

## Frozen handoff sequence

- Treat the Phase 9 runtime source/dist above as the **current judging authority**. [PHASE-8-FREEZE.md](PHASE-8-FREEZE.md) remains the historical Phase 8 freeze record; its older source/poster values are not the current public candidate.
- Do not mutate the Mux Playback ID, public MP4, captions, Worker route or rollback merely to make a later test/report commit SHA appear in the browser. Any actual runtime/media change requires the relevant public release gates again.
- The judging path is the primary `/mux/` URL. Its page exposes the player and recovery controls and contains no links to internal experiment, test or integration routes.
- Preserve the Mux/release Workers, Aafnai Patro editorial Worker `aafnai-history-video-apollo11`, both distinct Mux assets (`Ml1c1QHJ…` submission and `kjscGKEn…` editorial), private R2 objects and immutable dist branches through judging. If Mux degrades, use the independently re-qualified `detour-release` rollback rather than an untested emergency build.
- The entrant must still confirm second-entry eligibility/current form, perform the fresh-human review, approve the exact payload and carry out submission/terms actions. Immediately after submission, step 100 re-opens the listing and repeats the public interaction.
