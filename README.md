# SUTRA — Living, verifiable knowledge

## Current integration contract (2026-11-28; PR #66, not released)

The primary workspace starts with an investigation objective or a labeled offline worked example. The browser owns its portable declarative graph execution; a publisher-owned, same-origin model route is an optional bounded capability, disabled in the reviewed public candidate until separately authorized. No visitor-controlled arbitrary endpoint or browser key enrollment is exposed by that public candidate. The trusted local research host supports one shared ordered pool of one to three operator-selected model IDs; one model is sufficient. Specialist role mappings are historical/advanced compatibility, not the default. Arbitrary user-operated model/API connectivity remains a longer-term requirement, subject to trusted adapters and egress admission, not a shipped unrestricted relay.

General web research is optional, on demand, and mediated by the separate loopback Node host. Missing search, model or permission is explicit, not simulated. The host's research supervisor is not browser-native graph orchestration; Node DNS/TLS/PDF/PostgreSQL facilities are not browser capabilities. Deterministic/manual investigation and replay do not require web or inference. Model claims are untrusted; exact citation integrity and deterministic replay do not prove empirical truth or independent corroboration.

Browser/peer tests use real Chromium and distinct loopback origins with injected model responses. This establishes candidate behavior, not live commercial inference, deployed HTTPS conformance or public availability of the V2 candidate. The existing public app is legacy and unchanged; no release, merge or deployment is authorized. See [the pre-release checklist](docs/sutra-v2/DEVPOST-PRE-RELEASE.md) for unresolved gates.

SUTRA is the single active product in this repository. `main` is the canonical implementation line.

The current system is the advanced continuation of all earlier SUTRA engineering. Runtime, consent, privacy, evidence, provider, browser, source-integrity and interoperability work developed earlier remains part of SUTRA wherever the current system depends on it.

SUTRA is a living computational knowledge system for discovering, challenging, maintaining, revising and acting on important knowledge through persistent, accountable and model-replaceable investigations.

## Active architecture

- `apps/sutra-v2/` — current investigation workspace. The path name is historical; this is the current SUTRA application.
- `packages/sutra-knowledge/` — knowledge kernel, semantic compilation, revision, counterfactuals and independent replay.
- `packages/sutra-runtime/`, `packages/sutra-consent/`, `packages/sutra-inference/`, `services/sutra-api/` — reusable execution, permission, provider and service infrastructure.
- `apps/sutra/` and `docs/sutra/` — inherited SUTRA implementation and engineering evidence still used where referenced; not a separate released product.

The ten parallel development workstreams have been reconciled into `main`. Their branches remain historical provenance only.

[Product mandate](docs/sutra-v2/LIVING-KNOWLEDGE.md) · [Execution contract](docs/sutra-v2/CONTINUE.md) · [Roadmap](docs/sutra-v2/ROADMAP.md) · [Checklist](docs/sutra-v2/CHECKLIST.md)

Passing tests establish only their stated scope. Model output is not verification authority, and deterministic replay is not empirical truth.
