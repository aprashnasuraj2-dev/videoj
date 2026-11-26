# SUTRA session 0056 — 2026-11-26

Observed at 2026-11-26T17:13:21+05:45. Branch `sutra/caller-peer-failure-boundary`.

## SUTRA-P087-07 — lockfile and pinned-runtime reproduction prerequisite

This session verifies only that the **current source tree has sufficient pinned dependency/runtime inputs for the observed clean dependency/runtime setup path**. It does not claim final-release reproducibility.

Exact learner source: `69d57d5bce0cce8c7dd0b40ba90e8548774b8f0b`.

Learner workflow:
- run `45809483294`
- job `139873282707`
- result: success

Relevant executed steps:
- `npm ci`: success using committed `apps/sutra/package-lock.json`;
- learner build: success;
- `node ../../packages/sutra-runtime/verify-vendor.mjs`: success;
- runtime tests: success.

Current dependency controls:
- `apps/sutra/package-lock.json` is lockfileVersion 3 and pins the resolved learner dependency tree;
- direct learner dependencies are version-pinned in `apps/sutra/package.json` (`@videojs/html@10.4.0`, `@videojs/mux-video@10.4.0`, Vite 8.3.4, Playwright 1.62.1);
- Node compatibility is explicit (`>=22.12`);
- `packages/sutra-runtime/vendor/nsdeploy/UPSTREAM.json` pins the upstream runtime revision;
- `packages/sutra-runtime/verify-vendor.mjs` verifies both SHA-256 and upstream Git blob identity for every vendored module;
- observed vendor verification: **10 unchanged upstream modules at `486ecf26aa8775963f9b765f894734bef1ac9817`**.

The same exact learner job later completed app/unit, package/API, runtime, peer and Chromium suites successfully.

## Boundary

This verifies `SUTRA-P087-07` only.

Still pending:
- P087-01 final-candidate clean checkout;
- P087-02 final-candidate documented install/build run;
- P087-03 player checks at the final candidate if applicable;
- P087-05 distributed archive/bundle/trace secret scan;
- P087-06 final reproduction environment/commands/exit-code log;
- P087-09 final reproduction artifact;
- P087-10 phase exit.

A successful development-branch `npm ci` plus pinned runtime is a reproducibility prerequisite, not proof that the future release itself has been reproduced from a clean tagged checkout.

## Progress effect

Before: **770/1,107 overall verified; 664/1,000 original; 330 pending; six omissions; one hardware blocker.**

After: **771/1,107 overall verified; 665/1,000 original; 329 pending; six omissions; one hardware blocker.**

Arithmetic: 771 + 329 + 6 + 1 = 1,107.

No deployment, release, merge, npm publication, paid inference or submission occurred.
