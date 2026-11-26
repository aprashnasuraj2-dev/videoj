# Contributing to SUTRA

SUTRA is an evidence-linked learning project under active development. The learner, reusable source packages and Open Kit are **pre-release source distributions**. They are not a public hosted service, npm release, challenge certification or promise of long-term support.

This guide is the shortest path for a contributor who wants to reproduce an issue, improve a reusable component or propose a focused change without reading the entire learner application.

## 1. Choose the smallest boundary

| Goal | Start here | Runtime dependency | Primary check |
| --- | --- | --- | --- |
| Validate source-linked receipts | `packages/sutra-evidence/` | Node >=22 | `node --test packages/sutra-evidence/test/*.test.mjs` |
| Inspect external-contact consent | `packages/sutra-consent/` | Node >=22; browser example optional | `node --test packages/sutra-consent/test/*.test.mjs` |
| Work on bounded source lookup | `packages/sutra-source-tools/` | Node >=22 | `node --test packages/sutra-source-tools/test/*.test.mjs` |
| Work on browser graph orchestration | `packages/sutra-runtime/` | Node >=22; pinned vendored runtime | `node packages/sutra-runtime/verify-vendor.mjs && node --test packages/sutra-runtime/test/*.test.mjs` |
| Inspect the reusable private Open Kit candidate | `tools/sutra-open-kit/` | Node >=22 | `node --test tools/sutra-open-kit/test.mjs` |
| Change learner UI/integration | `apps/sutra/` | Node >=22.12; Playwright for browser checks | `npm --prefix apps/sutra ci && npm --prefix apps/sutra run build && npm --prefix apps/sutra test` |
| Change the independent peer publication | `apps/sutra-peer/` | Node >=22 | `npm --prefix apps/sutra-peer run build && npm --prefix apps/sutra-peer test` |
| Change inference/quota boundary | `services/sutra-api/` | Node >=22 | run the service/package tests used by the learner workflow; do not require real provider credentials |
| Work on project evidence/checklists | `docs/sutra/` | Node >=22 | `node docs/sutra/tools/progress.mjs check` |

Do not use `apps/preview/` or `detour/` as SUTRA dependencies. The learner reuses the DHAGO player only through its explicit adapter. The vendored nsDeploy subset in `packages/sutra-runtime/vendor/nsdeploy/` is pinned upstream code; do not edit it as if it were SUTRA-authored runtime code.

## 2. Clean first invocation

From a clean repository checkout, use Node 22.12 or newer for the learner:

```bash
npm --prefix apps/sutra ci
npm --prefix apps/sutra run build
npm --prefix apps/sutra test
node docs/sutra/tools/progress.mjs check
```

For a smaller reusable-tool contribution, no learner install is required. For example:

```bash
node packages/sutra-evidence/cli.mjs \
  packages/sutra-evidence/examples/receipt.json \
  packages/sutra-evidence/examples/sources.json

node --test packages/sutra-evidence/test/*.test.mjs
node --test packages/sutra-consent/test/*.test.mjs
node --test packages/sutra-source-tools/test/*.test.mjs
node packages/sutra-runtime/verify-vendor.mjs
node --test packages/sutra-runtime/test/*.test.mjs
```

The examples are synthetic. Passing them establishes implementation behavior only; it does not establish source truth, human acceptance, provider availability or public interoperability.

Browser changes require Playwright browser binaries before `npm --prefix apps/sutra run test:browser`. Record the actual browser/device used. Emulation is not physical-device evidence.

## 3. Compatibility boundaries

Current development compatibility:

- Node: learner declares `>=22.12`; reusable packages generally declare `>=22`.
- Learner build/test tooling: Vite 8.3.4 and Playwright 1.62.1.
- Learner media dependencies: `@videojs/html@10.4.0` and `@videojs/mux-video@10.4.0`.
- Browser runtime: restricted declarative graph profile with bounded local execution; no arbitrary executable peer code.
- External peer/MCP contact: default-deny and separately consented; redirects remain fail-closed in the current profile.
- Direct BYOK: not supported.
- Funded inference: optional server boundary, disabled in checked-in candidates until separately approved/configured.
- Public HTTPS, live provider economics and independent third-party interoperability are not implied by local or CI success.

If a change needs a broader compatibility promise, add an explicit test and update the relevant scope/decision record rather than silently widening the claim.

## 4. Focused contribution scope

Good contribution examples:

- a receipt validator edge case with a failing fixture and bounded fix;
- a consent lifecycle/cancellation regression;
- an accessibility or keyboard issue with an observed reproduction;
- a graph-validation or peer/source boundary bug with zero-contact counterexample;
- a deterministic Open Kit packaging/reproduction improvement;
- a documentation correction that points to the exact implementation/test evidence.

Avoid unrelated feature expansion, hidden provider fallback, arbitrary remote code execution, credential-bearing client configuration, fabricated user/provider results or changes that weaken a fail-closed boundary merely to make a demo pass.

A component-level test does not prove system-level quality. When changing shared behavior, include the integrated learner/runtime check that exercises the actual boundary.

## 5. Issue reports

A useful issue should contain:

1. the affected SUTRA boundary/path;
2. immutable commit SHA;
3. environment: Node/browser/OS and physical-vs-emulated device where relevant;
4. minimal reproduction steps and expected versus observed behavior;
5. the narrowest failing command/test;
6. whether any network/provider/media request had already started;
7. sanitized logs only — no credentials, personal data, private prompts, customer data or copyrighted private media.

For security-sensitive behavior, do **not** publish exploit details or secrets in a normal issue. Follow the repository-level `SECURITY.md`: use GitHub private vulnerability reporting when available, otherwise contact the maintainer privately.

## 6. Pull-request expectations

Keep a contribution small enough that the failure mechanism is reviewable. Include:

- why the behavior is wrong or missing;
- the counterexample that failed before the change;
- the exact checks run afterward;
- user-visible or compatibility impact;
- any remaining untested condition;
- no claim of a live provider, hardware, user study or deployment unless that exact evidence exists.

Do not commit `.env` files, provider keys, Cloudflare tokens, private participant records, raw user-study identifiers or management credentials. Generated evidence must be sanitized and bounded.

## 7. Versioning and changelog

SUTRA has no public release in the current repository state. `docs/sutra/CHANGELOG.md` therefore keeps development work under **Unreleased** and must not invent version tags, publication dates, npm releases or hosted availability.

When a real public version exists, move only the changes included in that exact immutable release SHA into a dated version section and link the release/source identity. A branch commit, private candidate or CI artifact is not a public version.

## Repository release versus npm publication

A **repository/GitHub release** and an **npm publication** are separate distribution events. The planned Open Kit can be released as versioned source/archive assets in this repository without publishing any npm package. npm publication is optional and must be recorded only if an actual package/version is published to the registry.

Do not write an npm package name, `npm install <published-package>` command, registry version or npm URL into release/submission copy unless that publication actually exists. Conversely, absence of npm publication does not turn a valid versioned repository source release into a failure of the source-distribution plan.

## 8. Support and maintenance boundary

There is no guaranteed response time, hosted-service SLA or indefinite compatibility commitment. Contributions may improve the source project, but availability of an optional provider, peer publisher, browser codec, Cloudflare account or competition service is outside a source-level support promise.

For the current implementation/evidence state, read `docs/sutra/PROGRESS.md`. For reusable blocks and their limitations, read `docs/sutra/OPEN_KIT.md`.

## New-reader acceptance still pending

This guide deliberately does **not** claim that a new contributor has successfully found the right entry point. `SUTRA-P088-08` and the phase-088 exit remain pending until an actual new reader is observed using this path without needing the entire product codebase explained first.
