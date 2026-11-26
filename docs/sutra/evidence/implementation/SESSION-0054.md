# SUTRA session 0054 — 2026-11-26

Observed at 2026-11-26T17:07:40+05:45. Branch `sutra/caller-peer-failure-boundary`.

## Scope

This session verifies seven original tasks whose relevant evidence is complete without requiring the still-running Chromium step on the same learner job.

Exact engineering source: `69d57d5bce0cce8c7dd0b40ba90e8548774b8f0b`.

Learner workflow:
- run `45809483294`
- job `139873282707`
- relevant completed steps used here:
  - npm install: success
  - learner build: success
  - app/unit tests: success
  - actions/inference/source-tools/consent/content-profile/API package tests: success
  - vendored runtime verification: success
  - runtime tests: success
  - independent peer build/tests: success
- Chromium browser step was still in progress at checkpoint time and is **not** used as evidence for these seven tasks.

## P001-05 — permission-sensitive asset inventory

Artifact: `docs/sutra/PERMISSION_ASSET_INVENTORY.md`.

The inventory lists pre-existing code, upstream/vendor code, final lesson/video, narration, written guide, employer documents/screenshots, employer/customer marks, customer data, incidental people, vehicle plates/screens, copyrighted music/stock assets, third-party web excerpts/data feeds, provider marks and final submission screenshots.

Each category states the permission/license basis needed before public inclusion and the default action when unresolved. The current outcome explicitly says that final content permissions are not yet established.

This verifies only the **list/inventory** requirement. It does not verify P001-04 ownership/permission basis or any final content rights.

## P018-05 — clearly marked conflicting-source fixture

`apps/sutra/src/comparison.js` contains `syntheticComparison`:
- video side: “Hypothetical video note”
- guide side: “Hypothetical written checklist”
- provenance explicitly says “Authored synthetic … fixture” / “not an external publisher”
- deliberately conflicting structured values 2 versus 3.

`apps/sutra/test/comparison.test.mjs` verifies that the explicit synthetic disagreement remains `unresolved_conflict`, preserves both values/excerpts and does not select a factual winner.

The app/unit test step passed on `69d57d5bce0cce8c7dd0b40ba90e8548774b8f0b`.

## P018-07 — bounded corpus and no arbitrary live web crawl

`packages/sutra-source-tools/index.js` operates on a supplied static source registry rather than a web crawler. The validated catalog is bounded to:
- maximum 20 sources;
- maximum 500 cues per source;
- maximum 4,000,000 aggregate source-text characters.

The package tests execute the exact maximum 20×500 registry, reject a 21st source, reject a 501st cue, reject aggregate-text overflow and reject URL/extra-argument tool schemas.

The source-tools/package test step passed on `69d57d5bce0cce8c7dd0b40ba90e8548774b8f0b`.

This does not establish the final real lesson corpus; P018-01/02/03/04/06/08/09/10 remain pending.

## P073-02 — success defined before live measurement

Artifact: `docs/sutra/MEASUREMENT_PROTOCOLS.md`.

Before any authorized Phase 073 live sample, it defines:
- one fresh session as the measurement unit;
- exact start/stop rules;
- ten per-run success conditions including completed inference, independently catalog-matched receipt, current source/config identity, completed evidence action and no unexpected origin;
- explicit failure classes;
- pre-registered benchmark target >=19/20 and p95 <=25 seconds;
- no replacement/deletion of failed runs;
- no authorization for provider spend or public deployment.

No live result is recorded.

## P075-01 — equivalent manual transcript-search baseline

The same pre-registered protocol defines a manual condition using:
- the same source/transcript version;
- the same evidence question;
- native transcript find/manual scrolling/video verification only;
- no SUTRA source tools/model/AI assistant/researcher hints.

Both conditions share a valid-completion rubric based on source/cue identity, exact/checkable excerpt, timed interval, no invented citation and no overclaim beyond source evidence.

The protocol contains no participant result and does not claim P075 phase completion.

## P081-05 — SUTRA build cannot empty unrelated player outputs

`apps/sutra/vite.config.js` roots the build at the SUTRA app and sets `outDir: 'dist'` under that root.

`apps/sutra/test/build.test.mjs` verifies:
- output remains inside the isolated SUTRA app;
- the package has no `apps/preview` or DETOUR dependency;
- built JS does not bundle preview/DETOUR code.

The exact learner build and app/unit test steps passed at `69d57d5bce0cce8c7dd0b40ba90e8548774b8f0b`.

No final public bundle/freeze is claimed.

## P081-08 — committed deployment configs are not secret stores

The new exact regression on `69d57d5bce0cce8c7dd0b40ba90e8548774b8f0b` reads:
- `services/sutra-api/wrangler.jsonc`;
- `services/sutra-api/wrangler.private.jsonc`;
- `deploy/sutra-pages/wrangler.jsonc`.

It requires:
- no committed `SUTRA_PROVIDER_KEY`;
- no committed `SUTRA_CLIENT_HASH_SECRET`;
- no committed `SUTRA_SELF_HOSTED_TOKEN`;
- no committed `SUTRA_SELF_HOSTED_UPSTREAM_URL`;
- inference remains `false` in both checked-in Worker configs;
- model allowlists remain empty;
- operator documentation names Cloudflare secret management and says the checked-in deployment remains disabled.

The app/unit test step passed at `69d57d5bce0cce8c7dd0b40ba90e8548774b8f0b`.

## P018-06 deliberately remains pending

The development attack/evaluation fixture is excluded from public bundle content, and that regression passed. However the normal learner UI still exposes an explicitly labeled optional “Demonstrate a synthetic conflict” control. Because P018-06 is broader than merely excluding the attack fixture, this session does **not** mark it verified.

## Progress effect

Before: **761/1,107 overall verified; 655/1,000 original; 339 pending; six omissions; one hardware blocker.**

After: **768/1,107 overall verified; 662/1,000 original; 332 pending; six omissions; one hardware blocker.**

Arithmetic: 768 + 332 + 6 + 1 = 1,107.

No participant eligibility/permission outcome, real lesson rights, human study result, live provider measurement, public deployment, merge, release or submission occurred.
