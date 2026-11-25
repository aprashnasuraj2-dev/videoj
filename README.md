# SUTRA — Living, verifiable knowledge

SUTRA is a living computational knowledge system for discovering, challenging, maintaining, revising and acting on important knowledge. Persistent, accountable, model-replaceable investigations—not general chatbot intelligence—are the product.

SUTRA combines evidence-bound interpretation, deterministic verification, provenance, alternative explanations, counterexamples, investigation planning and revision. It aims to preserve an investigation across model changes and allow people to reproduce historical conclusions. These are product objectives, not claims of universal semantic correctness or proven superiority.

[Product mandate](docs/sutra-v2/LIVING-KNOWLEDGE.md) · [Continuation](docs/sutra-v2/CONTINUE.md) · [Roadmap](docs/sutra-v2/ROADMAP.md) · [Checklist](docs/sutra-v2/CHECKLIST.md) · [Progress](docs/sutra-v2/progress.json) · [Sessions](docs/sutra-v2/SESSIONS.md)

## Development workspace

- `apps/sutra-v2/`: current browser investigation laboratory.
- `packages/sutra-knowledge/`: exact kernel, evidence frontier, compiler and independent reference implementation.
- `packages/sutra-runtime/`, `packages/sutra-consent/`, `services/sutra-api/`: trust, provider and execution infrastructure.
- `apps/sutra/` and `docs/sutra/`: SUTRA1 reusable learner/runtime and preserved engineering evidence.

Run the bounded knowledge suite with Node 24: `node --test packages/sutra-knowledge/test/*.test.mjs`. Consult the relevant workflow for full browser, Go, Python and formal verification steps. Passing tests do not authorize release.

**Continue with SUTRA** resumes the exact remote active draft PR and dependency-ready work under the binding mandate. All unfinished foundation gates remain tracked. This branch is development-only; no public deployment or release is authorized.

[Active repository map](docs/sutra-v2/REPOSITORY_MAP.md). This development tree removes standalone retired products; the inherited learner media implementation is internal and retains original attribution. Exact post-isolation CI is required before accepting the change.
