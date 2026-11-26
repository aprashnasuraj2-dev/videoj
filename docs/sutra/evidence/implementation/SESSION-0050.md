# SUTRA session 0050 — 2026-11-26

Observed at 2026-11-26T16:42:29+05:45. Branch `sutra/caller-peer-failure-boundary`.

## Objective

Create a genuinely usable **pre-release** contributor path without freezing, deploying or pretending the current candidate is a public release.

## Implemented

- Added `docs/sutra/CONTRIBUTING.md` with:
  - clean install / first invocation paths;
  - component boundaries and exact current compatibility versions;
  - focused issue-reporting guidance;
  - private security-reporting guidance linked to root `SECURITY.md`;
  - contribution scope and counterexamples;
  - pull-request evidence expectations;
  - explicit no-SLA / no-indefinite-support boundary;
  - an explicit note that new-reader acceptance is still pending.
- Added `docs/sutra/CHANGELOG.md` with **Unreleased** only and a rule forbidding branch/CI/private/staging candidates from being recorded as public versions.
- Indexed both documents from `docs/sutra/README.md`.
- Added an executable documentation contract to `tools/sutra-open-kit/test.mjs`.
- Updated the Open Kit workflow path filter so future changes to these contributor documents trigger the candidate validation.

## Exact verification

Tested source: `08c7ca36e93dd748f004bc9cc511914aeebfebd6`.

Open Kit workflow:
- run `45806012457`
- job `139861341692`
- result: success

Observed test:
- `SUTRA contributor path names runnable entry points without inventing a public release or support SLA`: **pass**
- Open Kit test total: 3 pass, 0 fail
- clean source-distribution checks: pass
- vendored runtime integrity: 10 unchanged modules at `486ecf26aa8775963f9b765f894734bef1ac9817`
- publisher-starter clean checks: pass

The documentation contract asserts current package/tool entry points, learner install/build commands, runtime vendor verification, Node compatibility markers, Vite/Playwright/Video.js dependency versions, security-reporting wording, direct-BYOK exclusion, no guaranteed response time, explicit pending P088-08, and no invented changelog version.

## Checklist effect

Verified:
- `SUTRA-P088-01` clean-install / first-invocation contributor path
- `SUTRA-P088-02` package boundaries and supported compatibility versions
- `SUTRA-P088-03` minimal reproducible issue-reporting guidance
- `SUTRA-P088-04` safe security-reporting guidance
- `SUTRA-P088-05` newcomer-suitable contribution scope/examples
- `SUTRA-P088-06` changelog entries tied to actual public versions
- `SUTRA-P088-07` no indefinite hosted-support / response-time promise
- `SUTRA-P088-09` produced and reviewed contributor/maintenance artifact

Still pending:
- `SUTRA-P088-08`: requires an actual new reader observation.
- `SUTRA-P088-10`: phase exit cannot close without P088-08.

## Progress

Before: **729/1,107 overall verified; 623/1,000 original; 371 pending; six omissions; one hardware blocker.**

After: **737/1,107 overall verified; 631/1,000 original; 363 pending; six omissions; one hardware blocker.**

Arithmetic: 737 + 363 + 6 + 1 = 1,107.

No public release, deployment, paid inference, outside-reader trial, merge or submission occurred.
