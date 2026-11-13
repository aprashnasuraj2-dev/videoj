# DHAGO implementation contract

Read `docs/PLAN.md`, `docs/steps.json`, `docs/worklog.md`, and `docs/status.json` before continuing. The user authorized implementation of the entire 10-page plan in this repository. Routine design choices already follow the approved DHAGO direction; continue without repeated approvals.

- Use Video.js v10. Read installed `node_modules/@videojs/html/docs/llms.txt` and relevant references before changing components. Do not use the v8 `videojs()` API.
- Skin code belongs in `src/`; it must import nothing from `apps/preview/`.
- Keep player state truthful. Preserve error handling, keyboard access, announcements, component registrations and unique trigger IDs.
- Check all 100 steps in order. A blocked owner/account step does not block independent later work. DONE requires evidence; otherwise use IN_PROGRESS, BLOCKED or NOT_STARTED.
- `docs/steps.json` is the progress source. Run `node scripts/progress.mjs` after updates; it regenerates CHECKLIST.md and status.json. Update worklog at meaningful milestones and push evidence with implementation.
- Never put credentials in source, client bundles, logs or screenshots. Public playback IDs are allowed; management secrets are not.
- Use relevant functional tests, responsive screenshots and keyboard checks. Never label unexecuted tests passed; desktop WebKit is not a physical iPhone.
- Keep `main` reviewable and runnable. Use meaningful commits, avoid repeated no-change CI cycles and preserve unrelated work.
- Optional A-B replay is out of scope until essential controls pass. No fake quality menus, autoplay surprises, invented chapters or simulated telemetry.
- Do not submit the contest entry or accept terms without owner acceptance and explicit authorization. Prepare all files, form copy and deployment work first.

## Continue

Inspect current files and the first incomplete step. Complete independent work, record precise evidence and blockers, run appropriate checks and synchronize progress with the repository. No background work is implied after a turn ends.

## Owner priority and durable assets (2026-11-13)

Optimize competitive player craft; use the 100-step checklist as an evidence trail, revising steps that miss defects or encourage busywork. Follow docs/design-priorities.md. Defer Mux upload until design readiness. Persist non-Git/non-Mux development assets and final submission packages to the exact owner Google Drive folder in docs/storage.md. GitHub Actions artifact retention alone is insufficient. Read back saved metadata; record file IDs/URLs and source SHA. Never store credentials in Drive archives or the repo. Google Drive CI needs its own OAuth secrets; do not reuse Mux credentials or assume the connected app supplies runner credentials.

## Publication authorization update

The owner explicitly authorized Cloudflare publication and Mux upload on 2026-11-13, and supplied management credentials for the upload. Continue publishing and verifying the matching source. Do not preserve the older upload deferral as a blocker. Use `docs/hosting.md` for the dedicated static origin; preserve all unrelated Patro routes. Never copy the supplied management credentials into Git, client code, archives, screenshots or documentation. Contest submission and legal-term acceptance still require the separate final owner decision.
