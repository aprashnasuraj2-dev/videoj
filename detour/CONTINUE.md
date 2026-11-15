# Continue working on DETOUR

Copy the prompt below or use it as the standing continuation procedure.

> Continue DETOUR in `aprashnasuraj2-dev/videoj` on `detour`. Fetch the latest remote head before choosing a task. On that same revision read the root `AGENTS.md`, `detour/README.md`, the entire current `detour/CHECKLIST.md` and the latest entries and resume fields in `detour/PROGRESS.md`. Read the relevant `detour/submission-report/` file before any release work.
>
> Resume at the recorded phase and next unchecked actionable step. Inspect the actual files, recent commits and evidence before trusting a status. If the progress log and checklist disagree, reconcile them against the branch and log the correction. If an owner-only or account-dependent step is blocked, record the exact dependency and keep working on the next independent unchecked step. Preserve directional decisions and completed work where the evidence still holds.
>
> Work through the active milestone. Keep DETOUR code, fixtures, scripts and reports under `detour/`. Use real Video.js v10 player state and the familiar seek bar. Validate hold, multiple seeks, return and stay, then the normal controls, source lifecycle and input modes. Follow the step’s pass condition and attach actual evidence. Do not check a box for a scaffold, an unrun test, or a feature that only works in the showcase.
>
> Before pausing or handing off, update the affected checklist rows and append a dated progress entry with the new resume pointer, what changed, what was verified, any blocker and the precise next action. Update a submission report only when its evidence changed. Run `node detour/scripts/check-progress.mjs`, commit the related work and tracking together, and publish to `detour` with a normal fast-forward. If the head advanced, reconcile against that update before pushing. Keep going through the requested milestone, even when optional bonuses or account decisions are pending.

## Delivery rules

- Test the smallest relevant slice as each change lands. Batch broader cross-browser and exact-build checks at meaningful prototype, core, and release milestones. Use separate DETOUR checks and release targets. The root DHAGO scripts, deployments, archived artifacts and media belong to DHAGO.
- Record elapsed time, observed results and test environments when they affect the choice. Label browser emulation, desktop WebKit, physical devices and assistive-technology sessions separately. Record blocked attempts without turning them into failures or passes.
- Have the release report identify the deployed source SHA and media version, anonymous browser smoke, independent media mount and rollback. An optional service outage should leave the independently verified fallback available.
- The entrant reviews the exact packet and handles terms acceptance and contest submission under the repository’s authorization rules. A build, deployment or draft is evidence for that particular step only.
