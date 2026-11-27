# SUTRA — Living, verifiable knowledge

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
