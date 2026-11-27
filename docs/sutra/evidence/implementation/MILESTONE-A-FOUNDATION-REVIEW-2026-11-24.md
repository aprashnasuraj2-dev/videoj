# Milestone A foundation review — technical foundation ready, real corpus blocked

Reviewed product revision: `0ef8a613c1c8d6db522d50a1088f9528ad055d4b` (all ten current project workflows green).

## Package and repository boundary

- SUTRA is isolated under `apps/sutra/` with its own package metadata and Vite root.
- Build output is `apps/sutra/dist`, separate from root DHAGO and `detour/dist`.
- Reused player dependencies are pinned at `@videojs/html` / `@videojs/mux-video` 10.4.0 and deduped inside the SUTRA app boundary.
- DETOUR is not imported into the learner.
- Server/provider code remains in `services/sutra-api/`; no provider secret belongs in the client bundle.
- Current build generates its public artifact inventory after Vite output.

The exact product revision completed `npm run build`, unit/runtime/package tests and browser suites in the learner workflow. This is build evidence, not deployment evidence.

## Runtime uncertainty

The original highest-risk question—whether the pinned browser agent runtime could execute a bounded local graph with internal delegation while the host owns adapters, limits and security policy—is resolved at engineering level. The pinned nsDeploy subset is vendor-hash checked and current tests cover exact graph loading, internal delegation, source MCP, caller-local peer execution, consent boundaries, budgets, cancellation and sanitized traces.

Remaining runtime uncertainties are **external/live**: funded provider behavior, public HTTPS interoperability and real corpus usefulness. They do not invalidate the local runtime selection.

## Output collision

SUTRA uses its own `apps/sutra/dist`. Existing root and DETOUR outputs are not the target directory. Build tests and repository mapping were created specifically to prevent a new app from overwriting the existing player/demo outputs.

## Hero narrative review

The current product still serves one coherent task:
**find an exact lesson source → compare video/written evidence without hiding conflict → explicitly keep the reviewed reference.**

Zero-model literal lookup is the simplest path. Optional inference and peer interoperability are supporting mechanisms, not separate products. Developer labs are after the learner journey.

## Missing participant/content inputs

Still not available/verified:
1. rights-cleared original 3–5 minute lesson;
2. authorized written guide/checklist;
3. competent factual reviewer;
4. safe public provenance for those assets;
5. human review of final technical sequence.

Synthetic media/transcript/guide fixtures remain development-only and are clearly labeled. They cannot satisfy the licensed evidence-corpus requirement.

## Foundation gate decision

**Technical foundation: pass. Content/provenance foundation: blocked. Milestone A overall: open.**

Do not rebuild the app/runtime foundation while waiting for content. Continue independent engineering and keep the missing corpus/reviewer as a narrow blocker. Do not turn synthetic fixtures into “real content” to close the phase.

P020-02 and P020-10 remain open. The proposed public domains also remain undeployed; domain planning is not treated as production evidence.
