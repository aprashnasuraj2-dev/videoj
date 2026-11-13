# Implementation plan

Transcribed from the approved 10-page plan, dated 2026-11-13. The 100 steps in steps.json are authoritative; CHECKLIST.md is generated from them.

## 01 / STRATEGY & CONSTRAINTS

Build for the score. Protect eligibility.

Executive recommendation: create one exceptional, reusable Video.js v10 skin called DHAGO - Time, woven. Let AI author nearly all code, tests, visual assets and submission copy; reserve human time for taste, accounts, physical-device checks and entry consent. This is a plan to improve competitiveness, not a promise of winning.

The rules award 10 points for design and 5 each for usability, accessibility and polish; two optional bonuses make 27 possible. The deadline is Nov 16, 11:59 pm PST [S1]. The page does not explicitly print the year; this plan assumes the current 2026 challenge. That converts to Nov 17, 1:44 pm Nepal time. Aim to submit by Nov 16, 8:00 pm Nepal time, leaving 17h 44m of buffer.

AI directive: Turn these 100 steps into docs/worklog.md. Mark each NOT STARTED, IN PROGRESS, BLOCKED or DONE. DONE requires an artifact path or observed result. Keep account blockers separate from work you can continue.

## 02 / ORIGINALITY & ART DIRECTION

DHAGO: time as a woven ribbon.

Design hypothesis: a tactile woven chapter ribbon can make time navigation memorable without making playback unfamiliar. Dhago is the Nepali word for thread; treat it as a working name, with owner language and name-collision review. Use an original abstract weave, not sacred or copied traditional motifs.



AI design prompt: Build DHAGO as an original woven-time skin. Keep every essential control recognizable. The chapter ribbon is the signature, not a replacement for the seek slider. Compare three real layouts, then refine one at desktop and 320px player width.

## 03 / REPOSITORY & AI SETUP

Give AI a durable engineering workspace.

Recommended route: HTML + CSS, the official video preset and Scaffold, in an isolated Git repository. This minimizes framework overhead while keeping the skin portable. Use a coding-capable AI workspace with terminal, file editing, browser testing and deployment access. A text-only chat can draft files, but cannot prove they run.

Run npx @videojs/cli agents skills and follow the instructions for the actual agent; this prints setup guidance rather than silently installing everything. For version guidance, run npx @videojs/cli agents init --framework html. Scaffold with npx @videojs/cli skin create; choose HTML, CSS, Scaffold and video. Verify current CLI help and the generated package.json before relying on scripts.

AI implementation prompt: Read AGENTS.md and docs/worklog.md, inspect the current branch, then complete the next numbered step. Use installed version-matched Video.js docs. Keep working through independent tasks, record evidence, and stop only for a real blocker or exhausted session.

## 04 / STATE & ESSENTIAL CONTROLS

Make every visible control tell the truth.

Keep Video.js as the source of playback state; the skin presents that state. Styling cannot be allowed to create a parallel fake timer, mute indicator or fullscreen mode. Reuse the provided components and accessibility behavior, then test them in the final composition. Native media controls are a failure fallback, not the submitted custom skin.



AI control-audit prompt: For each visible control, activate it, inspect the corresponding media state and record the result. Find fake, disconnected or unsupported UI. Fix those first, using Video.js components and actual availability signals rather than adding duplicate state.

## 05 / SIGNATURE SKIN IMPLEMENTATION

Turn the concept into a reusable skin.

The design must win attention inside the player rectangle. A woven ribbon, strong button geometry and exceptionally resolved states are a more defensible differentiator than a huge promotional page. Build texture with CSS or small original SVG assets; raster image generation is unnecessary for precise interactive controls.

Essential: one shelf layout, one alternate high-contrast treatment, chapter ribbon with graceful no-chapter behavior, captions and complete states. Optional: A-B replay, only after core checks pass. Support public theme properties such as --media-accent-color, --media-border-radius and --media-font-family where compatible [S3]; ensure changed colors are tested.

AI refinement prompt: Judge only the player crop. Identify the three largest differences between this implementation and the approved visual direction. Fix those, retain recognizable controls, then recapture desktop and narrow-player screenshots. Do not add unrelated features.

## 06 / RESPONSIVENESS & ACCESSIBILITY

Make the unusual design easy to use.

Accessibility is both a scored category and a way to prevent novelty from becoming friction. Use stronger internal targets than the minimum challenge wording: comfortable 44-48px essential targets, clear focus and stable surfaces. Passing an automated scan does not establish complete accessibility or a usable phone experience.



AI accessibility prompt: Audit working controls, responsive layout, keyboard routes, focus, contrast over bright/dark footage, touch targets and reduced motion. Give reproducible failures and fix them. Run automated checks, then document manual checks and remaining platform limitations.

## 07 / VIDEO, MUX & REAL-SITE BONUS

Earn bonuses with verifiable playback.

Pursue both bonus points only after the core skin works. A Mux playback ID must belong to the asset actually playing in the submitted player, and the asset must remain live through judging [S1]. An attractive placeholder ID or a separate Mux embed does not establish the bonus.

A real portfolio case-study page under your control can use DHAGO to explain the design. Aafnaipatro could also host a relevant documentary or project video, but only through a scoped integration after inspecting its existing routing and quota constraints. Prefer the portfolio path if the production integration threatens the deadline or unrelated shipped features.

AI media prompt: Prepare poster, captions, chapter data and attribution from authorized source media. Integrate the supplied public Mux playback ID into our real Video.js v10 player. Prove actual playback and list any account action I must complete with exact instructions.

## 08 / QUALITY & FAILURE TESTING

Prove the experience, not just the build.

A reliable entry needs targeted behavior tests, visual review and a small real-device check. Keep verification proportional: one meaningful functional suite, one accessibility sweep, one responsive visual pass and a production smoke test. Re-run checks affected by fixes, rather than cycling an unchanged release indefinitely.



AI QA prompt: Run the matrix against the actual player, retain failing evidence, fix root causes and re-run relevant checks. Report remaining NOT TESTED cases explicitly. Do not expand scope after core checks pass unless a concrete failure or risk justifies it.

## 09 / DEPLOYMENT & SUBMISSION FILES

Package a release AI can hand over.

AI can generate the entire submission-ready file set inside a capable coding workspace, then deploy through an authenticated host connection. Files alone do not create a live URL. A GitHub repository supports reproducibility; the contest judges still need the public player page and an honest visual demonstration.



AI packaging prompt: Produce a submission-ready release, not a mockup. Populate all URLs and IDs from observed deployments, remove secrets and placeholders, verify a clean install, capture visuals from the live build, then present the exact form-ready copy and files together.

## 10 / FINAL ENTRY & CONTINUATION

Finish with a receipt, not an assumption.

Recommended sequence in Nepal time: Nov 13, steps 1-30; Nov 14, steps 31-60; Nov 15, steps 61-90; Nov 16, steps 91-100, targeting 8:00 pm submission. Adjust to the actual start time. If behind, remove A-B replay and secondary polish first; keep the working public player and minimum requirements intact.

DHAGO treats video time as a woven ribbon: chapter segments form a tactile thread, while familiar playback controls sit on a calm, solid shelf. The skin brings a textile-inspired visual identity to documentary and craft films without making viewers learn a new control language. Built with Video.js v10, it includes responsive controls, visible keyboard focus and reduced-motion behavior. Remove or revise any sentence not proven in the final release.

Resume prompt: Read AGENTS.md, this plan and docs/worklog.md. Inspect the current repository and last tested release. Continue from the first incomplete step, completing each with evidence. Prepare all authorized work autonomously; make any required owner handoff concrete and brief.

## Primary references

- [Challenge rules and scoring](https://contra.com/community/topic/videojsskinschallenge/guidelines)
- [Official AI setup and version matching](https://videojs.org/docs/framework/html/guides/build-with-ai)
- [Official skin project and deployment guide](https://videojs.org/docs/framework/html/guides/build-your-own-skin)
- [Video.js design rationale](https://videojs.org/blog/videojs-v10-skin-design)
- [Mux playback and asset lifecycle](https://www.mux.com/docs/core/stream-video-files)
- [Mux current plans and limits](https://www.mux.com/pricing)
- [Public challenge feed: a limited competitor sample](https://contra.com/community/topic/videojsskinschallenge)
## Priority revision — 2026-11-13

The owner prioritizes competitive design quality over completing a fixed task count. Use `docs/design-priorities.md` to sequence work. The 100 rows remain an audit trail and may be refined when they reward busywork or miss a real defect. No completion percentage predicts an award. Defer Mux upload until core design and usability are ready; keep provisioning manual-only. Submission and receipt rows remain pending until real owner-authorized entry.
