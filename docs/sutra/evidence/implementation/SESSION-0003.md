# Session 0003 observed evidence

Timestamp: 2026-11-23T13:20:58+05:45. Parent source: `47191f97499d0c1b2ca4dbc5f32b0b39f7d698c2`. Candidate new-file hashes are recorded alongside this report; parent source does not pretend to contain new shell code.

Official rules/requirements refreshed through the current official pages. Both pinned spec files fetched via GitHub; exact diff in ../spec-diff.patch. RULES_SPEC_BASELINE.md maps mandatory behavior to task IDs and records pending implementations and optional extensions.

Local Node v24.22.3 results:

- npm install produced an independent pinned Vite 8.3.4 lockfile; Playwright 1.62.1 added for reproducible browser CI.
- A clean offline npm ci, production build and four Node build-boundary tests passed before adding the browser dev dependency. Final locked install/build/tests run again in CI.
- Production shell: HTML 0.41 kB, CSS 3.05 kB and JS 7.80 kB (reported gzip approximately 4.89 kB total), excluding browser protocol/cache overhead. These are bundle sizes, not measured latency or scale claims.
- Preservation sentinels in root dist and detour/dist remained intact after the shell build; sentinels then removed.
- Local Chromium launch failed because process-singleton socket creation is not permitted in this execution environment; a second launch configuration failed the same way. No browser, screenshot, keyboard, mobile or visual success is claimed locally.
- The committed browser test checks actual DOM interactions, truth-boundary wording, quote rejection, keyboard cue activation, 360px overflow and zero external requests. It has a dedicated CI run; do not assume success until that run is observed.
- No model calls, agent execution, peer networking, media playback, real data collection or deployment occurred.

The browser shell imports the actual evidence validator and synthetic receipts. It labels pending original media and makes no factual-verification claim. DHAGO/DETOUR source and deployment settings remain unchanged. P012-04 and P012-10 stay pending until the real shared-player dependency boundary is resolved; this is a usable shell, not completion of all player integration.
