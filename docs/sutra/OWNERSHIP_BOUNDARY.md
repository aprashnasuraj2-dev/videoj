# SUTRA pre-existing component and contribution boundary

Observed 2026-11-26. This document supports `SUTRA-P001-03`: identify pre-existing components and the competition-period contribution boundary.

This is a **technical provenance inventory, not a legal ownership determination**. It does not establish entrant eligibility, employer permission, media/content rights, trademark permission, or the right to submit any component. Those remain separate P001/P015 gates.

## Immutable repository baseline

The SUTRA tracker bootstrap inspected repository `aprashnasuraj2-dev/videoj` at immutable SHA:

`042bea1d1723b448854538c21e8f693608897c5a`

The bootstrap record states that this revision already contained:

| Component | Status at bootstrap | SUTRA treatment |
| --- | --- | --- |
| Root DHAGO reusable player source under `src/` | Pre-existing repository code | Reused only through the explicit player adapter boundary. No claim that SUTRA authored the player. |
| `apps/preview/` demo | Pre-existing repository code | Not imported into the SUTRA learner. |
| `detour/` | Pre-existing independent package | Excluded from SUTRA. |
| Root Video.js HTML runtime dependency family | Pre-existing dependency context | SUTRA pins `@videojs/html` and `@videojs/mux-video` 10.4.0; dependency authorship is not claimed. |
| Root repository license/instructions/build context | Pre-existing repository context | Retained as repository-level context; SUTRA-specific instructions are additions, not a new ownership claim over the root project. |

At that bootstrap SHA there was **no SUTRA learner app, SUTRA peer app, SUTRA community package, SUTRA service/deployment package, or SUTRA progress register** in the inspected tree.

## Pre-existing upstream code integrated during SUTRA work

SUTRA also integrates code that was not authored as a new competition-period framework:

### nsDeploy reference runtime core

`packages/sutra-runtime/vendor/nsdeploy/` contains an unchanged, pinned subset of the nsDeploy reference AgentNetwork/kernel/agent-loop implementation.

- Upstream commit pin: `486ecf26aa8775963f9b765f894734bef1ac9817`
- Integrity mechanism: `packages/sutra-runtime/verify-vendor.mjs`
- Verification: exact upstream Git blob plus SHA-256 inventory for the vendored modules
- License recorded by the runtime package: Apache-2.0
- SUTRA contribution boundary: host restrictions, validation, budgets, consent, loaders, adapters, source/MCP/peer boundaries, tests and learner integration around the unchanged core; **not authorship of the vendored upstream modules**.

### External package dependencies

The SUTRA learner currently declares:
- `@videojs/html@10.4.0`
- `@videojs/mux-video@10.4.0`
- `vite@8.3.4` as development/build tooling
- `playwright@1.62.1` as browser-test tooling

These are external dependencies. Version pinning, integration and tests are SUTRA-period work; dependency authorship is not.

## SUTRA-period repository contribution surface

The SUTRA work is isolated under SUTRA-named paths plus small root instruction/readme additions. PR #49's changed-file inventory and the baseline comparison identify the following contribution groups:

### Product/runtime
- `apps/sutra/` — learner UI, browser integration, synthetic/reviewed content contract fixtures and browser tests
- `apps/sutra-peer/` — independent peer publication candidate
- `packages/sutra-actions/`
- `packages/sutra-consent/`
- `packages/sutra-content-profile/`
- `packages/sutra-evidence/`
- `packages/sutra-inference/`
- `packages/sutra-runtime/` — SUTRA host/runtime integration **excluding unchanged vendored upstream authorship**
- `packages/sutra-source-tools/`
- `services/sutra-api/`
- `deploy/sutra-pages/`

### Reusable/verification tooling
- `tools/sutra-builder-trial/`
- `tools/sutra-content-intake/`
- `tools/sutra-content-pack/`
- `tools/sutra-device-check/`
- `tools/sutra-evaluation/`
- `tools/sutra-local-gateway/`
- `tools/sutra-local-measurement/`
- `tools/sutra-neutral-consumer/`
- `tools/sutra-open-kit/`
- `tools/sutra-provider-measurement/`
- `tools/sutra-release-candidate/`
- `tools/sutra-screenreader-check/`
- `tools/sutra-starter/`
- `tools/sutra-user-study/`

### CI/evidence/project-control
- SUTRA-specific workflows under `.github/workflows/sutra-*.yml`
- `docs/sutra/` tracker, decisions, evidence, risk register and continuation state
- SUTRA-specific additions to root `AGENTS.md` / `README.md` where present relative to the immutable bootstrap baseline

## Reuse boundaries enforced in code/tests

The current learner adapter imports the reusable DHAGO player from `src/create-player.ts` and explicitly states that it does not import `apps/preview` or DETOUR. Build tests reject preview/DETOUR imports in the SUTRA app.

The restricted runtime verifier fails if the pinned nsDeploy upstream module bytes drift. This keeps “unchanged upstream” distinguishable from SUTRA-authored host code.

Synthetic timing media, synthetic guide conflicts and scripted/synthetic model transports are **competition-period test fixtures**, not substitutes for the participant-owned rights-cleared lesson, factual review or a real funded provider.

## Contribution boundary rule for final submission

For any eventual submission or demo narrative:

1. describe SUTRA-period work as the learner, host restrictions, evidence contract, consent/peer/source integration, service boundaries, tooling, tests and documentation created on top of the recorded baseline;
2. identify DHAGO player reuse as pre-existing repository reuse rather than new SUTRA authorship;
3. identify the pinned nsDeploy subset and external npm dependencies as third-party/pre-existing upstream components;
4. do not describe DETOUR or the preview app as SUTRA components;
5. do not claim rights to final training media, employer material, marks or narration until their separate permission gates are satisfied;
6. preserve the immutable bootstrap SHA and upstream pins in the final attribution/provenance package.

## Remaining ownership/eligibility gaps

This artifact closes only the technical identification requested by `P001-03`. It does **not** close:
- entrant residence/age/team/narrator (`P001-01/02`);
- ownership/permission review for DHAGO imports or original/new training material (`P001-04`);
- employer/third-party asset permission list (`P001-05`);
- competition exclusions/official-rule interpretation (`P001-06`);
- phase 001 artifact/exit gate (`P001-09/10`);
- content rights and factual review in phase 015.

No private identity document or participant-specific legal fact is stored here.
